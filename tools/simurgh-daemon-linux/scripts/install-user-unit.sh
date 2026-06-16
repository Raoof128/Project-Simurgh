#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Install the Project Simurgh Linux Device Shield daemon as a systemd --user
# service. Research prototype only. No privilege escalation. No system-wide install.
#
# Usage:  install-user-unit.sh [--check] [--dry-run]
#
#   --check     verify install preconditions without changing any state
#   --dry-run   print intended actions without executing them
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UNIT_SRC="$DAEMON_ROOT/systemd/simurgh-daemon-linux.service"
USER_UNIT_DIR="$HOME/.config/systemd/user"
USER_BIN_DIR="$HOME/.local/bin"
USER_STATE_DIR="$HOME/.local/state/simurgh"

CHECK_ONLY=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; exit 64 ;;
  esac
done

run() {
  if "$DRY_RUN"; then
    printf '[dry-run] %s\n' "$*"
  else
    "$@"
  fi
}

# Preconditions: verify a user systemd session is reachable
if [[ -z "${XDG_RUNTIME_DIR:-}" ]]; then
  echo "error: no systemd user session detected (XDG_RUNTIME_DIR unset)" >&2
  echo "       this script requires a logged-in interactive user session" >&2
  exit 3
fi
if ! systemctl --user show-environment >/dev/null 2>&1; then
  echo "error: user systemd bus is not responding" >&2
  exit 3
fi
if [[ ! -f "$UNIT_SRC" ]]; then
  echo "error: unit source missing" >&2
  exit 4
fi
if ! type -p cargo >/dev/null 2>&1; then
  echo "error: cargo not found on PATH (install Rust toolchain)" >&2
  exit 5
fi

if "$CHECK_ONLY"; then
  echo "ok: preconditions met for simurgh-daemon-linux user unit"
  exit 0
fi

# Build + install the daemon binary
run mkdir -p "$USER_BIN_DIR" "$USER_STATE_DIR" "$USER_UNIT_DIR"
run cargo install --quiet --path "$DAEMON_ROOT" --root "$HOME"/.local

# Copy the unit file
run cp "$UNIT_SRC" "$USER_UNIT_DIR/simurgh-daemon-linux.service"

# Reload + enable
run systemctl --user daemon-reload
run systemctl --user enable simurgh-daemon-linux.service

echo "ok: installed simurgh-daemon-linux.service (use 'systemctl --user start' to run)"
