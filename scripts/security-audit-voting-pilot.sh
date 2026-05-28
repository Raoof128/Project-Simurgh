#!/usr/bin/env bash
# scripts/security-audit-voting-pilot.sh
# Security and privacy gates for the voting pilot.
set -euo pipefail

BASE="${SIMURGH_BASE_URL:-http://127.0.0.1:3030}"
PASS=0; FAIL=0

ok()   { echo "[PASS] $1"; ((PASS++)); }
fail() { echo "[FAIL] $1"; ((FAIL++)); }

# S1: No token → 401
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" -d '{"submit_intent":true}')
[[ "$S" == "401" ]] && ok "no token → 401" || fail "no token status: $S"

# S2: Forbidden ballot field → 400
R=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID=$(echo "$R" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK=$(echo "$R" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
S2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOK" \
  -d "{\"pilot_session_id\":\"$SID\",\"submit_intent\":true,\"choice\":\"A\"}")
[[ "$S2" == "400" ]] && ok "forbidden ballot field → 400" || fail "ballot field status: $S2"

# S3: Forbidden field response contains field_names not values
R3=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID3=$(echo "$R3" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK3=$(echo "$R3" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
BODY3=$(curl -sf -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOK3" \
  -d "{\"pilot_session_id\":\"$SID3\",\"submit_intent\":true,\"candidate\":\"Alice\"}" || true)
echo "$BODY3" | grep -q '"forbidden_fields"' && ok "400 response contains forbidden_fields" || fail "400 response missing forbidden_fields"
echo "$BODY3" | grep -vq '"Alice"' && ok "400 response does not echo forbidden value" || fail "400 response leaks forbidden value"

# S4: Withdrawn session → 403 on report (with token)
R4=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID4=$(echo "$R4" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK4=$(echo "$R4" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK4" -H "Content-Type: application/json" -d '{}' > /dev/null
S4=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOK4" "$BASE/api/voting-pilot/$SID4/report")
[[ "$S4" == "403" ]] && ok "withdrawn session report → 403" || fail "withdrawn report status: $S4"

# S5: Report without token → 401
S5=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/$SID/report")
[[ "$S5" == "401" ]] && ok "report without token → 401" || fail "report without token status: $S5"

# S6: Token/path session mismatch → 403
R6A=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
R6B=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID6B=$(echo "$R6B" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK6A=$(echo "$R6A" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
S6=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOK6A" "$BASE/api/voting-pilot/$SID6B/report")
[[ "$S6" == "403" ]] && ok "cross-session report → 403" || fail "cross-session report status: $S6"

# S7: Decline path — no token → 401 (fabricated id)
S7=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/vp_fabricated_decline/report")
[[ "$S7" == "401" ]] && ok "decline path: no token → 401" || fail "decline path status: $S7"

# S8: Double withdrawal → 409
R8=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID8=$(echo "$R8" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK8=$(echo "$R8" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK8" -H "Content-Type: application/json" -d '{}' > /dev/null
S8=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK8" -H "Content-Type: application/json" -d '{}')
[[ "$S8" == "409" ]] && ok "double withdrawal → 409" || fail "double withdrawal status: $S8"

# S9: Privacy audit — no ballot-choice fields in evidence exports
node tools/privacy-audit.mjs 2>&1 | grep -q "voting-pilot.*PASS" \
  && ok "privacy audit voting-pilot scan: PASS" \
  || fail "privacy audit voting-pilot scan: FAIL"

echo ""
echo "security-audit-voting-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
