# trout-pi-agent

Node.js launcher for the [Pi coding agent](https://github.com/earendil-works/pi-mono) with a **fixed allowlist** of extensions and skills—no discovery from `~/.pi/agent/extensions` or project `.pi/extensions`.

## Layout

Clone or place these directories **next to each other** (siblings):

| Directory | Role |
|-----------|------|
| `trout-pi-agent` | This app |
| `pi-backup` | Agent project (`extensions/`, `skills/`, `memory/`, `config/AGENTS.md`) |
| `pi-telegram-extension` | Telegram bridge (must be built: `dist/index.js`) |
| `pi-memory` | Memory extension (`index.ts`) |
| `pi-mcp-adapter` | MCP adapter (`index.ts`) — provides `mcp()` proxy tool for SSH terminals, databases, etc. |

Override paths with environment variables (see [`.env.example`](.env.example)).

## Install

1. **This package**

   ```bash
   cd trout-pi-agent
   npm install
   ```

2. **`pi-backup/extensions` dependencies** (required for `web-fetch`, `brave-search`, `pi-scheduler`)

   ```bash
   cd ../pi-backup/extensions
   npm install
   ```

3. **`pi-telegram-extension` build**

   ```bash
   cd ../pi-telegram-extension
   npm install
   npm run build
   ```

4. **`pi-mcp-adapter` dependencies**

   ```bash
   cd ../pi-mcp-adapter
   npm install
   ```

5. **Copy env and set secrets**

   ```bash
   cd ../trout-pi-agent
   cp .env.example .env
   # Edit .env: set TELEGRAM_BOT_TOKEN at minimum
   ```

## Run

**Interactive TUI** (default):

```bash
npm start
```

**JSON-RPC** (stdin/stdout protocol; same extensions and `cwd` as TUI):

```bash
npm run rpc
```

See Pi’s [RPC documentation](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/rpc.md).

Uses `node --import tsx` so TypeScript runs without a separate build step. Optional: `npm run build` then `npm run start:dist`.

## What gets loaded

**Extensions (in order):**

1. `pi-memory/index.ts`
2. `pi-telegram-extension/dist/index.js`
3. `pi-backup/extensions/brave-search.ts`
4. `pi-backup/extensions/web-fetch.ts`
5. `pi-backup/extensions/pi-scheduler.ts`
6. `pi-mcp-adapter/index.ts` — registers an `mcp()` proxy tool (see [pi-mcp-adapter docs](https://pi.dev/packages/pi-mcp-adapter))

**Skills:** every subdirectory of `pi-backup/skills` that contains a `SKILL.md`.

**Context:** `pi-backup/config/AGENTS.md` is **appended** to Pi’s normal project context (from `cwd` = `PI_BACKUP_ROOT`).

**Working directory / sessions:** `PI_BACKUP_ROOT` is used as Pi’s `cwd` and for `SessionManager.create`, so tools and session files align with the backup repo.

**Memory files:** `PI_MEMORY_DIR` is set automatically to `PI_BACKUP_ROOT/memory` unless you override it in `.env`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PI_BACKUP_ROOT` | Default: `../pi-backup` (relative to this package). |
| `PI_TELEGRAM_EXTENSION_ROOT` | Default: `../pi-telegram-extension`. |
| `PI_MEMORY_ROOT` | Default: `../pi-memory`. |
| `PI_MCP_ADAPTER_ROOT` | Default: `../pi-mcp-adapter`. |
| `PI_MEMORY_DIR` | Memory store for pi-memory. Default: `$PI_BACKUP_ROOT/memory`. |
| `TELEGRAM_BOT_TOKEN` | Required for Telegram polling (extension logs an error if missing). |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated Telegram user IDs (optional). |
| `TELEGRAM_ALLOWED_GROUP_CHAT_IDS` | Comma-separated group chat IDs (optional). |
| `TELEGRAM_ALLOWLIST_ENABLED` | `true` / `false` (optional). |

Optional pi-memory / qmd: see [pi-memory README](https://github.com/jayzeng/pi-memory).

## Dependency on `@earendil-works/pi-coding-agent`

This repo depends on **`@earendil-works/pi-coding-agent@^0.74.0`** from npm (prebuilt `dist/`).

To use a **local checkout** instead, in `package.json` set:

```json
"@earendil-works/pi-coding-agent": "file:../pi-coding-agent/pi/packages/coding-agent"
```

Then build that package so `dist/` exists (e.g. its `npm run build` in the monorepo).

## Manual verification

- [ ] `npm start` opens the Pi TUI with cwd tied to `pi-backup`.
- [ ] No unexpected extensions from `~/.pi` (only the six listed above).
- [ ] Skills from `pi-backup/skills` appear (Ctrl+O / startup help as in Pi).
- [ ] With `PI_MEMORY_DIR` pointing at `pi-backup/memory`, memory tools write under that tree.
- [ ] With `TELEGRAM_BOT_TOKEN` set, startup shows Telegram connected (see pi-telegram-extension docs).
