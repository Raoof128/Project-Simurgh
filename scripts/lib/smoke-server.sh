# SPDX-License-Identifier: AGPL-3.0-or-later
# Shared readiness wait for smoke servers (sourced, not executed).
#
# Why this exists: every Stage 2.x smoke used to inline a fixed-iteration poll loop
# that (1) never checked whether the server PROCESS had died, so a crash-on-startup
# (e.g. EADDRINUSE) polled a corpse for the whole budget and then printed the opaque
# "server did not become healthy"; and (2) used a short, iteration-counted budget that
# could expire under cold/loaded CI runners. Both produced the recurring flake.
#
# This helper:
#   - fails FAST and LOUDLY if the server process exits before going healthy (surfaces
#     the real cause from the log instead of a timeout), and
#   - uses a generous WALL-CLOCK budget (default 60s, override via
#     SIMURGH_SMOKE_HEALTH_TIMEOUT) so a slow cold start is not mistaken for a failure.
#
# Print the PIDs of any process LISTENING on a TCP port (one per line). Best-effort:
# uses lsof (present on macOS + GitHub Ubuntu runners), falls back to ss. Always exits 0.
_port_listeners() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u || true
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnpH "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true
  fi
  return 0
}

# Ensure a TCP port is free before we bind it. A prior server.js in the same run can still
# be holding (or half-closing) the port when the next smoke starts, which surfaces as a hard
# "FATAL: port N already in use" and a flaky failure. We terminate any stale listener and
# wait until the port is actually free. Each smoke owns its port, so nothing legitimate is
# ever bound here. Best-effort: never hard-fails (let the real bind error surface if it must).
ensure_port_free() {
  local port="$1" label="${2:-server}"
  local deadline=$(($(date +%s) + 10)) pids
  while :; do
    pids="$(_port_listeners "$port")" || true
    [[ -z "$pids" ]] && return 0
    echo "smoke: port $port held by pid(s) [$(echo "$pids" | tr '\n' ' ')] before $label start — terminating stale listener(s)" >&2
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.5
    pids="$(_port_listeners "$port")" || true
    # shellcheck disable=SC2086
    [[ -n "$pids" ]] && { kill -9 $pids 2>/dev/null || true; }
    sleep 0.3
    if (($(date +%s) >= deadline)); then
      echo "smoke: port $port still busy after 10s; proceeding (bind may fail loudly)" >&2
      return 0
    fi
  done
}

# Boot a smoke server resiliently: free the port, launch CMD (stdout+stderr -> LOG), wait for
# /health, and retry the whole sequence (default 3 attempts) if the process dies before going
# healthy — covering the rare port-release race that no single cleanup can fully eliminate.
# On success sets BOOTED_PID to the live pid. Returns non-zero only after all attempts fail.
#
# Usage: boot_server PORT LOG LABEL -- CMD...
#   e.g. boot_server 33220 "$BASE_LOG" "base server" -- env SIMURGH_DEMO_MODE=1 PORT=33220 node server.js
boot_server() {
  local port="$1" log="$2" label="$3"
  shift 3
  [[ "${1:-}" == "--" ]] && shift
  local attempts="${SIMURGH_SMOKE_BOOT_ATTEMPTS:-3}" i
  BOOTED_PID=""
  for ((i = 1; i <= attempts; i++)); do
    ensure_port_free "$port" "$label"
    : > "$log"
    "$@" >"$log" 2>&1 &
    BOOTED_PID=$!
    if wait_for_health "http://127.0.0.1:$port/health" "$BOOTED_PID" "$log" "$label"; then
      return 0
    fi
    kill "$BOOTED_PID" 2>/dev/null || true
    wait "$BOOTED_PID" 2>/dev/null || true
    BOOTED_PID=""
    if ((i < attempts)); then
      echo "smoke: $label boot attempt $i/$attempts failed; freeing port $port and retrying" >&2
      sleep 1
    fi
  done
  echo "smoke: $label failed to boot on port $port after $attempts attempts" >&2
  return 1
}

# Usage: wait_for_health URL PID LOG_FILE [LABEL]
wait_for_health() {
  local url="$1" pid="$2" log_file="${3:-}" label="${4:-server}"
  local timeout="${SIMURGH_SMOKE_HEALTH_TIMEOUT:-60}"
  local deadline=$(($(date +%s) + timeout))
  while :; do
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      echo "Smoke failed: $label process (pid $pid) exited before becoming healthy at $url" >&2
      [[ -n "$log_file" && -f "$log_file" ]] && tail -60 "$log_file" >&2 || true
      return 1
    fi
    if curl -s -m 2 "$url" >/dev/null 2>&1; then
      return 0
    fi
    if (($(date +%s) >= deadline)); then
      echo "Smoke failed: $label did not become healthy at $url within ${timeout}s" >&2
      [[ -n "$log_file" && -f "$log_file" ]] && tail -60 "$log_file" >&2 || true
      return 1
    fi
    sleep 0.5
  done
}
