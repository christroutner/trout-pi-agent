#!/usr/bin/env bash
# pm2 entrypoint: run the Vest pi-agent in RPC mode inside a detached tmux
# session so the bot has a real TTY and its output is watchable (watch-bot.sh).
# This script stays in the foreground so pm2 can restart it on crash or reboot.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="${TROUT_PI_TMUX_SESSION:-vest-pi}"

cd "$ROOT"

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required but was not found on PATH." >&2
	exit 1
fi

if ! command -v node >/dev/null 2>&1; then
	echo "node is required but was not found on PATH: ${PATH}" >&2
	exit 1
fi

NODE="$(command -v node)"
# RPC mode: same as `npm run rpc`.
INNER_CMD="exec $(printf '%q' "$NODE") --import tsx ./src/index.ts"

# pm2 restart must not leave an old pane polling Telegram (409 Conflict).
if tmux has-session -t "$SESSION" 2>/dev/null; then
	tmux kill-session -t "$SESSION"
fi

cleanup() {
	tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

tmux new-session -d -s "$SESSION" -c "$ROOT" -x 160 -y 48 "$INNER_CMD"

tmux set-option -t "$SESSION" mouse on
tmux set-option -t "$SESSION" history-limit 50000
tmux set-option -t "$SESSION" extended-keys on
tmux set-option -t "$SESSION" extended-keys-format csi-u 2>/dev/null || true

echo "vest-pi tmux session '${SESSION}' started (RPC mode)"

while tmux has-session -t "$SESSION" 2>/dev/null; do
	sleep 2
done

echo "tmux session '${SESSION}' ended" >&2
exit 1
