#!/usr/bin/env bash
# Verify (read-only) whether the Project Simurgh Linux daemon user unit is
# installed and consistent. Exits 0 if installed cleanly, 1 if not installed,
# 2 if installed but inconsistent.
#
# Usage: check-user-unit.sh
set -euo pipefail

USER_UNIT="$HOME/.config/systemd/user/simurgh-daemon-linux.service"
USER_BIN="$HOME/.local/bin/simurgh-daemon-linux"

ok=true
if [[ ! -f "$USER_UNIT" ]]; then
  echo "not installed: unit file missing"
  exit 1
fi
echo "unit file: present"

if [[ ! -x "$USER_BIN" ]]; then
  echo "warning: binary missing or not executable"
  ok=false
fi

# Query the user session only if it is available
if [[ -n "${XDG_RUNTIME_DIR:-}" ]]; then
  if systemctl --user list-unit-files 2>/dev/null | grep -q '^simurgh-daemon-linux\.service'; then
    echo "user unit: registered"
  else
    echo "warning: unit not listed (user session may not have reloaded)"
    ok=false
  fi
fi

if "$ok"; then
  echo "ok: simurgh-daemon-linux user unit installed cleanly"
  exit 0
fi
echo "inconsistent: see warnings above"
exit 2
