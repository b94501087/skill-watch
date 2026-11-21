const fs = require('fs');
const path = require('path');
const { dataDir } = require('./config');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sessionFile() {
  return path.join(dataDir(), 'current-session.json');
}

function historyFile() {
  return path.join(dataDir(), 'history.json');
}

function nudgeFile() {
  return path.join(dataDir(), 'nudge-state.json');
}

function pendingDir() {
  return path.join(dataDir(), 'pending');
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

function emptySession(sessionId) {
  return {
    sessionId: sessionId || null,
    prompts: [],
    tools: [],
    startTime: Date.now(),
    nudgeCount: 0,
  };
}

function loadSession(sessionId) {
  ensureDir(dataDir());
  const session = readJson(sessionFile(), emptySession(sessionId));
  if (sessionId && session.sessionId && session.sessionId !== sessionId) {
    archiveSession(session);
    return emptySession(sessionId);
  }
  if (sessionId && !session.sessionId) {
    session.sessionId = sessionId;
  }
  return session;
}

function saveSession(session) {
  writeJson(sessionFile(), session);
}

function loadHistory() {
  return readJson(historyFile(), { sessions: [], patterns: {} });
}

function saveHistory(history) {
  writeJson(historyFile(), history);
}

function archiveSession(session) {
  if (!session || !((session.tools && session.tools.length) || (session.prompts && session.prompts.length))) {
    return;
  }
  const history = loadHistory();
  const seq = (session.tools || []).map((t) => t.name).join('→');
  if (seq) {
    history.patterns[seq] = (history.patterns[seq] || 0) + 1;
  }
  history.sessions.push({
    sessionId: session.sessionId || null,
    tools: session.tools || [],
    prompts: session.prompts || [],
    time: Date.now(),
    sequence: seq,
  });
  if (history.sessions.length > 100) {
    history.sessions = history.sessions.slice(-100);
  }
  saveHistory(history);
}

function loadNudgeState() {
  return readJson(nudgeFile(), { lastByPattern: {}, events: [] });
}

function saveNudgeState(state) {
  writeJson(nudgeFile(), state);
}

function clearData() {
  const dir = dataDir();
  for (const name of ['current-session.json', 'history.json', 'nudge-state.json', 'last-nudge.json']) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  return { success: true };
}

module.exports = {
  dataDir,
  pendingDir,
  ensureDir,
  loadSession,
  saveSession,
  loadHistory,
  saveHistory,
  archiveSession,
  loadNudgeState,
  saveNudgeState,
  clearData,
  emptySession,
};
