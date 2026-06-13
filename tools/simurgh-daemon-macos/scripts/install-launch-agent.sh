#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

# Development-only local LaunchAgent.
# Not notarised.
# Not production endpoint management.
# Not MDM deployment.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_TEMPLATE="$ROOT_DIR/launchd/dev.raouf.simurgh.daemon.plist"
AGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/Simurgh"
AGENT_PATH="$AGENT_DIR/dev.raouf.simurgh.daemon.plist"
BINARY_PATH="$ROOT_DIR/.build/debug/SimurghDaemon"
MODE="${1:-install}"

case "$MODE" in
  install | --check | --dry-run) ;;
  *)
    echo "usage: $0 [--check|--dry-run]" >&2
    exit 64
    ;;
esac

if [[ ! -f "$PLIST_TEMPLATE" ]]; then
  echo "missing plist template: $PLIST_TEMPLATE" >&2
  exit 66
fi

if [[ "$AGENT_PATH" != "$HOME/Library/LaunchAgents/dev.raouf.simurgh.daemon.plist" ]]; then
  echo "refusing unexpected LaunchAgent path" >&2
  exit 73
fi

if [[ "$MODE" == "--check" || "$MODE" == "--dry-run" ]]; then
  if command -v plutil >/dev/null 2>&1; then
    plutil -lint "$PLIST_TEMPLATE" >/dev/null
    echo "check passed: development LaunchAgent template is valid"
  else
    echo "check passed: development LaunchAgent path is bounded; plist lint skipped because plutil is unavailable"
  fi
  echo "boundary: development-only local LaunchAgent; not notarised; not production endpoint management; not MDM deployment."
  exit 0
fi

swift build --package-path "$ROOT_DIR"
mkdir -p "$AGENT_DIR" "$LOG_DIR"
sed \
  -e "s#__SIMURGH_DAEMON_BINARY__#$BINARY_PATH#g" \
  -e "s#__SIMURGH_LOG_DIR__#$LOG_DIR#g" \
  "$PLIST_TEMPLATE" > "$AGENT_PATH"

plutil -lint "$AGENT_PATH" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$AGENT_PATH" 2>/dev/null || launchctl kickstart "gui/$(id -u)/dev.raouf.simurgh.daemon"
launchctl enable "gui/$(id -u)/dev.raouf.simurgh.daemon"

echo "installed development LaunchAgent: $AGENT_PATH"
echo "boundary: development-only local LaunchAgent; not notarised; not production endpoint management; not MDM deployment."
