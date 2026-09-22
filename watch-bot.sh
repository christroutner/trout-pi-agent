#!/usr/bin/env bash
# Attach to the Vest pi-agent running in tmux (started by rpc-bot.sh / pm2).
# This script only ever ATTACHES to the tmux session - it never starts, stops
# or restarts anything. The session is owned by the pm2 app `rpc-bot`, which
# (re)creates it on boot or restart.
# Detach without stopping the bot: Ctrl-b then d. Do not Ctrl-c unless you
# intend to kill the agent (pm2 will restart it).
set -euo pipefail

SESSION="${TROUT_PI_TMUX_SESSION:-vest-pi}"

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required but was not found on PATH." >&2
	exit 1
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
	echo "tmux session '${SESSION}' is not running." >&2
	echo "Start it with: pm2 restart rpc-bot" >&2
	exit 1
fi

tmux set-option -t "$SESSION" mouse on
tmux set-option -t "$SESSION" history-limit 50000
tmux set-option -t "$SESSION" extended-keys on
tmux set-option -t "$SESSION" extended-keys-format csi-u 2>/dev/null || true

exec tmux attach-session -t "$SESSION"
