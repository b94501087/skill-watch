#!/usr/bin/env node
const { redact } = require('../lib/redactor');
const { parseHookInput, emitNudge } = require('../lib/hook-io');
const { loadSession, saveSession } = require('../lib/store');
const { evaluate, recordNudge } = require('../lib/detect');

function shortInput(value) {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return redact(text).slice(0, 200);
}

const hook = parseHookInput();
const session = loadSession(hook.session_id || hook.sessionId);
const toolName = hook.tool_name || hook.toolName || '';
if (toolName) {
  session.tools.push({
    name: String(toolName),
    input: shortInput(hook.tool_input || hook.toolInput || ''),
    time: Date.now(),
  });
  saveSession(session);
}

const result = evaluate(session);
if (result.shouldNudge) {
  recordNudge(result.patternKey, session);
  session.nudgeCount = (session.nudgeCount || 0) + 1;
  saveSession(session);
  emitNudge(hook.hook_event_name || 'PostToolUse', result.message + '\nRun /skill-watch save to draft a SKILL.md (nothing is installed until you approve).');
}
process.exit(0);
