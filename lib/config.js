const fs = require('fs');
const path = require('path');

function dataDir() {
  if (process.env.SKILL_WATCH_HOME) {
    return process.env.SKILL_WATCH_HOME;
  }
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.claude', 'skill-watch');
}

const DEFAULTS = {
  minRepeats: 3,
  longSequenceSteps: 8,
  nudgeCooldownMs: 30 * 60 * 1000,
  maxNudgesPerSession: 2,
  llmEndpoint: null,
  llmEnabled: false,
};

function loadConfig() {
  const file = path.join(dataDir(), 'config.json');
  let extra = {};
  if (fs.existsSync(file)) {
    try {
      extra = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      extra = {};
    }
  }
  const minRepeats = parseInt(process.env.SKILL_WATCH_MIN_PATTERN || extra.minRepeats || DEFAULTS.minRepeats, 10);
  const llmEndpoint = process.env.SKILL_WATCH_LLM_ENDPOINT || extra.llmEndpoint || null;
  const llmEnabled = process.env.SKILL_WATCH_LLM === '1' || extra.llmEnabled === true || Boolean(process.env.SKILL_WATCH_LLM_ENDPOINT);
  return {
    ...DEFAULTS,
    ...extra,
    minRepeats: Number.isFinite(minRepeats) && minRepeats > 0 ? minRepeats : DEFAULTS.minRepeats,
    longSequenceSteps: extra.longSequenceSteps || DEFAULTS.longSequenceSteps,
    nudgeCooldownMs: extra.nudgeCooldownMs || DEFAULTS.nudgeCooldownMs,
    maxNudgesPerSession: extra.maxNudgesPerSession || DEFAULTS.maxNudgesPerSession,
    llmEndpoint,
    llmEnabled: Boolean(llmEnabled && llmEndpoint),
  };
}

module.exports = { dataDir, loadConfig, DEFAULTS };
