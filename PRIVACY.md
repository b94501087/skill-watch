# Privacy Statement

## Data Collection

skill-watch collects the following data **locally only**:

1. **User prompts** — First 500 characters, redacted before they are written
2. **Tool sequences** — Tool names and truncated, redacted inputs (200 chars max)
3. **Timestamps** — When prompts and tools were used

## Data Storage

All data is stored in `~/.claude/skill-watch/` on your local machine:
- `current-session.json` — Current session data
- `history.json` — Historical patterns (last 100 sessions)
- `last-nudge.json` — Rate limiting data
- `pending/` — Draft skills awaiting review

## Data Transmission

**By default, no data leaves your machine.**

If you set `SKILL_WATCH_LLM_ENDPOINT` (or `"llmEnabled": true` plus an endpoint in `~/.claude/skill-watch/config.json`), a redacted summary may be sent to that endpoint when you run `/skill-watch save`. This is:
- **Opt-in only** — Disabled by default; no default network call is made
- **User-controlled** — You choose the endpoint
- **Redacted** — Sensitive data is stripped before sending

## Data Retention

- The current session is archived into history when the Claude Code session ends
- History is capped at 100 sessions
- Use `/skill-watch clear` to delete all data

## Automatic Redaction

Before any skill draft is created, the following are automatically redacted:
- File paths → `<PATH>`
- Email addresses → `<EMAIL>`
- API keys and tokens → `<KEY>`
- AWS keys → `<AWS_KEY>`
- GitHub tokens → `<GITHUB_TOKEN>`
- UUIDs → `<UUID>`
- IP addresses → `<IP>`
- Account IDs → `<ACCOUNT>`

## User Control

- All data storage is local
- You can clear all data at any time
- Skill drafts require manual review before use
- No data is shared without explicit configuration
