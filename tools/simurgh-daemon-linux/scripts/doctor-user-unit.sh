#!/usr/bin/env bash
# Full diagnostic of the simurgh-daemon-linux user unit + binary.
# Does not echo usernames, hostnames, or home paths.
#
# Usage: doctor-user-unit.sh
set -euo pipefail

USER_UNIT="$HOME/.config/systemd/user/simurgh-daemon-linux.service"
USER_BIN="$HOME/.local/bin/simurgh-daemon-linux"

echo "── doctor: simurgh-daemon-linux ──"

if type -p cargo >/dev/null 2>&1; then
  cargo --version
else
  echo "warning: cargo not on PATH"
fi

if [[ -x "$USER_BIN" ]]; then
  echo "binary: present"
else
  echo "binary: MISSING"
fi

if [[ -f "$USER_UNIT" ]]; then
  echo "unit:   present"
else
  echo "unit:   MISSING"
fi

if [[ -n "${XDG_RUNTIME_DIR:-}" ]]; then
  echo "session: user runtime present"
  systemctl --user is-enabled simurgh-daemon-linux.service 2>/dev/null \
    | sed 's/^/enabled: /' || echo "enabled: unknown"
  systemctl --user is-active simurgh-daemon-linux.service 2>/dev/null \
    | sed 's/^/active:  /' || echo "active:  unknown"
else
  echo "session: no user runtime (headless / server / CI?)"
fi

if type -p curl >/dev/null 2>&1; then
  if curl -s -m 1 http://127.0.0.1:3031/health >/dev/null 2>&1; then
    echo "health:  /health responding on 127.0.0.1:3031"
  else
    echo "health:  /health not reachable (daemon not running?)"
  fi
fi
