#!/usr/bin/env bash
# pm2 entrypoint: run the Vest pi-agent TUI inside a detached tmux session so
# the bot has a real TTY to render into, and is interactively watchable via
# watch-bot.sh. This script stays in the foreground so pm2 can restart it on
# crash or reboot.
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

# Despite the script name, we deliberately launch the full interactive TUI,
# NOT RPC mode. src/index.ts's isRpcMode() only returns true when argv[2] is
# the literal "rpc"; leaving the argument off gives us `npm start` (TUI).
# tmux supplies the TTY the TUI needs; watch-bot.sh attaches to it.
INNER_CMD="exec $(printf '%q' "$NODE") --import tsx ./src/index.ts"

# pm2 restart must not leave an old pane polling Telegram. The Telegram
# extension calls process.exit(0) on a 409 Conflict, which makes pm2 restart
# the whole app in a tight loop, so make sure the previous instance is really
# gone before a new one starts polling.
if tmux has-session -t "$SESSION" 2>/dev/null; then
	old_pid="$(tmux list-panes -t "$SESSION" -F '#{pane_pid}' 2>/dev/null | head -n1 || true)"
	tmux kill-session -t "$SESSION" 2>/dev/null || true
	if [ -n "${old_pid:-}" ]; then
		for _ in $(seq 1 40); do
			kill -0 "$old_pid" 2>/dev/null || break
			sleep 0.25
		done
		# Last resort: don't let a stuck poller hold the Telegram connection.
		if kill -0 "$old_pid" 2>/dev/null; then
			kill -TERM "$old_pid" 2>/dev/null || true
		fi
	fi
fi

cleanup() {
	tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

tmux new-session -d -s "$SESSION" -c "$ROOT" -x 160 -y 48 "$INNER_CMD"
# Keep the pane around after the inner process exits so we can capture its
# final output; otherwise the error scrollback dies with the session and pm2
# only shows a bare "session ended".
tmux set-window-option -t "$SESSION" remain-on-exit on

tmux set-option -t "$SESSION" mouse on
tmux set-option -t "$SESSION" history-limit 50000
tmux set-option -t "$SESSION" extended-keys on
tmux set-option -t "$SESSION" extended-keys-format csi-u 2>/dev/null || true

echo "vest-pi tmux session '${SESSION}' started (TUI mode)"

while tmux has-session -t "$SESSION" 2>/dev/null; do
	dead="$(tmux list-panes -t "$SESSION" -F '#{pane_dead}' 2>/dev/null | head -n1 || true)"
	if [ "$dead" = "1" ]; then
		break
	fi
	sleep 2
done

echo "tmux session '${SESSION}' ended; last pane output:" >&2
tmux capture-pane -p -t "$SESSION" 2>/dev/null | tail -n 40 >&2 || true
exit 1
