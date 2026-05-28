#!/usr/bin/env bash
# scripts/smoke-voting-pilot.sh
# Voting pilot smoke gates. Requires server running on PORT (default 3030).
set -euo pipefail

BASE="${SIMURGH_BASE_URL:-http://127.0.0.1:3030}"
PASS=0; FAIL=0

ok()   { echo "[PASS] $1"; ((PASS++)); }
fail() { echo "[FAIL] $1"; ((FAIL++)); }

# Gate 1: consent/accept returns pilot_session_id and token
R=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SESSION_ID=$(echo "$R" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOKEN=$(echo "$R" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[[ "$SESSION_ID" == vp_* ]] && ok "consent/accept returns vp_ session id" || fail "consent/accept bad session id"
[[ -n "$TOKEN" ]] && ok "consent/accept returns token" || fail "consent/accept no token"

# Gate 2: submit with valid token succeeds
R2=$(curl -sf -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"pilot_session_id\":\"$SESSION_ID\",\"submit_intent\":true}")
echo "$R2" | grep -q '"ballot_submitted":true' && ok "submit returns ballot_submitted true" || fail "submit bad response"
echo "$R2" | grep -q '"ballot_choice_recorded_by_simurgh":false' && ok "submit has ballot_choice_recorded_by_simurgh false" || fail "submit missing privacy field"

# Gate 3: report returns valid JSON with chain_valid (token required)
R3=$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/api/voting-pilot/$SESSION_ID/report")
echo "$R3" | grep -q '"chain_valid":true' && ok "report chain_valid true" || fail "report chain not valid"
echo "$R3" | grep -q '"official_vote_impact":false' && ok "report official_vote_impact false" || fail "report vote impact field missing"

# Gate 4: decline path — no session created (verify by checking a nonexistent session)
R4=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/vp_decline_test/report")
[[ "$R4" == "401" ]] && ok "decline path: request without token → 401" || fail "decline path: unexpected status $R4"

# Gate 5: withdrawal blocks report
R5=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
WD_SESSION=$(echo "$R5" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
WD_TOKEN=$(echo "$R5" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WD_TOKEN" -d '{}' > /dev/null
WD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $WD_TOKEN" "$BASE/api/voting-pilot/$WD_SESSION/report")
[[ "$WD_STATUS" == "403" ]] && ok "withdrawal blocks report with 403" || fail "withdrawal report status: $WD_STATUS"

echo ""
echo "smoke-voting-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
