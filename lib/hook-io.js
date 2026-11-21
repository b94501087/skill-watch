const fs = require('fs');

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseHookInput(raw) {
  const text = (raw == null ? readStdinSync() : raw).trim();
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return { prompt: text };
  }
}

function emitNudge(hookEventName, message) {
  const payload = {
    hookSpecificOutput: {
      hookEventName: hookEventName || 'PostToolUse',
      additionalContext: message,
    },
  };
  process.stdout.write(JSON.stringify(payload) + '\n');
}

module.exports = { readStdinSync, parseHookInput, emitNudge };
