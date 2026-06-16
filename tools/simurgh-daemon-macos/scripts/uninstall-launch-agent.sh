#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

# Development-only local LaunchAgent removal.
# Not notarised.
# Not production endpoint management.
# Not MDM deployment.

AGENT_PATH="$HOME/Library/LaunchAgents/dev.raouf.simurgh.daemon.plist"
MODE="${1:-uninstall}"

case "$MODE" in
  uninstall | --check | --dry-run) ;;
  *)
    echo "usage: $0 [--check|--dry-run]" >&2
    exit 64
    ;;
esac

if [[ "$AGENT_PATH" != "$HOME/Library/LaunchAgents/dev.raouf.simurgh.daemon.plist" ]]; then
  echo "refusing unexpected LaunchAgent path" >&2
  exit 73
fi

if [[ "$MODE" == "--check" || "$MODE" == "--dry-run" ]]; then
  echo "check passed: development LaunchAgent uninstall path is bounded"
  echo "boundary: Development-only local LaunchAgent removal; not notarised; not production endpoint management; not MDM deployment."
  exit 0
fi

launchctl bootout "gui/$(id -u)" "$AGENT_PATH" 2>/dev/null || true
rm -f "$AGENT_PATH"
echo "removed development LaunchAgent: $AGENT_PATH"
