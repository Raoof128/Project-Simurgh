#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# scripts/smoke-banking-pilot-ai-firewall.sh
# Banking Shield B4-A AI privacy firewall smoke gate.
# Spins TWO servers: one flag-on (main flow), one flag-off (503 assertion).
set -euo pipefail

PASS=0
FAIL=0
ok() {
  echo "[PASS] $1"
  PASS=$((PASS + 1))
}
fail() {
  echo "[FAIL] $1"
  FAIL=$((FAIL + 1))
}
json_field() {
  node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d['$1'] ?? '')"
}

start_server() {
  local port="$1" explain="$2" log="$3"
  SIMURGH_DEMO_MODE=1 \
    SIMURGH_BANKING_PILOT_PEPPER="smoke-banking-pepper-32-chars" \
    SIMURGH_BANKING_PILOT_TOKEN_SECRET="smoke-banking-token-secret-32" \
    SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false \
    SIMURGH_BANKING_PILOT_AI_EXPLAIN="$explain" \
    PORT="$port" node server.js >"$log" 2>&1 &
  echo $!
}
wait_health() {
  local base="$1"
  for _ in {1..60}; do
    if curl -sf "$base/health" >/dev/null 2>&1; then return 0; fi
    sleep 0.25
  done
  return 1
}

PORT_ON="${SIMURGH_AI_SMOKE_PORT_ON:-33061}"
PORT_OFF="${SIMURGH_AI_SMOKE_PORT_OFF:-33062}"
LOG_ON="${TMPDIR:-/tmp}/simurgh-ai-smoke-on.log"
LOG_OFF="${TMPDIR:-/tmp}/simurgh-ai-smoke-off.log"

PID_ON="$(start_server "$PORT_ON" true "$LOG_ON")"
PID_OFF="$(start_server "$PORT_OFF" false "$LOG_OFF")"
cleanup() { kill "$PID_ON" "$PID_OFF" >/dev/null 2>&1 || true; }
trap cleanup EXIT

BASE_ON="http://127.0.0.1:$PORT_ON"
BASE_OFF="http://127.0.0.1:$PORT_OFF"
wait_health "$BASE_ON" || {
  echo "flag-on server failed"
  tail -40 "$LOG_ON"
  exit 1
}
wait_health "$BASE_OFF" || {
  echo "flag-off server failed"
  tail -40 "$LOG_OFF"
  exit 1
}

API_ON="$BASE_ON/api/banking-pilot"
API_OFF="$BASE_OFF/api/banking-pilot"

# --- flag-on flow: consent -> submit -> explain ---
C="$(curl -sf -X POST "$API_ON/consent/accept" -H 'Content-Type: application/json' -d '{}')"
SID="$(echo "$C" | json_field banking_session_id)"
TOK="$(echo "$C" | json_field token)"
curl -sf -X POST "$API_ON/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" \
  -d "{\"banking_session_id\":\"$SID\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}" >/dev/null

EXPLAIN="$(curl -sf "$API_ON/$SID/ai-privacy-explain" -H "Authorization: Bearer $TOK")"
SENT="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.sensitive_payload_sent_to_ai)")"
EGRESS="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.network_egress_used)")"
HASH="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.narrative_hash||'')")"
[ "$SENT" = "false" ] && ok "sensitive_payload_sent_to_ai is false" || fail "sensitive payload flag"
[ "$EGRESS" = "false" ] && ok "network_egress_used is false" || fail "egress flag"
echo "$HASH" | grep -Eq '^sha256:[a-f0-9]{64}$' && ok "narrative_hash present" || fail "narrative_hash"

# --- withdrawn session blocks explain (403) ---
curl -sf -X POST "$API_ON/withdraw" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{}' >/dev/null
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$API_ON/$SID/ai-privacy-explain" -H "Authorization: Bearer $TOK")"
[ "$CODE" = "403" ] && ok "withdrawn session blocks explain (403)" || fail "withdrawn block got $CODE"

# --- flag-off server returns 503 ---
C2="$(curl -sf -X POST "$API_OFF/consent/accept" -H 'Content-Type: application/json' -d '{}')"
SID2="$(echo "$C2" | json_field banking_session_id)"
TOK2="$(echo "$C2" | json_field token)"
curl -sf -X POST "$API_OFF/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK2" \
  -d "{\"banking_session_id\":\"$SID2\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}" >/dev/null
CODE_OFF="$(curl -s -o /dev/null -w '%{http_code}' "$API_OFF/$SID2/ai-privacy-explain" -H "Authorization: Bearer $TOK2")"
[ "$CODE_OFF" = "503" ] && ok "flag-off returns 503" || fail "flag-off got $CODE_OFF"

echo "----"
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
