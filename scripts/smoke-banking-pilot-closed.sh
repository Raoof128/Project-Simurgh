#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# scripts/smoke-banking-pilot-closed.sh
# Banking Shield Phase A collection-closure smoke.
set -euo pipefail

PORT="${SIMURGH_BANKING_CLOSED_PORT:-33036}"
BASE="http://127.0.0.1:$PORT/api/banking-pilot"
LOG="${TMPDIR:-/tmp}/simurgh-banking-closed-$PORT.log"
PASS=0
FAIL=0

ok() { echo "[PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

cleanup() {
  if [[ -n "${PID:-}" ]]; then kill "$PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

SIMURGH_DEMO_MODE=1 \
SIMURGH_BANKING_PILOT_PEPPER="closed-banking-pepper-32-chars" \
SIMURGH_BANKING_PILOT_TOKEN_SECRET="closed-banking-token-secret-32" \
SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true \
PORT="$PORT" node server.js >"$LOG" 2>&1 &
PID=$!

for _ in {1..60}; do
  if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then break; fi
  sleep 0.25
done

curl -sf "http://127.0.0.1:$PORT/health" >/dev/null || {
  echo "server did not start"
  tail -80 "$LOG" || true
  exit 1
}

S1="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/consent/accept" -H "Content-Type: application/json" -d '{}')"
[[ "$S1" == "410" ]] && ok "consent/accept returns 410 before auth" || fail "consent/accept status $S1"

S2="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/submit" -H "Content-Type: application/json" -d '{}')"
[[ "$S2" == "410" ]] && ok "submit returns 410 before auth" || fail "submit status $S2"

S3="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/withdraw" -H "Content-Type: application/json" -d '{}')"
[[ "$S3" == "410" ]] && ok "withdraw returns 410 before auth" || fail "withdraw status $S3"

BODY="$(curl -s -X POST "$BASE/consent/accept" -H "Content-Type: application/json" -d '{}')"
echo "$BODY" | grep -q '"banking_pilot_collection_closed"' && ok "closure response schema stable" || fail "closure response schema"

echo ""
echo "smoke-banking-pilot-closed: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
