#!/usr/bin/env node
const { draftSkill, getStatus } = require('../lib/skill-drafter');
const { clearData } = require('../lib/store');
const { loadConfig } = require('../lib/config');
const { summarizePattern } = require('../lib/llm-summarizer');
const { latestSession } = require('../lib/skill-drafter');

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(`skill-watch
  save [name]   Draft a redacted SKILL.md into the pending folder
  status        Show local pattern stats
  clear         Delete local skill-watch logs
  config        Show current configuration
`);
    return;
  }
  if (cmd === 'save') {
    const result = draftSkill(args[0]);
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (loadConfig().llmEnabled) {
      const summary = await summarizePattern(latestSession());
      if (summary) console.log('Optional summary:', summary);
    }
    console.log(`Draft written to ${result.path}`);
    console.log('Review it before installing. Optional: hand the draft to skill-creator.');
    return;
  }
  if (cmd === 'status') {
    console.log(JSON.stringify(getStatus(), null, 2));
    return;
  }
  if (cmd === 'clear') {
    clearData();
    console.log('Cleared local skill-watch logs.');
    return;
  }
  if (cmd === 'config') {
    console.log(JSON.stringify(loadConfig(), null, 2));
    return;
  }
  console.error('Unknown command:', cmd);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
