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
