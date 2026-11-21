# skill-watch

A Claude Code plugin that detects repeated workflows and suggests converting them to reusable skills.

## Features

- **Local-only logging** — Prompts and tool sequences stay on your machine
- **Pattern detection** — Finds workflows repeated 3+ times across sessions
- **Long sequence detection** — Flags multi-step runs (8+ tools) with no matching skill
- **Automatic redaction** — Strips paths, keys, and accounts from drafts
- **Optional LLM summaries** — Uses local OpenAI-compatible endpoint when configured

## Installation

```bash
# From local path
claude plugin install /path/to/skill-watch --scope user

# Or add to marketplace and install
claude plugin marketplace add your-username/skill-watch
claude plugin install skill-watch@your-marketplace
```

## Usage

The plugin runs automatically via hooks. When it detects a pattern:

```
「這個流程可以存成 skill：read-edit-test，要不要存？」
(Run /skill-watch save to create a draft)
```

### Commands

```bash
/skill-watch save [name]   # Draft a SKILL.md from detected pattern
/skill-watch status        # Show detection statistics
/skill-watch clear         # Clear all logged data
/skill-watch config        # Show/update configuration
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SKILL_WATCH_MIN_PATTERN` | `3` | Minimum pattern occurrences to trigger nudge |
| `SKILL_WATCH_LLM_ENDPOINT` | (none) | OpenAI-compatible endpoint for summaries |

Example:
```bash
export SKILL_WATCH_MIN_PATTERN=5
export SKILL_WATCH_LLM_ENDPOINT=http://127.0.0.1:3001/v1/chat/completions
```

## Privacy

**All data stays local.** See [PRIVACY.md](PRIVACY.md) for details.

- Data stored in `~/.claude/skill-watch/`
- Automatic redaction of sensitive values
- No network calls unless LLM endpoint configured
- Clear data anytime with `/skill-watch clear`

## Development

```bash
npm test    # Run tests
npm run lint
```

## License

MIT

---

# 繁體中文說明

## 功能

skill-watch 是一個 Claude Code 外掛，用於偵測重複的工作流程並建議將其轉換為可重複使用的 skill。

### 主要特點

- **本機儲存** — 所有資料都儲存在 `~/.claude/skill-watch/`，不會離開你的電腦
- **模式偵測** — 當同一工作流程重複 3 次以上時發出提示
- **長序列偵測** — 當執行 8 個以上工具步驟時提醒
- **自動遮蔽** — 自動移除路徑、金鑰、帳號等敏感資料
- **可選 LLM 摘要** — 可設定本機 OpenAI 相容端點來產生摘要

### 使用方式

外掛會在背景自動執行。當偵測到模式時會顯示：

```
「這個流程可以存成 skill：<名稱>，要不要存？」
```

執行 `/skill-watch save` 來建立草稿。

### 指令

- `/skill-watch save [名稱]` — 從偵測到的模式建立 SKILL.md 草稿
- `/skill-watch status` — 顯示偵測統計
- `/skill-watch clear` — 清除所有記錄資料

### 隱私

所有資料都儲存在本機。詳見 [PRIVACY.md](PRIVACY.md)。

### 授權

MIT 授權
