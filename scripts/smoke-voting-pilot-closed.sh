#!/usr/bin/env bash
# scripts/smoke-voting-pilot-closed.sh
# Verifies server-side Phase C collection closure (SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true).
# Starts a temporary server on port 33034, runs closure gates, then shuts down.
set -euo pipefail

CLOSED_PORT=33034
BASE="http://127.0.0.1:$CLOSED_PORT"
PASS=0
FAIL=0
SRV_PID=""

ok() { echo "[PASS] $1"; ((PASS += 1)); }
fail() { echo "[FAIL] $1"; ((FAIL += 1)); }

cleanup() {
  if [[ -n "$SRV_PID" ]] && kill -0 "$SRV_PID" 2>/dev/null; then
    kill "$SRV_PID" 2>/dev/null || true
    wait "$SRV_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Boot a closed server instance on a dedicated port
SIMURGH_DEMO_MODE=1 \
  SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true \
  PORT=$CLOSED_PORT \
  node server.js >/tmp/vp-closed-srv.log 2>&1 &
SRV_PID=$!

# Wait for health
for i in $(seq 1 20); do
  if curl -sf "$BASE/health" >/dev/null 2>&1; then break; fi
  sleep 0.3
done
if ! curl -sf "$BASE/health" >/dev/null 2>&1; then
  echo "[FAIL] closed server did not boot on port $CLOSED_PORT"
  cat /tmp/vp-closed-srv.log
  exit 1
fi

# C1: consent/accept → 410
S1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
[[ "$S1" == "410" ]] && ok "collection closed → consent/accept returns 410" || fail "consent/accept status: $S1 (expected 410)"

# C1b: 410 body contains voting_pilot_collection_closed
B1=$(curl -s -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
echo "$B1" | grep -q '"voting_pilot_collection_closed"' \
  && ok "consent/accept 410 body has voting_pilot_collection_closed error" \
  || fail "consent/accept 410 body missing error key"

# C2: submit → 410 (rejectIfClosed fires before requirePilotToken)
S2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" -d '{"submit_intent":true}')
[[ "$S2" == "410" ]] && ok "collection closed → submit returns 410" || fail "submit status: $S2 (expected 410)"

# C3: withdraw → 410 (rejectIfClosed fires before requirePilotToken)
S3=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Content-Type: application/json" -d '{}')
[[ "$S3" == "410" ]] && ok "collection closed → withdraw returns 410" || fail "withdraw status: $S3 (expected 410)"

# C4: report still requires token (not locked to 410 — reports remain available)
S4=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/voting-pilot/vp_test_session/report")
[[ "$S4" == "401" ]] && ok "report endpoint still active (401 for missing token, not 410)" \
  || fail "report status: $S4 (expected 401)"

echo ""
echo "smoke-voting-pilot-closed: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
