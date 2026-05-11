# trout-pi-agent setup on Ubuntu 24.04

This guide assumes a **fresh Ubuntu 24.04** install (desktop or server) with `sudo` available. Commands are meant to be run in order unless noted as optional.

## 1. Base system packages

Update the package index and install tools used by Node native modules, Git, and TLS:

```bash
sudo apt update
sudo apt install -y curl ca-certificates git build-essential pkg-config
```

## 2. Node.js (20.6 or newer)

Pi’s engine requirement is **Node ≥ 20.6**. Ubuntu’s default `nodejs` package may be too old; install a current LTS (example: **22.x**) via [NodeSource](https://github.com/nodesource/distributions):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Confirm:

```bash
node -v   # should show v22.x.x (or any v20.6+ / v22+)
npm -v
```

Alternative: install [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) and use them to install Node 22 LTS instead of NodeSource.

## 3. Layout: parent directory and repositories

Pick a parent directory (example: `~/work`). All of these repos must be **siblings** so trout-pi-agent’s default paths (`../pi-backup`, etc.) resolve correctly.

```bash
mkdir -p ~/work
cd ~/work
```

Clone the four repositories. Replace the URLs below with your real remotes (or copy existing trees into `~/work` with the expected folder names).

```bash
# Agent project (extensions, skills, memory, config)
git clone <YOUR_PI_BACKUP_REPO_URL> pi-backup

# Telegram bridge for Pi
git clone <YOUR_PI_TELEGRAM_EXTENSION_REPO_URL> pi-telegram-extension

# Memory extension (loaded as TypeScript by Pi)
git clone <YOUR_PI_MEMORY_REPO_URL> pi-memory

# This launcher
git clone <YOUR_TROUT_PI_AGENT_REPO_URL> trout-pi-agent
```

Expected result:

```text
~/work/
  pi-backup/
  pi-telegram-extension/
  pi-memory/
  trout-pi-agent/
```

## 4. Install `pi-backup/extensions` npm dependencies

Required so Pi can load `brave-search`, `web-fetch`, and `pi-scheduler` (e.g. `node-cron`, `linkedom`, `@mozilla/readability`).

```bash
cd ~/work/pi-backup/extensions
npm install
```

## 5. Build `pi-telegram-extension`

The launcher loads `dist/index.js`; it must exist after a TypeScript build.

```bash
cd ~/work/pi-telegram-extension
npm install
npm run build
```

Verify:

```bash
test -f ~/work/pi-telegram-extension/dist/index.js && echo "telegram extension OK"
```

## 6. Install `trout-pi-agent`

```bash
cd ~/work/trout-pi-agent
npm install
```

This installs `@earendil-works/pi-coding-agent` from npm along with `dotenv` and `tsx`.

## 7. Pi user config (auth and models)

The launcher uses Pi’s default **agent directory** `~/.pi/agent` for `auth.json`, `models.json`, and `settings.json` (same as the normal `pi` CLI).

On first run you can let Pi prompt for API keys in the TUI, or copy existing config from another machine:

```bash
mkdir -p ~/.pi/agent
# Optional: copy auth/models/settings from a backup
# cp /path/to/backup/auth.json ~/.pi/agent/
# cp /path/to/backup/models.json ~/.pi/agent/
# cp /path/to/backup/settings.json ~/.pi/agent/
```

Ensure at least one provider is configured so a model can be selected.

## 8. Environment file and Telegram

```bash
cd ~/work/trout-pi-agent
cp .env.example .env
```

Edit `.env` with your editor and set at least:

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather) (required for the Telegram extension to start polling).

Optional Telegram allowlist variables are documented in [`.env.example`](../.env.example) and in `pi-telegram-extension`’s dev docs.

If repos are **not** siblings of `trout-pi-agent`, set absolute paths:

- `PI_BACKUP_ROOT`
- `PI_TELEGRAM_EXTENSION_ROOT`
- `PI_MEMORY_ROOT`
- `PI_MEMORY_DIR` (defaults to `$PI_BACKUP_ROOT/memory` when unset)

## 9. Optional: Bun and `qmd` (pi-memory semantic search)

Core pi-memory tools work **without** `qmd`. For **`memory_search`** and richer memory injection, install [qmd](https://github.com/tobi/qmd) (upstream docs recommend **Bun**):

```bash
curl -fsSL https://bun.sh/install | bash
```

Reload your shell or `source ~/.bashrc` (or `~/.zshrc`), then:

```bash
bun install -g https://github.com/tobi/qmd
```

Ensure Bun’s global bin is on `PATH` (the installer usually adds `~/.bun/bin`):

```bash
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
qmd status
```

After you have memory files under `pi-backup/memory`, run a one-time index as described in the [pi-memory README](https://github.com/jayzeng/pi-memory) (e.g. `qmd collection add …`, `qmd embed`) if you use semantic modes.

Optional environment tuning (see [`.env.example`](../.env.example)):

- `PI_MEMORY_QMD_UPDATE` — `background` (default), `manual`, or `off`
- `PI_MEMORY_NO_SEARCH=1` — disable automatic memory search injection

## 10. Run trout-pi-agent

From a **terminal** (TTY or SSH with a proper terminal—not a bare pipe):

```bash
cd ~/work/trout-pi-agent
npm start
```

You should get the Pi TUI with `cwd` set to `pi-backup`. If extension paths fail, the process prints errors before exit; fix paths or run the missing `npm install` / `npm run build` steps above.

**Headless JSON-RPC** (stdin/stdout; no TUI):

```bash
cd ~/work/trout-pi-agent
npm run rpc
```

Use this when embedding the agent in another process; see the Pi coding agent RPC docs in the monorepo.

## 11. Quick verification checklist

```bash
node -v
npm -v
test -f ~/work/pi-telegram-extension/dist/index.js && echo "telegram: built"
test -d ~/work/pi-backup/extensions/node_modules && echo "pi-backup/extensions: deps"
test -d ~/work/trout-pi-agent/node_modules && echo "trout-pi-agent: deps"
command -v qmd >/dev/null && qmd status || echo "qmd: optional, not installed"
```

Then in the app: model responds, skills from `pi-backup/skills` appear in Pi’s resource UI, memory writes under `pi-backup/memory` when using memory tools, and Telegram connects when `TELEGRAM_BOT_TOKEN` is set.

## Reference

- Main project README: [README.md](../README.md)
- Env template: [`.env.example`](../.env.example)
