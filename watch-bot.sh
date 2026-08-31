#!/usr/bin/env bash
# Attach to the Pi TUI running in tmux (started by devops-bot.sh / pm2).
# Detach without stopping the bot: Ctrl-b then d. Do not Ctrl-c unless you
# intend to kill the agent (pm2 will restart it).
set -euo pipefail

SESSION="${TROUT_PI_TMUX_SESSION:-trout-pi}"

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required but was not found on PATH." >&2
	exit 1
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
	echo "tmux session '${SESSION}' is not running." >&2
	echo "Start it with: pm2 start ./devops-bot.sh --name trout-pi" >&2
	exit 1
fi

exec tmux attach-session -t "$SESSION"
