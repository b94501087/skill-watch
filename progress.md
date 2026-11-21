# Progress

## Completed
- [x] Project structure, CLAUDE.md, AGENTS.md symlink, MIT license
- [x] Hooks read official Claude Code stdin JSON (UserPromptSubmit, PostToolUse, Stop, SessionEnd)
- [x] Local-only logs under `~/.claude/skill-watch/`, redacted before write
- [x] Repeat detection (exact tool sequence, default 3+) and long-run detection (8+ tools)
- [x] In-session nudge: 「這個流程可以存成 skill：<name>，要不要存？」
- [x] Rate limits: 30-minute cooldown per pattern, max 2 nudges per session
- [x] `/skill-watch save` drafts a redacted SKILL.md into pending/; nothing installs automatically
- [x] Optional LLM summary only when an endpoint is configured
- [x] Tests including a simulated three-session hook workflow
- [x] README (English + Traditional Chinese notes) and PRIVACY.md
- [x] Installed locally as skill-watch@skill-watch-local

## Notes
- Hooks originally generated against argv/`$PROMPT` were rewritten to the stdin JSON contract, then retested.
- No GitHub remote has been added. A local git commit is for the working tree only.
