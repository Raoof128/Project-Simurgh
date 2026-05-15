#!/usr/bin/env bash
set -euo pipefail

# Development-only local LaunchAgent removal.
# Not notarised.
# Not production endpoint management.
# Not MDM deployment.

AGENT_PATH="$HOME/Library/LaunchAgents/dev.raouf.simurgh.daemon.plist"
launchctl bootout "gui/$(id -u)" "$AGENT_PATH" 2>/dev/null || true
rm -f "$AGENT_PATH"
echo "removed development LaunchAgent: $AGENT_PATH"
