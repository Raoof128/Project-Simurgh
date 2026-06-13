#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Uninstall the Project Simurgh Linux Device Shield user unit.
# Usage: uninstall-user-unit.sh [--check] [--dry-run]
set -euo pipefail

USER_UNIT_DIR="$HOME/.config/systemd/user"
USER_BIN="$HOME/.local/bin/simurgh-daemon-linux"

CHECK_ONLY=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,3p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 64 ;;
  esac
done
run() { if "$DRY_RUN"; then printf '[dry-run] %s\n' "$*"; else "$@"; fi }

if "$CHECK_ONLY"; then
  if [[ -f "$USER_UNIT_DIR/simurgh-daemon-linux.service" ]]; then
    echo "found: unit file present"
  else
    echo "not installed: nothing to do"
  fi
  exit 0
fi

# Stop and disable if the user session is available
if [[ -n "${XDG_RUNTIME_DIR:-}" ]]; then
  run systemctl --user stop simurgh-daemon-linux.service 2>/dev/null || true
  run systemctl --user disable simurgh-daemon-linux.service 2>/dev/null || true
fi
run rm -f "$USER_UNIT_DIR/simurgh-daemon-linux.service"
run rm -f "$USER_BIN"
if [[ -n "${XDG_RUNTIME_DIR:-}" ]]; then
  run systemctl --user daemon-reload || true
fi
echo "ok: uninstalled simurgh-daemon-linux.service"
