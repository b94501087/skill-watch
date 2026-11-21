# skill-watch

A Claude Code plugin that detects repeated workflows and suggests converting them to skills.

## Overview

This plugin:
- Logs prompts and tool sequences locally to `~/.claude/skill-watch/`
- Detects patterns: same workflow 3+ times, or long multi-step runs with no skill
- Nudges to save as skill when patterns emerge
- Drafts redacted SKILL.md files (no paths, accounts, keys)

## Commands

- `/skill-watch save` — Draft a SKILL.md from detected pattern
- `/skill-watch status` — Show detection stats
- `/skill-watch clear` — Clear logged data

## Development

```bash
npm test          # Run tests
npm run lint      # Check code style
```

## Privacy

All data stays local in `~/.claude/skill-watch/`. Nothing leaves the machine unless you configure the optional LLM endpoint.
