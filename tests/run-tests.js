#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-watch-test-'));
process.env.HOME = tmpHome;
process.env.SKILL_WATCH_HOME = path.join(tmpHome, '.claude', 'skill-watch');
delete process.env.SKILL_WATCH_LLM_ENDPOINT;
delete process.env.SKILL_WATCH_LLM;

const { redact, redactSession } = require('../lib/redactor');
const { parseHookInput } = require('../lib/hook-io');
const { toolSequenceKey } = require('../lib/detect');
const { draftSkill, getStatus } = require('../lib/skill-drafter');
const { clearData, loadSession } = require('../lib/store');
const { loadConfig } = require('../lib/config');
const { summarizePattern } = require('../lib/llm-summarizer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const ret = fn();
    if (ret && typeof ret.then === 'function') {
      throw new Error('use testAsync for promises: ' + name);
    }
    console.log('✓ ' + name);
    passed++;
  } catch (e) {
    console.log('✗ ' + name);
    console.log('  ' + (e.stack || e.message));
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log('✓ ' + name);
    passed++;
  } catch (e) {
    console.log('✗ ' + name);
    console.log('  ' + (e.stack || e.message));
    failed++;
  }
}

function hook(script, payload) {
  const result = spawnSync('node', [path.join(__dirname, '..', 'hooks', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(script + ' exited ' + result.status + ': ' + result.stderr);
  }
  const out = (result.stdout || '').trim();
  return out ? JSON.parse(out) : null;
}

async function main() {
  console.log('\n=== Redactor Tests ===\n');

  test('redacts absolute paths', () => {
    const output = redact('File at /home/user/project/file.txt');
    assert(!output.includes('/home/user'), 'Path not redacted');
    assert(output.includes('<PATH>'), 'Missing placeholder');
  });

  test('redacts Windows paths', () => {
    const output = redact('File at C:\\Users\\admin\\example.txt');
    assert(!output.includes('C:\\Users'), 'Windows path not redacted');
  });

  test('redacts email addresses', () => {
    const output = redact('Contact user@example.com');
    assert(!output.includes('user@example.com'));
    assert(output.includes('<EMAIL>'));
  });

  test('redacts API keys', () => {
    const output = redact('Use sk_live_1234567890abcdefghij');
    assert(!output.includes('sk_live'));
    assert(output.includes('<KEY>'));
  });

  test('redacts Bearer tokens', () => {
    const output = redact('Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    assert(!output.includes('eyJ'));
  });

  test('redacts GitHub tokens', () => {
    const output = redact('Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz');
    assert(!output.includes('ghp_'));
  });

  test('redacts AWS keys', () => {
    const output = redact('Key: AKIAIOSFODNN7EXAMPLE');
    assert(!output.includes('AKIA'));
  });

  test('redacts UUIDs', () => {
    const output = redact('ID: 550e8400-e29b-41d4-a716-446655440000');
    assert(!output.includes('550e8400'));
  });

  test('redacts IP addresses', () => {
    const output = redact('Server at 192.168.1.100');
    assert(!output.includes('192.168'));
  });

  test('handles null input', () => {
    assert.strictEqual(redact(null), null);
    assert.strictEqual(redact(undefined), undefined);
  });

  test('redactSession handles full session', () => {
    const redacted = redactSession({
      prompts: [{ text: 'Read /home/user/file.txt', time: 1 }],
      tools: [{ name: 'Read', input: '/home/user/file.txt', time: 1 }],
      startTime: 1,
    });
    assert(!JSON.stringify(redacted).includes('/home/user'));
  });

  console.log('\n=== Hook I/O and Detection ===\n');

  test('parses stdin JSON hook payloads', () => {
    const data = parseHookInput(JSON.stringify({ prompt: 'hello', session_id: 'abc' }));
    assert.strictEqual(data.prompt, 'hello');
    assert.strictEqual(data.session_id, 'abc');
  });

  test('tool sequence key generation', () => {
    const key = toolSequenceKey([{ name: 'Read' }, { name: 'Edit' }, { name: 'Bash' }]);
    assert.strictEqual(key, 'Read→Edit→Bash');
  });

  await testAsync('LLM summarizer is opt-in and stays quiet by default', async () => {
    const result = await summarizePattern({ prompts: [{ text: 'secret' }], tools: [] });
    assert.strictEqual(result, null);
  });

  test('config defaults have LLM disabled', () => {
    const cfg = loadConfig();
    assert.strictEqual(cfg.llmEnabled, false);
    assert.strictEqual(cfg.minRepeats, 3);
  });

  console.log('\n=== End-to-end simulated workflow ===\n');

  test('three similar sessions nudge on the third run via stdin hooks', () => {
    clearData();
    const tools = [
      { tool_name: 'Read', tool_input: { file_path: '/home/box/example.env' } },
      { tool_name: 'Edit', tool_input: { file_path: '/home/box/example.env' } },
      { tool_name: 'Bash', tool_input: { command: 'npm test' } },
    ];

    function runSession(sessionId, expectNudge) {
      hook('log-prompt.js', {
        hook_event_name: 'UserPromptSubmit',
        session_id: sessionId,
        prompt: 'Please fix the failing tests and keep the API key sk_live_1234567890abcdefghij private',
      });
      let last = null;
      for (const t of tools) {
        last = hook('log-tool.js', {
          hook_event_name: 'PostToolUse',
          session_id: sessionId,
          ...t,
        });
      }
      hook('check-pattern.js', { hook_event_name: 'SessionEnd', session_id: sessionId });
      if (expectNudge) {
        assert(last, 'expected hook JSON output');
        const msg = last.hookSpecificOutput && last.hookSpecificOutput.additionalContext;
        assert(msg && msg.includes('這個流程可以存成 skill：'), 'missing Traditional Chinese nudge');
        assert(msg.includes('要不要存'), 'missing ask-to-save');
      } else {
        assert.strictEqual(last, null, 'did not expect a nudge yet');
      }
    }

    runSession('s1', false);
    runSession('s2', false);
    runSession('s3', true);

    const current = loadSession('s3');
    const logged = JSON.stringify(current) + JSON.stringify(getStatus());
    assert(!logged.includes('sk_live_1234567890abcdefghij'), 'raw key leaked into logs');
    assert(!logged.includes('/home/box/example.env'), 'raw path leaked into logs');

    const drafted = draftSkill('fix-tests');
    assert(drafted.success, drafted.error);
    const body = fs.readFileSync(drafted.path, 'utf8');
    assert(!body.includes('sk_live'), 'draft leaked key');
    assert(!body.includes('/home/box/example.env'), 'draft leaked path');
    assert(body.includes('name: fix-tests'));
  });

  test('rate limit prevents a second immediate nudge', () => {
    const out = hook('log-tool.js', {
      hook_event_name: 'PostToolUse',
      session_id: 's3',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/x' },
    });
    assert.strictEqual(out, null);
  });

  test('cli save writes a pending draft', () => {
    const result = spawnSync('node', [path.join(__dirname, '..', 'bin', 'cli.js'), 'save', 'from-cli'], {
      encoding: 'utf8',
      env: process.env,
    });
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert(result.stdout.includes('Draft written'));
    const pending = path.join(process.env.SKILL_WATCH_HOME, 'pending', 'from-cli.md');
    assert(fs.existsSync(pending));
  });

  test('cli clear removes logs', () => {
    const result = spawnSync('node', [path.join(__dirname, '..', 'bin', 'cli.js'), 'clear'], {
      encoding: 'utf8',
      env: process.env,
    });
    assert.strictEqual(result.status, 0);
    const status = getStatus();
    assert.strictEqual(status.sessions, 0);
  });

  console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
