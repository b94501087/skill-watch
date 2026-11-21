const { loadConfig } = require('./config');
const { loadHistory, loadNudgeState, saveNudgeState } = require('./store');
const { redact } = require('./redactor');

function toolSequenceKey(tools) {
  return (tools || []).map((t) => t.name).join('→');
}

function workflowFingerprint(session) {
  const tools = session.tools || [];
  const lastPromptIndex = (session.prompts || []).length
    ? (session.prompts[session.prompts.length - 1].toolIndex || 0)
    : 0;
  const current = tools.slice(lastPromptIndex);
  const seq = toolSequenceKey(current.length ? current : tools);
  const promptText = redact((session.prompts || []).slice(-1)[0]?.text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = promptText.split(' ').filter(Boolean).slice(0, 8).join(' ');
  return { sequence: seq, promptTokens: tokens, toolCount: (current.length ? current : tools).length };
}

function similarPrompt(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const as = new Set(a.split(' '));
  const bs = new Set(b.split(' '));
  if (!as.size || !bs.size) return false;
  let inter = 0;
  for (const x of as) if (bs.has(x)) inter++;
  return inter / Math.min(as.size, bs.size) >= 0.6;
}

function countMatches(history, fingerprint) {
  let exact = 0;
  let promptHits = 0;
  const seen = new Set();
  for (const sess of history.sessions || []) {
    const id = sess.sessionId || `t:${sess.time}`;
    const seq = sess.sequence || toolSequenceKey(sess.tools || []);
    const tokens = redact((sess.prompts || []).map((p) => p.text).join(' '))
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .slice(0, 8)
      .join(' ');
    if (fingerprint.sequence && seq === fingerprint.sequence) {
      if (!seen.has(`seq:${id}`)) {
        seen.add(`seq:${id}`);
        exact++;
      }
    } else if (similarPrompt(fingerprint.promptTokens, tokens)) {
      if (!seen.has(`p:${id}`)) {
        seen.add(`p:${id}`);
        promptHits++;
      }
    }
  }
  const patternCount = (history.patterns || {})[fingerprint.sequence] || exact;
  return { exact, promptHits, total: Math.max(patternCount, exact) + (exact ? 0 : promptHits) };
}

function suggestSkillName(session) {
  const tools = [...new Set((session.tools || []).map((t) => String(t.name || '').toLowerCase()))];
  if (tools.length && tools.length <= 4) return tools.join('-').replace(/[^a-z0-9-]/g, '') || 'workflow';
  const first = redact((session.prompts || [])[0]?.text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w && !['the', 'a', 'an', 'please', '幫我', '請'].includes(w))
    .slice(0, 3)
    .join('-')
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '');
  return first || 'workflow';
}

function existingSkillNames() {
  // Intentionally conservative: only look at the local skill-watch pending folder
  // and SKILL_WATCH_SKILLS_DIR if the user points us at a skills directory.
  const fs = require('fs');
  const path = require('path');
  const names = new Set();
  const extra = process.env.SKILL_WATCH_SKILLS_DIR;
  const dirs = extra ? [extra] : [];
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) names.add(entry.name.toLowerCase());
    }
  }
  return names;
}

function canNudge(patternKey, session, config) {
  const state = loadNudgeState();
  const now = Date.now();
  const last = state.lastByPattern[patternKey];
  if (last && now - last < config.nudgeCooldownMs) return false;
  const sessionNudges = (state.events || []).filter(
    (e) => e.sessionId === session.sessionId && now - e.time < 12 * 60 * 60 * 1000
  ).length;
  if (sessionNudges >= config.maxNudgesPerSession) return false;
  if ((session.nudgeCount || 0) >= config.maxNudgesPerSession) return false;
  return true;
}

function recordNudge(patternKey, session) {
  const state = loadNudgeState();
  const now = Date.now();
  state.lastByPattern[patternKey] = now;
  state.events = (state.events || []).concat({ patternKey, sessionId: session.sessionId, time: now }).slice(-50);
  saveNudgeState(state);
}

function evaluate(session) {
  const config = loadConfig();
  const fingerprint = workflowFingerprint(session);
  if (!fingerprint.sequence && fingerprint.toolCount < 2) {
    return { shouldNudge: false, reason: 'too-short' };
  }
  const history = loadHistory();
  const matches = countMatches(history, fingerprint);
  // Repeats are counted on exact tool sequences only, and only once a
  // workflow has at least two tools. Prompt similarity is not enough to
  // fire, otherwise the first tool of a later session would match too early.
  const seen = matches.exact;
  const repeatsIncludingCurrent = seen + 1;
  const isRepeat = fingerprint.toolCount >= 2 && repeatsIncludingCurrent >= config.minRepeats;
  const isLong = fingerprint.toolCount >= config.longSequenceSteps;
  const name = suggestSkillName(session);
  const existing = existingSkillNames();
  if (existing.has(name.toLowerCase())) {
    return { shouldNudge: false, reason: 'skill-exists', skillName: name, fingerprint, seen };
  }
  if (!isRepeat && !isLong) {
    return { shouldNudge: false, reason: 'below-threshold', skillName: name, fingerprint, seen, repeatsIncludingCurrent };
  }
  const patternKey = fingerprint.sequence || name;
  if (!canNudge(patternKey, session, config)) {
    return { shouldNudge: false, reason: 'rate-limited', skillName: name, fingerprint, seen };
  }
  const message = `「這個流程可以存成 skill：${name}，要不要存？」`;
  return {
    shouldNudge: true,
    skillName: name,
    message,
    fingerprint,
    seen,
    repeatsIncludingCurrent,
    isRepeat,
    isLong,
    patternKey,
  };
}

module.exports = {
  toolSequenceKey,
  workflowFingerprint,
  countMatches,
  suggestSkillName,
  evaluate,
  recordNudge,
};
