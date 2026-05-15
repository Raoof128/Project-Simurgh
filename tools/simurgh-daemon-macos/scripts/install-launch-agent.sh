#!/usr/bin/env bash
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
