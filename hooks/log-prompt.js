#!/usr/bin/env node
const { redact } = require('../lib/redactor');
const { parseHookInput, emitNudge } = require('../lib/hook-io');
const { loadSession, saveSession } = require('../lib/store');
const { evaluate, recordNudge } = require('../lib/detect');

const hook = parseHookInput();
const session = loadSession(hook.session_id || hook.sessionId);
const prompt = hook.prompt || hook.message || hook.text || '';
if (prompt) {
  session.prompts.push({
    text: redact(String(prompt)).slice(0, 500),
    time: Date.now(),
    toolIndex: (session.tools || []).length,
  });
  saveSession(session);
}

const result = evaluate(session);
if (result.shouldNudge) {
  recordNudge(result.patternKey, session);
  session.nudgeCount = (session.nudgeCount || 0) + 1;
  saveSession(session);
  emitNudge(hook.hook_event_name || 'UserPromptSubmit', result.message + '\nRun /skill-watch save to draft a SKILL.md (nothing is installed until you approve).');
}
process.exit(0);
