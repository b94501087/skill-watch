---
name: skill-watch
description: "Review detected workflows, draft a redacted SKILL.md, or show skill-watch status. Use when the user wants to save a repeated workflow as a skill, run /skill-watch save, or inspect local skill-watch logs."
---

# /skill-watch

Detects repeated workflows in this Claude Code session and drafts a skill only after the user agrees.

## Commands

- `/skill-watch save [name]` — Draft a redacted `SKILL.md` into `~/.claude/skill-watch/pending/`. Do **not** install it. After writing the draft, offer to hand it to skill-creator if that plugin is available.
- `/skill-watch status` — Show local pattern counts and current-session stats.
- `/skill-watch clear` — Delete local skill-watch logs after confirming with the user.
- `/skill-watch config` — Show configuration (min repeats, cooldown, optional LLM endpoint).

Prefer running the bundled CLI so the draft is consistent:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/cli.js" save [name]
node "${CLAUDE_PLUGIN_ROOT}/bin/cli.js" status
node "${CLAUDE_PLUGIN_ROOT}/bin/cli.js" config
node "${CLAUDE_PLUGIN_ROOT}/bin/cli.js" clear
```

Nothing is installed or published without an explicit yes from the user. When you show a nudge in the session, use this wording:

「這個流程可以存成 skill：<name>，要不要存？」
