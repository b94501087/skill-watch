#!/usr/bin/env node
const { parseHookInput, emitNudge } = require('../lib/hook-io');
const { loadSession, saveSession, archiveSession } = require('../lib/store');
const { evaluate, recordNudge } = require('../lib/detect');

const hook = parseHookInput();
const eventName = hook.hook_event_name || hook.hookEventName || 'Stop';
const session = loadSession(hook.session_id || hook.sessionId);

if (eventName === 'SessionEnd') {
  archiveSession(session);
  saveSession({ sessionId: null, prompts: [], tools: [], startTime: Date.now(), nudgeCount: 0 });
  process.exit(0);
}

const result = evaluate(session);
if (result.shouldNudge) {
  recordNudge(result.patternKey, session);
  session.nudgeCount = (session.nudgeCount || 0) + 1;
  saveSession(session);
  emitNudge(eventName, result.message + '\nRun /skill-watch save to draft a SKILL.md (nothing is installed until you approve).');
}
process.exit(0);
