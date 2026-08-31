#!/usr/bin/env bash
# pm2 entrypoint: run InteractiveMode inside a detached tmux session so the
# agent has a real TTY (Telegram + watchable Pi TUI). This script stays in
# the foreground so pm2 can restart it on crash or reboot (pm2 startup).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="${TROUT_PI_TMUX_SESSION:-trout-pi}"

cd "$ROOT"

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required but was not found on PATH." >&2
	exit 1
fi

if ! command -v node >/dev/null 2>&1; then
	echo "node is required but was not found on PATH: ${PATH}" >&2
	echo "If this is a pm2 startup job, save the PATH from a login shell: pm2 save" >&2
	exit 1
fi

NODE="$(command -v node)"
# Same as `npm start` — InteractiveMode, not RPC.
INNER_CMD="exec $(printf '%q' "$NODE") --import tsx ./src/index.ts"

# pm2 restart must not leave an old pane polling Telegram (409 Conflict).
if tmux has-session -t "$SESSION" 2>/dev/null; then
	tmux kill-session -t "$SESSION"
fi

cleanup() {
	tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Size matters when nobody is attached yet (tmux default is 80x24).
tmux new-session -d -s "$SESSION" -c "$ROOT" -x 160 -y 48 "$INNER_CMD"

# Session-scoped (not ~/.tmux.conf): wheel events reach the pane instead of
# being dropped. When Pi has mouse tracking on, tmux passes them through;
# otherwise the wheel scrolls tmux pane history (copy-mode).
tmux set-option -t "$SESSION" mouse on
tmux set-option -t "$SESSION" history-limit 50000
tmux set-option -t "$SESSION" extended-keys on
tmux set-option -t "$SESSION" extended-keys-format csi-u 2>/dev/null || true

echo "trout-pi tmux session '${SESSION}' started (InteractiveMode)"

# Block until the tmux session ends so pm2 tracks the bot's lifetime.
while tmux has-session -t "$SESSION" 2>/dev/null; do
	sleep 2
done

echo "tmux session '${SESSION}' ended" >&2
exit 1
