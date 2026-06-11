#!/usr/bin/env bash
# scripts/security-audit-banking-pilot.sh
# Running-server security gates for Banking Shield Phase A.
set -euo pipefail

if [[ -n "${SIMURGH_BASE_URL:-}" ]]; then
  BASE="$SIMURGH_BASE_URL/api/banking-pilot"
else
  PORT="${SIMURGH_BANKING_SECURITY_PORT:-33038}"
  ROOT="http://127.0.0.1:$PORT"
  BASE="$ROOT/api/banking-pilot"
  LOG="${TMPDIR:-/tmp}/simurgh-banking-security-$PORT.log"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_BANKING_PILOT_PEPPER="security-banking-pepper-32-chars" \
  SIMURGH_BANKING_PILOT_TOKEN_SECRET="security-banking-token-secret-32" \
  SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false \
  PORT="$PORT" node server.js >"$LOG" 2>&1 &
  PID=$!
  cleanup() {
    kill "$PID" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT
  for _ in {1..60}; do
    if curl -sf "$ROOT/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  curl -sf "$ROOT/health" >/dev/null || {
    echo "server did not start"
    tail -80 "$LOG" || true
    exit 1
  }
fi
PASS=0
FAIL=0
VALID_SCOPE_HASH="sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

ok() { echo "[PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

json_field() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); console.log(data['$1'] ?? '')"
}

consent() {
  curl -sf -X POST "$BASE/consent/accept" -H "Content-Type: application/json" -d '{}'
}

attack() {
  local label="$1"
  local extra="$2"
  local expected_error="$3"
  local expected_field="$4"
  local secret_value="${5:-}"
  local c sid tok body
  c="$(consent)"
  sid="$(echo "$c" | json_field banking_session_id)"
  tok="$(echo "$c" | json_field token)"
  body="$(curl -s -X POST "$BASE/submit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $tok" \
    -d "{\"banking_session_id\":\"$sid\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\",$extra}")"
  if echo "$body" | grep -q "\"error\":\"$expected_error\"" && echo "$body" | grep -q "\"field\":\"$expected_field\""; then
    ok "$label rejected"
  else
    fail "$label response: $body"
  fi
  if [[ -n "$secret_value" ]]; then
    echo "$body" | grep -vq "$secret_value" && ok "$label did not echo value" || fail "$label echoed value"
  fi
}

NO_TOKEN="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/submit" -H "Content-Type: application/json" -d '{"otp":"VerySecretOtp"}')"
[[ "$NO_TOKEN" == "401" ]] && ok "unauthenticated submit returns 401" || fail "unauthenticated status $NO_TOKEN"

attack "account_number" '"account_number":"111111"' "forbidden_banking_field" "account_number" "111111"
attack "nested otp" '"nested":{"otp":"123456"}' "forbidden_banking_field" "otp" "123456"
attack "array card_number" '"rows":[{"card_number":"4111111111111111"}]' "forbidden_banking_field" "card_number" "4111111111111111"
attack "transaction_amount" '"transaction_amount":"99.00"' "forbidden_banking_field" "transaction_amount" "99.00"
attack "payee_name" '"payee_name":"MockSensitivePayee"' "forbidden_banking_field" "payee_name" "MockSensitivePayee"
attack "payment_reference" '"payment_reference":"REF-SECRET"' "forbidden_banking_field" "payment_reference" "REF-SECRET"
attack "window_title" '"window_title":"Mock Bank Window"' "forbidden_banking_field" "window_title" "Mock Bank Window"
attack "process_name" '"process_name":"remote-support-app"' "forbidden_banking_field" "process_name" "remote-support-app"
attack "remote_app_name" '"remote_app_name":"AnyDesk Example"' "forbidden_banking_field" "remote_app_name" "AnyDesk Example"
attack "__proto__" '"__proto__":{"polluted":true}' "invalid_payload_key" "__proto__"
attack "prototype" '"prototype":"x"' "invalid_payload_key" "prototype"
attack "constructor" '"constructor":"x"' "invalid_payload_key" "constructor"

C="$(consent)"
SID="$(echo "$C" | json_field banking_session_id)"
TOK="$(echo "$C" | json_field token)"
BAD_SCENARIO="$(curl -s -X POST "$BASE/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" -d "{\"banking_session_id\":\"$SID\",\"scenario_type\":\"real_payment\"}")"
echo "$BAD_SCENARIO" | grep -q '"error":"invalid_scenario_type"' && ok "unknown scenario_type rejected" || fail "unknown scenario response: $BAD_SCENARIO"

C2="$(consent)"
SID2="$(echo "$C2" | json_field banking_session_id)"
TOK2="$(echo "$C2" | json_field token)"
BAD_HASH="$(curl -s -X POST "$BASE/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK2" -d "{\"banking_session_id\":\"$SID2\",\"scenario_type\":\"mock_cdr_consent\",\"submit_intent\":true,\"consent_scope_hash\":\"sha256:abc\",\"consent_duration_category\":\"one_time\",\"withdrawal_option_shown\":true}")"
echo "$BAD_HASH" | grep -q '"error":"invalid_consent_scope_hash"' && ok "weak consent hash rejected" || fail "weak hash response: $BAD_HASH"

for variant in true '"false"' omitted; do
  C3="$(consent)"
  SID3="$(echo "$C3" | json_field banking_session_id)"
  TOK3="$(echo "$C3" | json_field token)"
  if [[ "$variant" == "omitted" ]]; then
    BODY="{\"banking_session_id\":\"$SID3\",\"scenario_type\":\"mock_ai_agent_finance_action\",\"agent_action_type\":\"payment_draft\",\"user_decision\":\"reject\"}"
  else
    BODY="{\"banking_session_id\":\"$SID3\",\"scenario_type\":\"mock_ai_agent_finance_action\",\"agent_action_type\":\"payment_draft\",\"user_decision\":\"reject\",\"financial_payload_recorded_by_simurgh\":$variant}"
  fi
  RESP="$(curl -s -X POST "$BASE/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK3" -d "$BODY")"
  echo "$RESP" | grep -qE '"error":"(invalid_privacy_assertion|missing_required_field)"' && ok "AI payload assertion $variant rejected" || fail "AI assertion $variant response: $RESP"
done

echo ""
echo "security-audit-banking-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
