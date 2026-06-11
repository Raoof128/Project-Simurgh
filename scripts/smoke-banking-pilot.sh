#!/usr/bin/env bash
# scripts/smoke-banking-pilot.sh
# Banking Shield Phase A smoke gates. Requires server running on PORT (default 3030).
set -euo pipefail

if [[ -n "${SIMURGH_BASE_URL:-}" ]]; then
  BASE="$SIMURGH_BASE_URL"
else
  PORT="${SIMURGH_BANKING_SMOKE_PORT:-33037}"
  BASE="http://127.0.0.1:$PORT"
  LOG="${TMPDIR:-/tmp}/simurgh-banking-smoke-$PORT.log"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_BANKING_PILOT_PEPPER="smoke-banking-pepper-32-chars" \
  SIMURGH_BANKING_PILOT_TOKEN_SECRET="smoke-banking-token-secret-32" \
  SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false \
  PORT="$PORT" node server.js >"$LOG" 2>&1 &
  PID=$!
  cleanup() {
    kill "$PID" >/dev/null 2>&1 || true
  }
  trap cleanup EXIT
  for _ in {1..60}; do
    if curl -sf "$BASE/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  curl -sf "$BASE/health" >/dev/null || {
    echo "server did not start"
    tail -80 "$LOG" || true
    exit 1
  }
fi
API="$BASE/api/banking-pilot"
PASS=0
FAIL=0
VALID_SCOPE_HASH="sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

ok() { echo "[PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

json_field() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); console.log(data['$1'] ?? '')"
}

consent() {
  curl -sf -X POST "$API/consent/accept" -H "Content-Type: application/json" -d '{}'
}

submit_scenario() {
  local scenario="$1"
  local consent_body sid tok payload response
  consent_body="$(consent)"
  sid="$(echo "$consent_body" | json_field banking_session_id)"
  tok="$(echo "$consent_body" | json_field token)"

  case "$scenario" in
    mock_cdr_consent)
      payload="{\"banking_session_id\":\"$sid\",\"scenario_type\":\"mock_cdr_consent\",\"submit_intent\":true,\"consent_scope_hash\":\"$VALID_SCOPE_HASH\",\"consent_duration_category\":\"one_time\",\"withdrawal_option_shown\":true}"
      ;;
    mock_confirmation_of_payee)
      payload="{\"banking_session_id\":\"$sid\",\"scenario_type\":\"mock_confirmation_of_payee\",\"mock_cop_result_category\":\"close_match\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}"
      ;;
    remote_access_warning)
      payload="{\"banking_session_id\":\"$sid\",\"scenario_type\":\"remote_access_warning\",\"user_selected_context\":\"caller_requested_remote_access\",\"risk_prompt_shown\":true,\"user_action\":\"request_review\"}"
      ;;
    mock_payment_pause)
      payload="{\"banking_session_id\":\"$sid\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}"
      ;;
    mock_ai_agent_finance_action)
      payload="{\"banking_session_id\":\"$sid\",\"scenario_type\":\"mock_ai_agent_finance_action\",\"agent_action_type\":\"payment_draft\",\"user_decision\":\"reject\",\"financial_payload_recorded_by_simurgh\":false}"
      ;;
  esac

  response="$(curl -sf -X POST "$API/submit" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $tok" \
    -d "$payload")"
  echo "$response" | grep -q '"banking_payload_recorded_by_simurgh":false'
}

S1="$(curl -s -o /dev/null -w "%{http_code}" "$BASE/banking-pilot-consent.html")"
[[ "$S1" == "200" ]] && ok "consent page loads" || fail "consent page status $S1"

C="$(consent)"
SID="$(echo "$C" | json_field banking_session_id)"
TOK="$(echo "$C" | json_field token)"
[[ "$SID" == bp_* ]] && ok "consent/accept returns bp_ session id" || fail "bad banking session id"
[[ -n "$TOK" ]] && ok "consent/accept returns token" || fail "missing token"

for scenario in \
  mock_cdr_consent \
  mock_confirmation_of_payee \
  remote_access_warning \
  mock_payment_pause \
  mock_ai_agent_finance_action; do
  submit_scenario "$scenario" && ok "$scenario submits" || fail "$scenario submit"
done

F="$(consent)"
FSID="$(echo "$F" | json_field banking_session_id)"
FTOK="$(echo "$F" | json_field token)"
FBODY="$(curl -s -X POST "$API/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FTOK" \
  -d "{\"banking_session_id\":\"$FSID\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\",\"otp\":\"VerySecretOtp\"}")"
echo "$FBODY" | grep -q '"error":"forbidden_banking_field"' && ok "forbidden banking field rejected" || fail "forbidden field not rejected"
echo "$FBODY" | grep -vq "VerySecretOtp" && ok "forbidden response does not echo value" || fail "forbidden response leaks value"

R="$(consent)"
RSID="$(echo "$R" | json_field banking_session_id)"
RTOK="$(echo "$R" | json_field token)"
curl -sf -X POST "$API/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RTOK" \
  -d "{\"banking_session_id\":\"$RSID\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}" >/dev/null
REPORT="$(curl -sf -H "Authorization: Bearer $RTOK" "$API/$RSID/report")"
echo "$REPORT" | grep -q '"sonnet_received_sensitive_payload":false' && ok "report privacy assertions exported" || fail "report privacy assertions"
VERIFY="$(curl -sf -H "Authorization: Bearer $RTOK" "$API/$RSID/verify")"
echo "$VERIFY" | grep -q '"audit_chain_valid":true' && ok "audit chain verifies" || fail "audit verify"

W="$(consent)"
WSID="$(echo "$W" | json_field banking_session_id)"
WTOK="$(echo "$W" | json_field token)"
curl -sf -X POST "$API/withdraw" -H "Authorization: Bearer $WTOK" -H "Content-Type: application/json" -d '{}' >/dev/null
WSTATUS="$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $WTOK" "$API/$WSID/report")"
[[ "$WSTATUS" == "403" ]] && ok "withdrawn report returns 403" || fail "withdrawn report status $WSTATUS"

node --input-type=module - <<'NODE' >/dev/null
import { buildBankingNarrativePayload } from "./src/bankingPilot/bankingNarrativeSanitiser.js";
const payload = buildBankingNarrativePayload({
  banking_session_id: "bp_smoke",
  scenario: { scenario_type: "mock_payment_pause", user_action: "pause", otp: "VerySecretOtp" },
  risk: { risk_score: 35, verdict: "warning", risk_categories: ["payment_pause_context"], manual_review_required: true },
  privacy_assertions: {
    credential_recorded_by_simurgh: false,
    account_identifier_recorded_by_simurgh: false,
    transaction_content_recorded_by_simurgh: false,
  },
});
const text = JSON.stringify(payload);
if (text.includes("VerySecretOtp") || text.includes("otp")) process.exit(1);
NODE
[[ $? -eq 0 ]] && ok "local Sonnet sanitisation fixture metadata-only" || fail "Sonnet sanitisation fixture"

echo ""
echo "smoke-banking-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
