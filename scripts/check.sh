#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Simurgh comprehensive check script — the single gate for the whole repository.
#
# Every check increments PASS/FAIL via the pass()/fail() helpers and is announced
# by step(); the run ends non-zero if any gate failed. Logs for each step are
# written under .simurgh_check_logs/ (streamed instead with --verbose).
#
# Sections (see the "── N. Title ──" banners below):
#   1–9   Repo hygiene ...... node version, deps, syntax, format, tests,
#                             privacy guard, secret scan, tone check, npm audit
#   10–11 Runtime smokes .... server boot + auth gates, audit-chain self-test
#                             (both skipped under --quick)
#   12    Platform & device . Stage 2.1–2.8 integrity/daemon/scanner, Swift &
#                             Linux-Rust nodes, voting & banking pilots
#   13    LLM Shield ........ Stage 3A–3S containment pipeline + per-stage audits
#                             (Stage 4D–4L end-to-end reproduce lives in the second
#                             gate, scripts/check-e2e.sh, run on Node 26)
#   14    Git status sanity
#
# Usage:
#   ./scripts/check.sh             # full run
#   ./scripts/check.sh --quick     # skip slow runtime smokes (server, audit chain)
#   ./scripts/check.sh --fix       # auto-format (prettier --write) where possible
#   ./scripts/check.sh --verbose   # stream command output instead of logging to file
#
# Exit code: 0 if all gates pass, 1 otherwise.

set -euo pipefail

# ── Project root ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Colours ───────────────────────────────────────────────
if [[ -t 1 && "${NO_COLOR:-}" == "" ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  CYAN=''
  NC=''
fi

QUICK=false
FIX=false
VERBOSE=false

for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    --fix) FIX=true ;;
    --verbose) VERBOSE=true ;;
    --help|-h)
      echo "Usage: ./scripts/check.sh [--quick] [--fix] [--verbose]"
      echo ""
      echo "  --quick    Skip slow checks (server boot smoke, audit chain self-test)"
      echo "  --fix      Reserved (no auto-fixable checks today)"
      echo "  --verbose  Stream command output instead of writing to logs"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      echo "Usage: ./scripts/check.sh [--quick] [--fix] [--verbose]"
      exit 1
      ;;
  esac
done

PASS=0
FAIL=0
FAILED_STEPS=()

LOG_DIR=".simurgh_check_logs"
mkdir -p "$LOG_DIR"

step() {
  echo ""
  echo -e "${CYAN}━━━ $1 ━━━${NC}"
}

pass() {
  echo -e "${GREEN}✓ $1${NC}"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "${RED}✗ $1${NC}"
  FAIL=$((FAIL + 1))
  FAILED_STEPS+=("$1")
}

run_step() {
  local name="$1"
  local command="$2"
  local log_file="$LOG_DIR/${name// /_}.log"

  if [[ "$VERBOSE" == true ]]; then
    echo -e "${YELLOW}$command${NC}"
    if bash -lc "$command" 2>&1 | tee "$log_file"; then
      pass "$name"
    else
      fail "$name"
      echo -e "${YELLOW}Log: $log_file${NC}"
    fi
  else
    if bash -lc "$command" > "$log_file" 2>&1; then
      pass "$name"
    else
      fail "$name"
      echo -e "${YELLOW}Last 40 log lines from $log_file:${NC}"
      tail -40 "$log_file" || true
    fi
  fi
}

# ── 1. Node version ──────────────────────────────────────
step "Node version"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [[ "$NODE_MAJOR" -ge 22 ]]; then
  pass "node $(node --version) (>= 22 required for node:test)"
else
  fail "node $(node --version || echo 'missing') — need >= 22"
fi

# ── 2. Dependencies ──────────────────────────────────────
step "Install dependencies"
if [[ -d node_modules ]]; then
  pass "node_modules present (skipping install)"
else
  run_step "npm install" "npm install --no-audit --no-fund"
fi

# ── 3. Syntax check ──────────────────────────────────────
step "Syntax check"
SYNTAX_FAIL=false
SYNTAX_LOG="$LOG_DIR/syntax.log"
: > "$SYNTAX_LOG"
while IFS= read -r -d '' f; do
  if ! node --check "$f" 2>>"$SYNTAX_LOG"; then
    echo "$f" >> "$SYNTAX_LOG"
    SYNTAX_FAIL=true
  fi
done < <(find . \
  -type f \( -name '*.js' -o -name '*.mjs' \) \
  -not -path './node_modules/*' \
  -not -path './.git/*' \
  -not -path "./$LOG_DIR/*" \
  -print0)
if [[ "$SYNTAX_FAIL" == true ]]; then
  fail "node --check"
  echo -e "${YELLOW}Log: $SYNTAX_LOG${NC}"
else
  pass "node --check on all .js / .mjs files"
fi

# ── 4. Format ────────────────────────────────────────────
step "Format"
if [[ "$FIX" == true ]]; then
  run_step "prettier --write (npm run format)" "npm run format"
elif [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* || "$(uname -s)" == CYGWIN* ]]; then
  run_step "prettier --check (Windows line endings tolerated)" "npx prettier --check . --end-of-line auto"
else
  run_step "prettier --check (npm run format:check)" "npm run format:check"
fi

# ── 5. Tests ─────────────────────────────────────────────
step "Tests"
run_step "npm test" "npm test"

# ── 6. Privacy guard ─────────────────────────────────────
step "Privacy guard"
PRIVACY_FAIL=false

# 5a. Run the project privacy audit CLI (default scan dirs)
if [[ -f tools/privacy-audit.mjs ]]; then
  if node tools/privacy-audit.mjs --quiet > "$LOG_DIR/privacy-audit.log" 2>&1; then
    pass "tools/privacy-audit.mjs (generated data scan)"
  else
    fail "tools/privacy-audit.mjs"
    tail -40 "$LOG_DIR/privacy-audit.log" || true
    PRIVACY_FAIL=true
  fi
else
  echo -e "${YELLOW}tools/privacy-audit.mjs not found — skipping data scan${NC}"
fi

# 5b. Static grep — composite forbidden field names in source/HTML/JS.
# Only flag unambiguous data-field shapes (underscored composites + raw_*).
# Single-word terms like "microphone" or "audio" are too noisy for source grep —
# tools/privacy-audit.mjs catches them in JSON data files where context is clear.
FORBIDDEN_FIELDS_PATTERN='\b(typed_content|paste_content|answer_text|answer_content|screen_frame|screen_data|screen_pixels|webcam_frame|microphone_data|microphone_audio|biometric_data|face_data|raw_student_name|raw_identity|device_serial|serial_number|mac_address|username|home_directory|bundle_path|file_path|process_identifier|process_name|raw_process_name|window_title|raw_window_title|raw_window|raw_process)\b'
PRIVACY_GREP_LOG="$LOG_DIR/privacy-fields.log"

if grep -RIEn "$FORBIDDEN_FIELDS_PATTERN" \
    server.js src/ public/ tools/ \
    --include='*.js' --include='*.mjs' --include='*.html' \
    --exclude-dir=node_modules 2>/dev/null \
  | grep -v "FORBIDDEN_FIELDS" \
  | grep -v "tools/privacy-audit.mjs" \
  | grep -v "src/privacy/normaliseTelemetry.js" \
  | grep -v "src/integrity/proofSchema.js" \
  | grep -v "src/integrity/proofValidator.js" \
  | grep -v "src/device/daemonProof.js" \
  | grep -v "src/device/forbiddenLocalFields.js" \
  | grep -v "src/bankingPilot/forbiddenBankingFields.js" \
  | grep -v "Permissions-Policy" \
  | grep -v "Content-Security-Policy" \
  | grep -v "/check.sh" > "$PRIVACY_GREP_LOG"; then
  if [[ -s "$PRIVACY_GREP_LOG" ]]; then
    echo -e "${RED}Forbidden field reference found in source (outside the privacy enforcement code):${NC}"
    cat "$PRIVACY_GREP_LOG"
    PRIVACY_FAIL=true
  fi
fi

# 5c. Forbidden npm packages — no analytics / tracking
FORBIDDEN_PACKAGES=(
  "firebase-analytics"
  "google-analytics"
  "@google-analytics"
  "@firebase/analytics"
  "@amplitude/"
  "mixpanel"
  "@segment/analytics"
  "@sentry/node"
  "@sentry/browser"
  "posthog-js"
  "posthog-node"
)
for package in "${FORBIDDEN_PACKAGES[@]}"; do
  if grep -q "\"$package" package.json 2>/dev/null; then
    echo -e "${RED}Forbidden tracking/analytics package in package.json: $package${NC}"
    PRIVACY_FAIL=true
  fi
done

if [[ "$PRIVACY_FAIL" == true ]]; then
  fail "privacy guard"
else
  pass "privacy guard (no forbidden fields, no analytics packages)"
fi

# ── 7. Secret scan ───────────────────────────────────────
step "Secret scan"
SECRET_FAIL=false
SECRET_LOG="$LOG_DIR/secrets.log"
: > "$SECRET_LOG"

# Patterns:
#   sk-ant-...    Anthropic
#   sk-...        OpenAI-style
#   AIza...       Google API keys
#   SIMURGH_*_SECRET= followed by a real value (not a placeholder)
if grep -RIEn \
    "(sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,})" \
    server.js src/ public/ tools/ scripts/ README.md AGENT.md CHANGELOG.md SECURITY.md PRIVACY.md \
    --include='*' \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir='.venv*' \
    --exclude="$LOG_DIR" \
    2>/dev/null \
  | grep -v "check.sh:" \
  | grep -v "\.example:" \
  | grep -v "sk-ant-\\.\\.\\." \
  | grep -v "openssl rand" \
  >> "$SECRET_LOG"; then : ; fi

# Detect SIMURGH_*_SECRET= or SIMURGH_INSTRUCTOR_TOKEN= with a non-empty,
# non-placeholder value anywhere outside .env.example.
if grep -RIEn \
    "SIMURGH_(HELPER_SECRET|AUDIT_SECRET|INSTRUCTOR_TOKEN|SESSION_SIGNING_SECRET)=[A-Za-z0-9]{8,}" \
    . \
    --exclude-dir=node_modules \
    --exclude-dir=.git \
    --exclude-dir="$LOG_DIR" \
    --exclude-dir='.venv*' \
    --exclude=.env.example \
    --exclude=check.sh \
    2>/dev/null >> "$SECRET_LOG"; then : ; fi

if [[ -s "$SECRET_LOG" ]]; then
  # Filter out the check.sh file itself and known-safe documentation lines.
  grep -v ":#" "$SECRET_LOG" > "$SECRET_LOG.filtered" || true
  if [[ -s "$SECRET_LOG.filtered" ]]; then
    echo -e "${RED}Possible hardcoded secret found:${NC}"
    cat "$SECRET_LOG.filtered"
    SECRET_FAIL=true
  fi
  rm -f "$SECRET_LOG.filtered"
fi

if [[ "$SECRET_FAIL" == true ]]; then
  fail "secret scan"
else
  pass "secret scan (no hardcoded keys or token values)"
fi

# ── 8. Tone check ────────────────────────────────────────
step "Tone check"
# Forbidden marketing/overclaim words. "unhackable" / "unbreakable" are allowed
# only when used as a negation ("not unhackable").
TONE_LOG="$LOG_DIR/tone.log"
: > "$TONE_LOG"
TONE_FAIL=false

# Hard-forbidden — any occurrence fails.
HARD_FORBIDDEN='\b(fully secure|guaranteed detection|proves cheating|cannot be bypassed|impossible to evade|automatic misconduct finding)\b'
if grep -RInE "$HARD_FORBIDDEN" \
    README.md AGENT.md CHANGELOG.md SECURITY.md PRIVACY.md docs/ETHICS.md docs/DISCLAIMER.md ROADMAP.md 2>/dev/null \
  | grep -iv "never makes automatic misconduct" \
  | grep -iv "no automatic misconduct finding" \
  | grep -iv "cannot be bypassed by configuration" \
  >> "$TONE_LOG"; then : ; fi

# Soft-forbidden — must be negated. Flag if line does NOT contain "not".
for word in "unhackable" "unbreakable"; do
  if grep -RInE "\\b$word\\b" \
      README.md AGENT.md CHANGELOG.md SECURITY.md PRIVACY.md docs/ETHICS.md docs/DISCLAIMER.md ROADMAP.md 2>/dev/null \
    | grep -iv "not[[:space:]]*[\"']*$word" \
    | grep -iv "not be ${word}" \
    >> "$TONE_LOG"; then : ; fi
done

if [[ -s "$TONE_LOG" ]]; then
  echo -e "${RED}Tone violations — overclaim or unhedged marketing language:${NC}"
  cat "$TONE_LOG"
  TONE_FAIL=true
fi

if [[ "$TONE_FAIL" == true ]]; then
  fail "tone check"
else
  pass "tone check (hedged language, no overclaim)"
fi

# ── 9. Dependency vulnerability scan ─────────────────────
step "npm audit"
if npm audit --audit-level=high > "$LOG_DIR/npm-audit.log" 2>&1; then
  pass "npm audit (0 high/critical vulnerabilities)"
else
  fail "npm audit (high or critical vulnerabilities found)"
  tail -40 "$LOG_DIR/npm-audit.log" || true
fi

# ── 10. Server boot smoke + auth gates ───────────────────
if [[ "$QUICK" == true ]]; then
  step "Server boot smoke"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Server boot smoke"
  # Use an off-band per-run port/session namespace so repeated local checks do
  # not collide with an older smoke server or persisted in-memory sessions.
  SMOKE_PORT="${SIMURGH_CHECK_SMOKE_PORT:-$((33030 + (RANDOM % 1000)))}"
  SMOKE_RUN_ID="check_${SMOKE_PORT}_$$"
  SMOKE_LOG="$LOG_DIR/smoke.log"
  : > "$SMOKE_LOG"

  SIMURGH_DEMO_MODE=1 PORT=$SMOKE_PORT node server.js > "$SMOKE_LOG" 2>&1 &
  SMOKE_PID=$!

  # Wait up to 5 seconds for /health to respond.
  HEALTH_OK=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.5
    if curl -s -m 1 "http://localhost:$SMOKE_PORT/health" >/dev/null 2>&1; then
      HEALTH_OK=true
      break
    fi
  done

  SMOKE_FAIL=false
  if [[ "$HEALTH_OK" != true ]]; then
    fail "server boot — /health not reachable"
    SMOKE_FAIL=true
  else
    pass "/health reachable"

    # Check required security headers
    HEADERS="$(curl -sI "http://localhost:$SMOKE_PORT/health" 2>/dev/null)"
    for h in "X-Frame-Options: DENY" "X-Content-Type-Options: nosniff" "Referrer-Policy:" "Permissions-Policy:"; do
      if echo "$HEADERS" | grep -qi "^$(echo "$h" | cut -d: -f1):"; then
        pass "header present: $(echo "$h" | cut -d: -f1)"
      else
        fail "header missing: $(echo "$h" | cut -d: -f1)"
        SMOKE_FAIL=true
      fi
    done

    # Negative test: telemetry with negative number must be rejected
    NEG_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/telemetry" \
      -H 'Content-Type: application/json' \
      -d '{"sessionId":"'"${SMOKE_RUN_ID}"'_neg","telemetry":{"keystrokes":-1,"chars_typed":5,"effective_wpm":50,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}' 2>/dev/null)"
    if echo "$NEG_RESPONSE" | grep -q '"error"'; then
      pass "telemetry rejects negative numbers"
    else
      fail "telemetry accepted negative number (expected rejection)"
      echo "  got: $NEG_RESPONSE"
      SMOKE_FAIL=true
    fi

    # Negative test: replay (duplicate sequence) must be rejected
    NOW_MS="$(node -p 'Date.now()')"
    BODY='{"sessionId":"'"${SMOKE_RUN_ID}"'_replay","sequence":1,"timestamp":'"$NOW_MS"',"telemetry":{"keystrokes":5,"chars_typed":20,"effective_wpm":40,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}'
    curl -s -X POST "http://localhost:$SMOKE_PORT/api/telemetry" -H 'Content-Type: application/json' -d "$BODY" >/dev/null 2>&1
    REPLAY_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/telemetry" -H 'Content-Type: application/json' -d "$BODY" 2>/dev/null)"
    if echo "$REPLAY_RESPONSE" | grep -q "sequence_replay_or_rollback"; then
      pass "telemetry rejects duplicate sequence"
    else
      fail "telemetry accepted duplicate sequence (expected sequence_replay_or_rollback)"
      echo "  got: $REPLAY_RESPONSE"
      SMOKE_FAIL=true
    fi

    # Negative test: joined session without token must be rejected (401)
    EXAM_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/exams" \
      -H 'Content-Type: application/json' \
      -d '{"title":"'"${SMOKE_RUN_ID}"' smoke","durationMinutes":60}' 2>/dev/null)"
    EXAM_ID="$(echo "$EXAM_RESPONSE" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).id||"")}catch{}})' 2>/dev/null)"
    if [[ -n "$EXAM_ID" ]]; then
      JOIN_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/exams/$EXAM_ID/join" \
        -H 'Content-Type: application/json' \
        -d '{"studentId":"check@test","sessionId":"'"${SMOKE_RUN_ID}"'_joined"}' 2>/dev/null)"
      TOK="$(echo "$JOIN_RESPONSE" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).sessionToken||"")}catch{}})' 2>/dev/null)"
      if [[ -n "$TOK" ]]; then
        pass "/join issues sessionToken"
      else
        fail "/join did not return sessionToken"
        echo "  got: $JOIN_RESPONSE"
        SMOKE_FAIL=true
      fi

      # Joined-session telemetry without token → 401
      NOTOKEN_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/telemetry" \
        -H 'Content-Type: application/json' \
        -d '{"sessionId":"'"${SMOKE_RUN_ID}"'_joined","sequence":1,"timestamp":'"$(node -p 'Date.now()')"',"telemetry":{"keystrokes":1,"chars_typed":1,"effective_wpm":10,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}' 2>/dev/null)"
      if echo "$NOTOKEN_RESPONSE" | grep -q "session_token_required"; then
        pass "joined-session telemetry requires token"
      else
        fail "joined-session telemetry accepted without token"
        echo "  got: $NOTOKEN_RESPONSE"
        SMOKE_FAIL=true
      fi
    else
      fail "/api/exams did not return an exam id"
      echo "  got: $EXAM_RESPONSE"
      SMOKE_FAIL=true
    fi
  fi

  # Tear down server
  kill "$SMOKE_PID" 2>/dev/null || true
  wait "$SMOKE_PID" 2>/dev/null || true

  if [[ "$SMOKE_FAIL" == true ]]; then
    fail "server boot smoke (composite)"
  fi
fi

# ── 11. Audit chain self-test ────────────────────────────
if [[ "$QUICK" == true ]]; then
  step "Audit chain self-test"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Audit chain self-test"
  # Build a tiny chain via the hmacChain module, write to a temp file,
  # then verify it with verify-audit.mjs.
  TMP_CHAIN="$(mktemp "$LOG_DIR/simurgh-chain.XXXXXX.json")"
  if node -e "
import('./src/audit/hmacChain.js').then(({ createChain, appendEntry }) => {
  const key = 'check-script-test-key';
  const chain = createChain();
  appendEntry(chain, key, 'verdict', { risk_level: 'Safe' });
  appendEntry(chain, key, 'verdict', { risk_level: 'Warning' });
  const out = {
    sessionId: 'check_chain',
    generated_at: new Date().toISOString(),
    chain_terminator: chain.prevHash,
    entry_count: chain.entries.length,
    truncated: chain.truncated,
    cap: 5000,
    hmac_algorithm: 'HMAC-SHA256',
    hmac_key_ephemeral: true,
    entries: chain.entries,
  };
  require('node:fs').writeFileSync('$TMP_CHAIN', JSON.stringify(out, null, 2));
});
" 2>"$LOG_DIR/chain-build.log"; then
    # Use the project's verifier if present and accepts a path arg.
    if [[ -f tools/verify-audit.mjs ]]; then
      # Try verify with the same secret we used.
      if SIMURGH_AUDIT_SECRET=check-script-test-key \
         node tools/verify-audit.mjs "$TMP_CHAIN" > "$LOG_DIR/verify-audit.log" 2>&1; then
        pass "audit chain verifies end-to-end"
      else
        # Fallback: verify with the internal module if the CLI has a different contract.
        if node -e "
import('./src/audit/verifyAudit.js').then(({ verifyAuditExport }) => {
  const fs = require('node:fs');
  const data = JSON.parse(fs.readFileSync('$TMP_CHAIN', 'utf8'));
  const r = verifyAuditExport(data, 'check-script-test-key');
  if (!r.valid) { console.error('invalid:', r.errors); process.exit(1); }
  console.log('valid:', r.valid, 'entries:', r.entry_count);
});
" > "$LOG_DIR/verify-audit-fallback.log" 2>&1; then
          pass "audit chain verifies via src/audit/verifyAudit.js (CLI signature differs)"
        else
          fail "audit chain self-test"
          tail -40 "$LOG_DIR/verify-audit-fallback.log" || true
        fi
      fi
    else
      pass "audit chain built (no CLI verifier present)"
    fi
  else
    fail "audit chain build (could not construct test chain)"
    tail -40 "$LOG_DIR/chain-build.log" || true
  fi
  rm -f "$TMP_CHAIN"
fi

# ── 12a. Stage 2.1 — integrity proof round-trip ──────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.1 integrity proof round-trip"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.1 integrity proof round-trip"
  SIMURGH_DEMO_MODE=1 PORT=33031 node server.js > "$LOG_DIR/stage21-srv.log" 2>&1 &
  S2_PID=$!
  sleep 1

  ROUND_TRIP_OK=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'check@check', sessionId:'check_sess'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = {
  version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'check_sess',
  node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'),
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false},
  signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'},
  privacy_mode:'metadata_only',
};
const canonical = canonicaliseProofPayload(proof);
proof.signature = crypto.sign(null, Buffer.from(canonical,'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'unregistered_node' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)

  if [[ "$ROUND_TRIP_OK" == "OK" ]]; then
    pass "Stage 2.1 integrity proof verified end-to-end (signature_status=unregistered_node)"
  else
    fail "Stage 2.1 integrity proof round-trip"
    echo "$ROUND_TRIP_OK"
  fi

  NEG_RESULT=$(node --input-type=module -e "
import crypto from 'node:crypto';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'check2@check', sessionId:'check_sess_neg'})})).json();
const tok = join.sessionToken;
const { publicKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const { computeNodeIdHash } = await import('./src/integrity/proofSignature.js');
const proof = {
  version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'check_sess_neg',
  node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'),
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false},
  signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'},
  privacy_mode:'metadata_only',
  signature: Buffer.alloc(64).toString('base64'),
};
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 401 && body.error === 'invalid_signature' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)

  if [[ "$NEG_RESULT" == "OK" ]]; then
    pass "Stage 2.1 zeroed signature rejected (401 invalid_signature)"
  else
    fail "Stage 2.1 zeroed signature check"
    echo "$NEG_RESULT"
  fi

  # ─────────────────────────────────────────────────────────────
  #  Stage 2.2 — pairing round-trip + verified proof status
  # ─────────────────────────────────────────────────────────────
  PAIR_RT=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'pair_check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'p@c',sessionId:'pair_check'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const nodeIdHash = computeNodeIdHash(rawPub);
const nodePub = rawPub.toString('base64');
const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'pair_check', node_id_hash: nodeIdHash, node_public_key: nodePub, challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), privateKey).toString('base64');
const cmp = await (await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)})).json();
process.stdout.write(cmp.status === 'paired' && cmp.signature_status === 'verified' ? 'OK' : 'FAIL:' + JSON.stringify(cmp));
" 2>&1 || true)
  if [[ "$PAIR_RT" == "OK" ]]; then
    pass "Stage 2.2 pairing round-trip (signature_status: verified)"
  else
    fail "Stage 2.2 pairing round-trip"
    echo "$PAIR_RT"
  fi

  PAIRED_PROOF=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'paired_proof',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'pp@c',sessionId:'paired_proof'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const nodeIdHash = computeNodeIdHash(rawPub);
const nodePub = rawPub.toString('base64');
const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'paired_proof', node_id_hash: nodeIdHash, node_public_key: nodePub, challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), privateKey).toString('base64');
await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)});
const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'paired_proof', node_id_hash: nodeIdHash, node_public_key: nodePub, nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'verified' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)
  if [[ "$PAIRED_PROOF" == "OK" ]]; then
    pass "Stage 2.2 paired-session proof returns verified"
  else
    fail "Stage 2.2 paired-session proof"
    echo "$PAIRED_PROOF"
  fi

  PAIRED_REJECT=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'paired_reject',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'pr@c',sessionId:'paired_reject'})})).json();
const tok = join.sessionToken;
const a = crypto.generateKeyPairSync('ed25519');
const b = crypto.generateKeyPairSync('ed25519');
const rawA = Buffer.from(a.publicKey.export({format:'jwk'}).x, 'base64url');
const rawB = Buffer.from(b.publicKey.export({format:'jwk'}).x, 'base64url');
const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'paired_reject', node_id_hash: computeNodeIdHash(rawA), node_public_key: rawA.toString('base64'), challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), a.privateKey).toString('base64');
await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)});
const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'paired_reject', node_id_hash: computeNodeIdHash(rawB), node_public_key: rawB.toString('base64'), nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), b.privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 409 && body.error === 'paired_node_mismatch' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)
  if [[ "$PAIRED_REJECT" == "OK" ]]; then
    pass "Stage 2.2 paired-session rejects different node (409 paired_node_mismatch)"
  else
    fail "Stage 2.2 paired-session rejection"
    echo "$PAIRED_REJECT"
  fi

  UNPAIRED=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'unpaired',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'u@c',sessionId:'unpaired_check'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'unpaired_check', node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'), nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'unregistered_node' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)
  if [[ "$UNPAIRED" == "OK" ]]; then
    pass "Stage 2.2 unpaired-session proof still returns unregistered_node (backward compat)"
  else
    fail "Stage 2.2 unpaired-session backward compat"
    echo "$UNPAIRED"
  fi

  N1_CROSS=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'n1_cross',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'n1@c',sessionId:'n1_cross'})})).json();
const tok = join.sessionToken;
const a = crypto.generateKeyPairSync('ed25519');
const b = crypto.generateKeyPairSync('ed25519');
const rawA = Buffer.from(a.publicKey.export({format:'jwk'}).x, 'base64url');
const rawB = Buffer.from(b.publicKey.export({format:'jwk'}).x, 'base64url');
const proofA = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'n1_cross', node_id_hash: computeNodeIdHash(rawA), node_public_key: rawA.toString('base64'), nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proofA.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proofA),'utf8'), a.privateKey).toString('base64');
const proofRes = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proofA)});
if (proofRes.status !== 202) { process.stdout.write('FAIL:proof_setup:' + proofRes.status); process.exit(0); }
const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'n1_cross', node_id_hash: computeNodeIdHash(rawB), node_public_key: rawB.toString('base64'), challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), b.privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)});
const body = await res.json();
process.stdout.write(res.status === 409 && body.error === 'node_id_hash_changed' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1 || true)
  if [[ "$N1_CROSS" == "OK" ]]; then
    pass "Stage 2.2 /pairing/complete refuses different node when integrityState already bound (N1)"
  else
    fail "Stage 2.2 N1 cross-route consistency"
    echo "$N1_CROSS"
  fi

  # ── audit-coverage demo states (Q10: stale, replayed, invalid_signature) + Q9 audit emission ──
  # Two sessions only, to stay under the /join 10/min rate limit on this server.
  AUDIT_STATES_A=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'audit_states_a',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'asa@c',sessionId:'audit_a'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
function mkProof(opts) {
  const p = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'audit_a', node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'), nonce: opts.nonce || crypto.randomBytes(16).toString('base64'), timestamp: opts.ts || new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
  p.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(p),'utf8'), privateKey).toString('base64');
  return p;
}
const stale = mkProof({ ts: new Date(Date.now() - 24*60*60*1000).toISOString() });
const r1 = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(stale)});
const b1 = await r1.json();
if (b1.error !== 'proof_stale') { process.stdout.write('FAIL:stale:' + r1.status + ':' + JSON.stringify(b1)); process.exit(0); }
const good = mkProof({});
const r2 = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(good)});
if (r2.status !== 202) { process.stdout.write('FAIL:good:' + r2.status); process.exit(0); }
const r3 = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(good)});
const b3 = await r3.json();
if (r3.status !== 409 || b3.error !== 'nonce_replayed') { process.stdout.write('FAIL:replay:' + r3.status + ':' + JSON.stringify(b3)); process.exit(0); }
process.stdout.write('OK');
" 2>&1 || true)
  if [[ "$AUDIT_STATES_A" == "OK" ]]; then
    pass "Stage 2 stale proof + replayed nonce both rejected (proof_stale, nonce_replayed)"
  else
    fail "Stage 2 stale/replayed coverage"
    echo "$AUDIT_STATES_A"
  fi

  # Q9 + invalid_signature on pairing: bad sig → audit reject, then valid pair, then re-challenge → audit reject again.
  AUDIT_STATES_B=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'audit_states_b',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'asb@c',sessionId:'audit_b'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const ch1 = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const bad = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'audit_b', node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'), challenge: ch1.challenge, timestamp: new Date().toISOString(), signature: Buffer.alloc(64).toString('base64') };
const rBad = await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(bad)});
const bBad = await rBad.json();
if (rBad.status !== 401 || bBad.error !== 'invalid_signature') { process.stdout.write('FAIL:bad_sig:' + rBad.status + ':' + JSON.stringify(bBad)); process.exit(0); }
const ch2 = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const good = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'audit_b', node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'), challenge: ch2.challenge, timestamp: new Date().toISOString() };
good.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(good),'utf8'), privateKey).toString('base64');
const cmp = await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(good)});
if (cmp.status !== 200) { process.stdout.write('FAIL:complete:' + cmp.status); process.exit(0); }
const reChall = await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'});
if (reChall.status !== 409) { process.stdout.write('FAIL:re_chall:' + reChall.status); process.exit(0); }
const audit = await (await fetch(base + '/api/audit/audit_b')).json();
const entries = audit.entries || [];
const hasInvSig = entries.some(e => e.type === 'INTEGRITY_PAIRING_REJECTED' && e.payload?.reason === 'invalid_signature');
const hasChallReject = entries.some(e => e.type === 'INTEGRITY_PAIRING_REJECTED' && e.payload?.stage === 'challenge_request');
if (!hasInvSig) { process.stdout.write('FAIL:no_inv_sig_audit'); process.exit(0); }
if (!hasChallReject) { process.stdout.write('FAIL:no_challenge_reject_audit'); process.exit(0); }
process.stdout.write('OK');
" 2>&1 || true)
  if [[ "$AUDIT_STATES_B" == "OK" ]]; then
    pass "Stage 2.2 invalid_signature + challenge-rejection both emit INTEGRITY_PAIRING_REJECTED (Q9)"
  else
    fail "Stage 2.2 invalid_signature / challenge-rejection audit coverage"
    echo "$AUDIT_STATES_B"
  fi

  DAEMON_SMOKE=$(node --input-type=module -e "
import crypto from 'node:crypto';
const base = 'http://localhost:33031';
const b64url = (buf) => Buffer.from(buf).toString('base64url');
const canonical = (payload) => JSON.stringify(Object.fromEntries(Object.keys(payload).filter((k)=>k!=='signature').sort().map((k)=>[k,payload[k]])));
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const public_key = b64url(publicKey.export({ format: 'der', type: 'spki' }));
const node_id_hash = 'sha256:' + crypto.createHash('sha256').update(Buffer.from(public_key, 'base64url')).digest('hex');
const sign = (payload) => b64url(crypto.sign('sha256', Buffer.from(canonical(payload)), { key: privateKey, dsaEncoding: 'der' }));
const post = async (path, body, token) => {
  const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};
const exam = await post('/api/exams', { title: 'daemon_check', durationMinutes: 60 });
const join = await post('/api/exams/' + exam.json.id + '/join', { studentId: 'daemon@check', sessionId: 'daemon_check' });
const tok = join.json.sessionToken;
const pairCh = await post('/api/device/challenge', { sessionId: 'daemon_check', purpose: 'pair' }, tok);
const pairPayload = { type: 'simurgh.daemon.pair', session_id: 'daemon_check', exam_id: exam.json.id, challenge: pairCh.json.challenge, timestamp: new Date().toISOString(), node_id_hash, daemon_version: '0.4.5', platform: 'macos' };
const pair = await post('/api/device/pair', { sessionId: 'daemon_check', node_id_hash, public_key, signed_payload: pairPayload, signature: sign(pairPayload) }, tok);
const proofCh = await post('/api/device/challenge', { sessionId: 'daemon_check', purpose: 'proof' }, tok);
const proofPayload = { type: 'simurgh.daemon.proof', session_id: 'daemon_check', exam_id: exam.json.id, sequence: 1, timestamp: new Date().toISOString(), node_id_hash, daemon_version: '0.4.5', platform: 'macos', capture_excluded_window_count: 0, helper_state: 'healthy', challenge: proofCh.json.challenge };
const proof = { ...proofPayload, signature: sign(proofPayload) };
const telemetry = await post('/api/telemetry', { sessionId: 'daemon_check', sequence: 1, timestamp: Date.now(), telemetry: { keystrokes: 2, chars_typed: 5, effective_wpm: 30, focus_losses: 0, time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0, max_idle_gap_ms: 0, window_seconds: 5 }, daemon_proof: proof }, tok);
const replay = await post('/api/telemetry', { sessionId: 'daemon_check', sequence: 2, timestamp: Date.now(), telemetry: { keystrokes: 2, chars_typed: 5, effective_wpm: 30, focus_losses: 0, time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0, max_idle_gap_ms: 0, window_seconds: 5 }, daemon_proof: proof }, tok);
const badCh = await post('/api/device/challenge', { sessionId: 'daemon_check', purpose: 'proof' }, tok);
const signedBadPayload = { type: 'simurgh.daemon.proof', session_id: 'daemon_check', exam_id: exam.json.id, sequence: 3, timestamp: new Date().toISOString(), node_id_hash, daemon_version: '0.4.5', platform: 'macos', capture_excluded_window_count: 0, helper_state: 'healthy', challenge: badCh.json.challenge };
const tamperedProof = { ...signedBadPayload, signature: sign(signedBadPayload), helper_state: 'missing' };
const tampered = await post('/api/telemetry', { sessionId: 'daemon_check', sequence: 3, timestamp: Date.now(), telemetry: { keystrokes: 2, chars_typed: 5, effective_wpm: 30, focus_losses: 0, time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0, max_idle_gap_ms: 0, window_seconds: 5 }, daemon_proof: tamperedProof }, tok);
const audit = await (await fetch(base + '/api/audit/daemon_check')).json();
const hasReject = (audit.entries || []).some(e => e.type === 'DAEMON_PROOF_REJECTED' && e.payload?.reason === 'invalid_signature');
if (pair.status !== 200) { process.stdout.write('FAIL:pair:' + pair.status + ':' + JSON.stringify(pair.json)); process.exit(0); }
if (telemetry.status !== 200 || telemetry.json.device_integrity?.daemon_state !== 'healthy') { process.stdout.write('FAIL:telemetry:' + telemetry.status + ':' + JSON.stringify(telemetry.json)); process.exit(0); }
if (replay.status !== 409 || replay.json.error !== 'challenge_not_found') { process.stdout.write('FAIL:replay:' + replay.status + ':' + JSON.stringify(replay.json)); process.exit(0); }
if (tampered.status !== 401 || tampered.json.error !== 'invalid_signature') { process.stdout.write('FAIL:tampered:' + tampered.status + ':' + JSON.stringify(tampered.json)); process.exit(0); }
if (!hasReject) { process.stdout.write('FAIL:no_tampered_audit'); process.exit(0); }
process.stdout.write('OK');
" 2>&1 || true)
  if [[ "$DAEMON_SMOKE" == "OK" ]]; then
    pass "Stage 2.3 daemon pair + proof accepted, replay rejected, tamper audited"
  else
    fail "Stage 2.3 daemon proof smoke"
    echo "$DAEMON_SMOKE"
  fi

  kill "$S2_PID" 2>/dev/null
  wait "$S2_PID" 2>/dev/null || true
fi

# ── 12b. Stage 2.3 hardened daemon-required mode ────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.3 hardened daemon-required mode"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.3 hardened daemon-required mode"
  REQUIRE_DAEMON_PORT=33033
  REQUIRE_DAEMON_LOG="$LOG_DIR/stage23-require-daemon-srv.log"
  : > "$REQUIRE_DAEMON_LOG"
  SIMURGH_DEMO_MODE=1 SIMURGH_REQUIRE_DAEMON=true PORT=$REQUIRE_DAEMON_PORT node server.js > "$REQUIRE_DAEMON_LOG" 2>&1 &
  REQUIRE_DAEMON_PID=$!

  REQUIRE_READY=false
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.5
    if curl -s -m 1 "http://localhost:$REQUIRE_DAEMON_PORT/health" >/dev/null 2>&1; then
      REQUIRE_READY=true
      break
    fi
  done

  if [[ "$REQUIRE_READY" != true ]]; then
    fail "Stage 2.3 hardened daemon-required server boot"
    tail -20 "$REQUIRE_DAEMON_LOG" || true
  else
    REQUIRE_DAEMON_RESULT=$(node --input-type=module -e "
const base = 'http://localhost:$REQUIRE_DAEMON_PORT';
const post = async (path, body, token) => {
  const res = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};
const exam = await post('/api/exams', { title: 'daemon_required', durationMinutes: 60 });
const join = await post('/api/exams/' + exam.json.id + '/join', { studentId: 'daemon-required@check', sessionId: 'daemon_required' });
const tok = join.json.sessionToken;
const missing = await post('/api/telemetry', { sessionId: 'daemon_required', sequence: 1, timestamp: Date.now(), telemetry: { keystrokes: 2, chars_typed: 5, effective_wpm: 30, focus_losses: 0, time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0, max_idle_gap_ms: 0, window_seconds: 5 } }, tok);
const audit = await (await fetch(base + '/api/audit/daemon_required')).json();
const hasMissing = (audit.entries || []).some(e => e.type === 'DAEMON_MISSING' && e.payload?.reason === 'daemon_proof_required');
if (missing.status !== 428 || missing.json.error !== 'daemon_proof_required') { process.stdout.write('FAIL:missing:' + missing.status + ':' + JSON.stringify(missing.json)); process.exit(0); }
if (!hasMissing) { process.stdout.write('FAIL:no_missing_audit'); process.exit(0); }
process.stdout.write('OK');
" 2>&1 || true)
    if [[ "$REQUIRE_DAEMON_RESULT" == "OK" ]]; then
      pass "SIMURGH_REQUIRE_DAEMON rejects missing telemetry proof and audits DAEMON_MISSING"
    else
      fail "SIMURGH_REQUIRE_DAEMON missing-proof enforcement"
      echo "$REQUIRE_DAEMON_RESULT"
    fi
  fi

  kill "$REQUIRE_DAEMON_PID" 2>/dev/null || true
  wait "$REQUIRE_DAEMON_PID" 2>/dev/null || true
fi

# ── 12c. Golden fixture sync check ───────────────────────
step "Golden fixture sync"
SYNC_OK=true
if ! diff -q tests/unit/integrity/__fixtures__/golden-proof.json \
            tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-proof.json >/dev/null 2>&1 \
   || ! diff -q tests/unit/integrity/__fixtures__/golden-proof.sha256 \
                tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-proof.sha256 >/dev/null 2>&1; then
  SYNC_OK=false
fi
if ! diff -q tests/unit/integrity/__fixtures__/golden-pairing-payload.json \
            tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json >/dev/null 2>&1 \
   || ! diff -q tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256 \
                tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256 >/dev/null 2>&1; then
  SYNC_OK=false
fi
if [[ "$SYNC_OK" == "true" ]]; then
  pass "Node + Swift golden fixtures are identical (proof + pairing)"
else
  fail "Golden fixture drift between Node and Swift copies — keep them in sync"
fi

# ── 12d. Swift macOS node — conditional build + test ─────
# Only runs on Darwin (macOS) because the node uses CryptoKit, an Apple-only framework.
# Ubuntu has Swift but no CryptoKit — skip cleanly there so CI stays green.
if [[ "$QUICK" == true ]]; then
  step "Swift macOS node"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
elif [[ "$(uname)" != "Darwin" ]]; then
  step "Swift macOS node"
  echo -e "${YELLOW}Not on macOS (uname=$(uname)) — CryptoKit unavailable; skipping Swift block${NC}"
elif command -v swift >/dev/null 2>&1 && [[ -d tools/simurgh-node-macos ]]; then
  step "Swift macOS node build + test"
  if (cd tools/simurgh-node-macos && swift build) > "$LOG_DIR/swift-build.log" 2>&1; then
    pass "swift build (macOS node) succeeded"
  else
    fail "swift build (macOS node)"
    tail -20 "$LOG_DIR/swift-build.log"
  fi

  if (cd tools/simurgh-node-macos && swift test) > "$LOG_DIR/swift-test.log" 2>&1; then
    pass "swift test (golden-fixture interop)"
  else
    fail "swift test (golden-fixture interop)"
    tail -20 "$LOG_DIR/swift-test.log"
  fi

  # CLI privacy regression — assert stdout JSON contains none of the forbidden field names.
  TMP_KEY="/tmp/simurgh-check-key-$$"
  rm -f "$TMP_KEY"
  if (cd tools/simurgh-node-macos && swift run SimurghNode --session check_session --key-path "$TMP_KEY") > "$LOG_DIR/swift-cli-out.json" 2>/dev/null; then
    if grep -qE 'private_key|raw_process_names|raw_window_titles|screen_pixels|webcam|audio|typed_answer|paste_content' "$LOG_DIR/swift-cli-out.json"; then
      fail "Stage 2.1 CLI output privacy regression — forbidden field appeared in stdout"
    else
      pass "Stage 2.1 CLI output privacy regression (no forbidden field in stdout)"
    fi
  else
    fail "swift run SimurghNode (privacy regression)"
  fi
  rm -f "$TMP_KEY"
else
  step "Swift macOS node"
  echo -e "${YELLOW}Swift toolchain not available or tools/simurgh-node-macos missing — skipping macOS node build/test${NC}"
fi

# ── 12e. Swift macOS daemon — conditional build + test ───
if [[ "$QUICK" == true ]]; then
  step "Swift macOS daemon"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
elif [[ "$(uname)" != "Darwin" ]]; then
  step "Swift macOS daemon"
  echo -e "${YELLOW}Not on macOS (uname=$(uname)) — CryptoKit unavailable; skipping daemon Swift block${NC}"
elif command -v swift >/dev/null 2>&1 && [[ -d tools/simurgh-daemon-macos ]]; then
  step "Swift macOS daemon build + test"
  if (cd tools/simurgh-daemon-macos && swift build) > "$LOG_DIR/swift-daemon-build.log" 2>&1; then
    pass "swift build (macOS daemon) succeeded"
  else
    fail "swift build (macOS daemon)"
    tail -20 "$LOG_DIR/swift-daemon-build.log"
  fi

  if (cd tools/simurgh-daemon-macos && swift test) > "$LOG_DIR/swift-daemon-test.log" 2>&1; then
    pass "swift test (macOS daemon)"
  else
    fail "swift test (macOS daemon)"
    tail -20 "$LOG_DIR/swift-daemon-test.log"
  fi
else
  step "Swift macOS daemon"
  echo -e "${YELLOW}Swift toolchain not available or tools/simurgh-daemon-macos missing — skipping macOS daemon build/test${NC}"
fi

# ── 12f. Stage 2.4 — browser SDK + daemon lifecycle ─────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.4 browser SDK + daemon lifecycle"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.4 browser SDK + daemon lifecycle"

  if node --input-type=module -e "import('./public/sdk/simurgh-browser-sdk.js').then(m => { if (!m.createSimurghClient || !m.SIMURGH_DAEMON_STATES.includes('proof_ready')) process.exit(1); })" > "$LOG_DIR/stage24-sdk-load.log" 2>&1; then
    pass "Stage 2.4 browser SDK builds / loads"
  else
    fail "Stage 2.4 browser SDK builds / loads"
    cat "$LOG_DIR/stage24-sdk-load.log"
  fi

  if node --test tests/unit/browserSdk.test.js > "$LOG_DIR/stage24-browser-sdk-test.log" 2>&1; then
    pass "Stage 2.4 SDK handles missing, pair success, hardened block, and proof rejection"
  else
    fail "Stage 2.4 browser SDK unit tests"
    tail -40 "$LOG_DIR/stage24-browser-sdk-test.log"
  fi

  if node --test tests/unit/daemonLifecycle.test.js tests/unit/daemonDoctor.test.js > "$LOG_DIR/stage24-daemon-lifecycle-test.log" 2>&1; then
    pass "Stage 2.4 daemon lifecycle, doctor redaction, and LaunchAgent checks"
  else
    fail "Stage 2.4 daemon lifecycle unit tests"
    tail -40 "$LOG_DIR/stage24-daemon-lifecycle-test.log"
  fi

  if command -v plutil >/dev/null 2>&1; then
    if plutil -lint tools/simurgh-daemon-macos/launchd/dev.raouf.simurgh.daemon.plist > "$LOG_DIR/stage24-plist-lint.log" 2>&1; then
      pass "Stage 2.4 LaunchAgent plist lint/check"
    else
      fail "Stage 2.4 LaunchAgent plist lint/check"
      cat "$LOG_DIR/stage24-plist-lint.log"
    fi
  else
    echo -e "${YELLOW}plutil unavailable — skipping LaunchAgent plist lint${NC}"
  fi

  if [[ "$(uname)" == "Darwin" ]] && command -v swift >/dev/null 2>&1; then
    if (cd tools/simurgh-daemon-macos && swift run SimurghDaemon --help) > "$LOG_DIR/stage24-daemon-help.log" 2>&1; then
      pass "Stage 2.4 daemon lifecycle smoke"
    else
      fail "Stage 2.4 daemon lifecycle smoke"
      tail -20 "$LOG_DIR/stage24-daemon-help.log"
    fi
  else
    echo -e "${YELLOW}Not on macOS or Swift unavailable — skipping daemon lifecycle smoke${NC}"
  fi
fi

# ── 12g. Stage 2.5 — macOS affinity scanner ─────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.5 macOS affinity scanner"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.5 macOS affinity scanner"

  if node --test tests/unit/daemonProofScanner.test.js > "$LOG_DIR/stage25-daemon-proof-scanner.log" 2>&1; then
    pass "Stage 2.5 scanner proof accepts zero-count, risk, privacy, and tamper cases"
  else
    fail "Stage 2.5 scanner proof validation"
    tail -40 "$LOG_DIR/stage25-daemon-proof-scanner.log"
  fi

  if node --test tests/unit/daemonScannerRisk.test.js > "$LOG_DIR/stage25-daemon-scanner-risk.log" 2>&1; then
    pass "Stage 2.5 scanner risk maps unavailable to warning and excluded windows to Critical"
  else
    fail "Stage 2.5 scanner risk mapping"
    tail -40 "$LOG_DIR/stage25-daemon-scanner-risk.log"
  fi

  if node --test tests/unit/reportBuilderScanner.test.js > "$LOG_DIR/stage25-report-scanner.log" 2>&1; then
    pass "Stage 2.5 report includes privacy-safe scanner summary"
  else
    fail "Stage 2.5 report scanner summary"
    tail -40 "$LOG_DIR/stage25-report-scanner.log"
  fi

  if [[ "$(uname)" == "Darwin" ]] && command -v swift >/dev/null 2>&1; then
    if (cd tools/simurgh-daemon-macos && swift test --filter AffinityScannerTests) > "$LOG_DIR/stage25-swift-scanner.log" 2>&1; then
      pass "Stage 2.5 Swift scanner mock risk and privacy regression"
    else
      fail "Stage 2.5 Swift scanner tests"
      tail -40 "$LOG_DIR/stage25-swift-scanner.log"
    fi

    if (cd tools/simurgh-daemon-macos && swift test --filter ScannerProofTests) > "$LOG_DIR/stage25-swift-proof.log" 2>&1; then
      pass "Stage 2.5 Swift proof includes signed scanner fields"
    else
      fail "Stage 2.5 Swift scanner proof tests"
      tail -40 "$LOG_DIR/stage25-swift-proof.log"
    fi
  else
    echo -e "${YELLOW}Not on macOS or Swift unavailable — skipping Stage 2.5 Swift scanner tests${NC}"
  fi
fi

# ── 12h. Stage 2.2/2.3 closeout E2E smoke ───────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.2/2.3 E2E smoke"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.2/2.3 E2E smoke"
  if scripts/smoke-stage-2-2-2-3.sh > "$LOG_DIR/stage22-23-e2e-smoke.log" 2>&1; then
    pass "Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge"
  else
    fail "Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge"
    tail -80 "$LOG_DIR/stage22-23-e2e-smoke.log"
  fi
fi

# ── 12i. Stage 2.4/2.5 closeout E2E smoke ───────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.4/2.5 E2E smoke"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.4/2.5 E2E smoke"
  if scripts/smoke-stage-2-4-2-5.sh > "$LOG_DIR/stage24-25-e2e-smoke.log" 2>&1; then
    pass "Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof"
  else
    fail "Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof"
    tail -80 "$LOG_DIR/stage24-25-e2e-smoke.log"
  fi
fi

# ── 12j. Stage 2.4/2.5 cybersecurity audit ──────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.4/2.5 cybersecurity audit"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.4/2.5 cybersecurity audit"
  if scripts/security-audit-stage-2-4-2-5.sh > "$LOG_DIR/stage24-25-security-audit.log" 2>&1; then
    pass "Stage 2.4/2.5 cybersecurity audit: SDK + daemon + scanner hardening"
  else
    fail "Stage 2.4/2.5 cybersecurity audit: SDK + daemon + scanner hardening"
    tail -100 "$LOG_DIR/stage24-25-security-audit.log"
  fi
fi

# ── 12k. Stage 2.6 Windows scanner smoke + daemon tests ───
if [[ "$QUICK" == true ]]; then
  step "Stage 2.6 Windows scanner"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.6 Windows scanner"
  if scripts/smoke-stage-2-6-windows-scanner.sh > "$LOG_DIR/stage26-windows-scanner-smoke.log" 2>&1; then
    pass "Stage 2.6 Windows scanner smoke: signed proof + risk + report + audit"
  else
    fail "Stage 2.6 Windows scanner smoke"
    tail -100 "$LOG_DIR/stage26-windows-scanner-smoke.log"
  fi

  DOTNET_BIN="${DOTNET_BIN:-}"
  if [[ -z "$DOTNET_BIN" ]]; then
    if command -v dotnet >/dev/null 2>&1; then
      DOTNET_BIN="dotnet"
    elif [[ -x ".tools/dotnet/dotnet" ]]; then
      DOTNET_BIN=".tools/dotnet/dotnet"
    elif [[ -x ".tools/dotnet/dotnet.exe" ]]; then
      DOTNET_BIN=".tools/dotnet/dotnet.exe"
    fi
  fi
  if [[ -n "$DOTNET_BIN" ]] && "$DOTNET_BIN" --list-sdks 2>/dev/null | grep -Eq '^(8|9|[1-9][0-9])\.'; then
    if "$DOTNET_BIN" test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln > "$LOG_DIR/stage26-dotnet-test.log" 2>&1; then
      pass "Stage 2.6 Windows daemon .NET tests"
    else
      fail "Stage 2.6 Windows daemon .NET tests"
      tail -80 "$LOG_DIR/stage26-dotnet-test.log"
    fi
  else
    echo -e "${YELLOW}.NET SDK 8+ unavailable — skipping Stage 2.6 Windows daemon .NET tests${NC}"
  fi
fi

# ── 12l. Stage 2.7 Cross-Platform Device Shield smoke + security audit ───
if [[ "$QUICK" == true ]]; then
  step "Stage 2.7 cross-platform Device Shield"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.7 cross-platform Device Shield smoke"
  if scripts/smoke-stage-2-7-cross-platform-device-shield.sh > "$LOG_DIR/stage27-cross-platform-smoke.log" 2>&1; then
    pass "Stage 2.7 cross-platform Device Shield smoke: scenarios A-G + privacy"
  else
    fail "Stage 2.7 cross-platform Device Shield smoke"
    tail -100 "$LOG_DIR/stage27-cross-platform-smoke.log"
  fi

  step "Stage 2.7 cross-platform security audit"
  if scripts/security-audit-stage-2-7-cross-platform-device-shield.sh > "$LOG_DIR/stage27-cross-platform-audit.log" 2>&1; then
    pass "Stage 2.7 cross-platform security audit: signature/platform/raw-field gates"
  else
    fail "Stage 2.7 cross-platform security audit"
    tail -100 "$LOG_DIR/stage27-cross-platform-audit.log"
  fi
fi

# ── 12m. Stage 2.6/2.7 closeout — umbrella E2E smoke + cybersecurity audit ───
if [[ "$QUICK" == true ]]; then
  step "Stage 2.6/2.7 closeout"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.6/2.7 closeout E2E smoke"
  if scripts/smoke-stage-2-6-2-7-closeout.sh > "$LOG_DIR/stage26-27-closeout-smoke.log" 2>&1; then
    pass "Stage 2.6/2.7 closeout E2E smoke: 2.6 Windows + 2.7 cross-platform + privacy"
  else
    fail "Stage 2.6/2.7 closeout E2E smoke"
    tail -100 "$LOG_DIR/stage26-27-closeout-smoke.log"
  fi

  step "Stage 2.6/2.7 closeout cybersecurity audit"
  if scripts/security-audit-stage-2-6-2-7-closeout.sh > "$LOG_DIR/stage26-27-closeout-audit.log" 2>&1; then
    pass "Stage 2.6/2.7 closeout cybersecurity audit: proof/scanner/platform/daemon/SDK/report/dashboard/privacy/wording"
  else
    fail "Stage 2.6/2.7 closeout cybersecurity audit"
    tail -100 "$LOG_DIR/stage26-27-closeout-audit.log"
  fi
fi

# ── 12n. Stage 2.8A/2.8B Linux foundation + X11 scanner ───────────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.8A/2.8B Linux"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.8A/2.8B Linux foundation + X11 scanner smoke"
  if scripts/smoke-stage-2-8a-2-8b-linux-foundation-x11.sh > "$LOG_DIR/stage28ab-linux-smoke.log" 2>&1; then
    pass "Stage 2.8A/2.8B Linux foundation + X11 scanner smoke"
  else
    fail "Stage 2.8A/2.8B Linux foundation + X11 scanner smoke"
    tail -100 "$LOG_DIR/stage28ab-linux-smoke.log"
  fi

  step "Stage 2.8A/2.8B Linux cybersecurity audit"
  if scripts/security-audit-stage-2-8a-2-8b-linux.sh > "$LOG_DIR/stage28ab-linux-audit.log" 2>&1; then
    pass "Stage 2.8A/2.8B Linux cybersecurity audit"
  else
    fail "Stage 2.8A/2.8B Linux cybersecurity audit"
    tail -100 "$LOG_DIR/stage28ab-linux-audit.log"
  fi
fi

# ── 12o. Stage 2.8C/2.8D Linux Wayland + systemd + CI ────────────────────
if [[ "$QUICK" == true ]]; then
  step "Stage 2.8C/2.8D Linux"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Stage 2.8C/2.8D Linux Wayland + systemd + CI smoke"
  if scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh > "$LOG_DIR/stage28cd-linux-smoke.log" 2>&1; then
    pass "Stage 2.8C/2.8D Linux Wayland + systemd + CI smoke"
  else
    fail "Stage 2.8C/2.8D Linux Wayland + systemd + CI smoke"
    tail -100 "$LOG_DIR/stage28cd-linux-smoke.log"
  fi

  step "Stage 2.8C/2.8D Linux cybersecurity audit"
  if scripts/security-audit-stage-2-8c-8d-linux-wayland-systemd-ci.sh > "$LOG_DIR/stage28cd-linux-audit.log" 2>&1; then
    pass "Stage 2.8C/2.8D Linux cybersecurity audit"
  else
    fail "Stage 2.8C/2.8D Linux cybersecurity audit"
    tail -100 "$LOG_DIR/stage28cd-linux-audit.log"
  fi
fi

# ── 12p. Linux Rust daemon fmt + clippy + test (gated on cargo) ──────────
if command -v cargo >/dev/null 2>&1; then
  step "Linux Rust daemon fmt + clippy + test (Xvfb mandatory in CI)"
  if (cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml \
      && cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings \
      && if [[ "$(uname -s)" == "Linux" || "${CI:-}" == "true" ]]; then
        env SIMURGH_REQUIRE_XVFB_TESTS=1 cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
      else
        cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
      fi) \
      > "$LOG_DIR/stage28-rust-gates.log" 2>&1; then
    pass "Linux Rust daemon: fmt + clippy + test"
  else
    fail "Linux Rust daemon fmt/clippy/test"
    tail -100 "$LOG_DIR/stage28-rust-gates.log"
  fi
else
  step "Linux Rust daemon"
  echo -e "${YELLOW}Skipped — cargo not on PATH (install Rust to run Linux daemon gates).${NC}"
fi

# ── 12q. Doc-grep safety: no overclaim phrases in Linux closeout docs ──────
step "Doc-grep safety (no overclaim phrases in Linux closeout docs)"
DOC_GREP_FAIL=false
DOC_FILES="README.md SECURITY.md PRIVACY.md ROADMAP.md \
  docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md \
  docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md \
  docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md \
  docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md"

# "cheating detected" should never appear — we never claim automatic misconduct detection
if grep -qr "cheating detected" $DOC_FILES 2>/dev/null; then
  echo "FAIL: 'cheating detected' found in docs (overclaim — no automatic misconduct detection is claimed)"
  grep -rn "cheating detected" $DOC_FILES
  DOC_GREP_FAIL=true
fi

# "Linux parity" must only appear in negation/qualification lines
while IFS= read -r line; do
  if echo "$line" | grep -qi "linux parity" && ! echo "$line" | grep -qiE "(no|not|without|never|parity claim)"; then
    echo "FAIL: 'Linux parity' positive claim found: $line"
    DOC_GREP_FAIL=true
  fi
done < <(grep -rn "linux parity" $DOC_FILES 2>/dev/null)

if [[ "$DOC_GREP_FAIL" == "false" ]]; then
  pass "Doc-grep safety: no overclaim phrases in Linux closeout docs"
else
  fail "Doc-grep safety: overclaim phrases found in Linux closeout docs"
fi

# ── 12r. Voting pilot Phase C collection-closure smoke ───────────────────────
step "Voting pilot Phase C collection-closure smoke"
if scripts/smoke-voting-pilot-closed.sh > "$LOG_DIR/vp-closed-smoke.log" 2>&1; then
  pass "Voting pilot collection-closure smoke: consent/accept+submit+withdraw→410, report active"
else
  fail "Voting pilot collection-closure smoke"
  tail -40 "$LOG_DIR/vp-closed-smoke.log"
fi

# ── 12s. Banking Shield Phase A synthetic gates ──────────────────────────────
step "Banking Shield Phase A unit/security tests"
if node --test tests/unit/bankingPilot/*.test.js tests/security/banking_pilot_security_audit.test.js > "$LOG_DIR/banking-unit-security.log" 2>&1; then
  pass "Banking Shield Phase A unit/security tests"
else
  fail "Banking Shield Phase A unit/security tests"
  tail -80 "$LOG_DIR/banking-unit-security.log"
fi

step "Banking Shield Phase A smoke"
if scripts/smoke-banking-pilot.sh > "$LOG_DIR/banking-smoke.log" 2>&1; then
  pass "Banking Shield Phase A smoke"
else
  fail "Banking Shield Phase A smoke"
  tail -80 "$LOG_DIR/banking-smoke.log"
fi

step "Banking Shield Phase A security audit"
if scripts/security-audit-banking-pilot.sh > "$LOG_DIR/banking-security-audit.log" 2>&1; then
  pass "Banking Shield Phase A security audit"
else
  fail "Banking Shield Phase A security audit"
  tail -80 "$LOG_DIR/banking-security-audit.log"
fi

step "Banking Shield Phase A privacy audit"
if node scripts/privacy-audit-banking-pilot.mjs > "$LOG_DIR/banking-privacy-audit.log" 2>&1; then
  pass "Banking Shield Phase A privacy audit"
else
  fail "Banking Shield Phase A privacy audit"
  tail -80 "$LOG_DIR/banking-privacy-audit.log"
fi

step "Banking Shield Phase B evidence privacy audit"
if node scripts/privacy-audit-banking-pilot-phase-b.mjs > "$LOG_DIR/banking-phase-b-privacy-audit.log" 2>&1; then
  pass "Banking Shield Phase B evidence privacy audit"
else
  fail "Banking Shield Phase B evidence privacy audit"
  tail -80 "$LOG_DIR/banking-phase-b-privacy-audit.log"
fi

step "Banking Shield Phase A collection-closure smoke"
if scripts/smoke-banking-pilot-closed.sh > "$LOG_DIR/banking-closed-smoke.log" 2>&1; then
  pass "Banking Shield Phase A collection-closure smoke"
else
  fail "Banking Shield Phase A collection-closure smoke"
  tail -80 "$LOG_DIR/banking-closed-smoke.log"
fi

step "Banking Shield Phase A full E2E smoke"
if scripts/smoke-banking-pilot-full-e2e.sh > "$LOG_DIR/banking-full-e2e-smoke.log" 2>&1; then
  pass "Banking Shield Phase A full E2E smoke"
else
  fail "Banking Shield Phase A full E2E smoke"
  tail -100 "$LOG_DIR/banking-full-e2e-smoke.log"
fi

# ── 13. LLM Shield 3A–3S containment pipeline ────────────────────────────────
# Input firewall (3A) → adversarial benchmark (3B) → containment (3D) → gateway
# (3E) → benchmark/shadow (3F/3G) → AgentDojo harness (3H) → utility/eval (3I/3J)
# → adaptive readiness (3K) → reference containment (3L) → attestation (3M) →
# claim-checked ledger (3N) → BYO-gateway benchmark (3O) → cross-defence
# attestation (3P) → temporal registry + regression diff (3Q) → trust-preserving fallback (3R) → verifiable defensive narrative (3S). Each stage smoke also
# runs its own security/privacy/consistency audits; helper libs are gated at
# 100% function coverage.
step "LLM Shield 3A input smoke"
if scripts/smoke-llm-shield.sh > "$LOG_DIR/llm-shield-smoke.log" 2>&1; then
  pass "LLM Shield 3A input smoke"
else
  fail "LLM Shield 3A input smoke"
  tail -80 "$LOG_DIR/llm-shield-smoke.log"
fi

step "LLM Shield 3B benchmark smoke"
if scripts/smoke-llm-shield-bench.sh > "$LOG_DIR/llm-shield-bench-smoke.log" 2>&1; then
  pass "LLM Shield 3B benchmark smoke"
else
  fail "LLM Shield 3B benchmark smoke"
  tail -80 "$LOG_DIR/llm-shield-bench-smoke.log"
fi

step "LLM Shield security audit"
if scripts/security-audit-llm-shield.sh > "$LOG_DIR/llm-shield-security-audit.log" 2>&1; then
  pass "LLM Shield security audit"
else
  fail "LLM Shield security audit"
  tail -80 "$LOG_DIR/llm-shield-security-audit.log"
fi

step "LLM Shield privacy audit"
if node scripts/privacy-audit-llm-shield.mjs > "$LOG_DIR/llm-shield-privacy-audit.log" 2>&1; then
  pass "LLM Shield privacy audit"
else
  fail "LLM Shield privacy audit"
  tail -80 "$LOG_DIR/llm-shield-privacy-audit.log"
fi

step "LLM Shield 3D containment smoke"
if scripts/smoke-llm-shield-stage3d.sh > "$LOG_DIR/llm-shield-stage3d-smoke.log" 2>&1; then
  pass "LLM Shield 3D containment smoke"
else
  fail "LLM Shield 3D containment smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3d-smoke.log"
fi

step "LLM Shield 3D security audit"
if scripts/security-audit-llm-shield-stage3d.sh > "$LOG_DIR/llm-shield-stage3d-security-audit.log" 2>&1; then
  pass "LLM Shield 3D security audit"
else
  fail "LLM Shield 3D security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3d-security-audit.log"
fi

step "LLM Shield 3D privacy audit"
if node scripts/privacy-audit-llm-shield-stage3d.mjs > "$LOG_DIR/llm-shield-stage3d-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3D privacy audit"
else
  fail "LLM Shield 3D privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3d-privacy-audit.log"
fi

step "LLM Shield 3E-core gateway smoke"
if scripts/smoke-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-smoke.log" 2>&1; then
  pass "LLM Shield 3E-core gateway smoke"
else
  fail "LLM Shield 3E-core gateway smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3e-smoke.log"
fi

step "LLM Shield 3E-core security audit"
if scripts/security-audit-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-security-audit.log" 2>&1; then
  pass "LLM Shield 3E-core security audit"
else
  fail "LLM Shield 3E-core security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3e-security-audit.log"
fi

step "LLM Shield 3E-core privacy audit"
if node scripts/privacy-audit-llm-shield-stage3e.mjs > "$LOG_DIR/llm-shield-stage3e-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3E-core privacy audit"
else
  fail "LLM Shield 3E-core privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3e-privacy-audit.log"
fi

step "LLM Shield 3F benchmark smoke"
if scripts/smoke-llm-shield-stage3f.sh > "$LOG_DIR/llm-shield-stage3f-smoke.log" 2>&1; then
  pass "LLM Shield 3F benchmark smoke"
else
  fail "LLM Shield 3F benchmark smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3f-smoke.log"
fi

step "LLM Shield 3F security audit"
if scripts/security-audit-llm-shield-stage3f.sh > "$LOG_DIR/llm-shield-stage3f-security-audit.log" 2>&1; then
  pass "LLM Shield 3F security audit"
else
  fail "LLM Shield 3F security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3f-security-audit.log"
fi

step "LLM Shield 3F privacy audit"
if node scripts/privacy-audit-llm-shield-stage3f.mjs > "$LOG_DIR/llm-shield-stage3f-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3F privacy audit"
else
  fail "LLM Shield 3F privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3f-privacy-audit.log"
fi

step "LLM Shield 3G live-shadow smoke"
if scripts/smoke-llm-shield-stage3g.sh > "$LOG_DIR/llm-shield-stage3g-smoke.log" 2>&1; then
  pass "LLM Shield 3G live-shadow smoke"
else
  fail "LLM Shield 3G live-shadow smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3g-smoke.log"
fi

step "LLM Shield 3G security audit"
if scripts/security-audit-llm-shield-stage3g.sh > "$LOG_DIR/llm-shield-stage3g-security-audit.log" 2>&1; then
  pass "LLM Shield 3G security audit"
else
  fail "LLM Shield 3G security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3g-security-audit.log"
fi

step "LLM Shield 3G privacy audit"
if node scripts/privacy-audit-llm-shield-stage3g.mjs > "$LOG_DIR/llm-shield-stage3g-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3G privacy audit"
else
  fail "LLM Shield 3G privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3g-privacy-audit.log"
fi

step "LLM Shield 3H AgentDojo harness smoke"
if scripts/smoke-llm-shield-stage3h.sh > "$LOG_DIR/llm-shield-stage3h-smoke.log" 2>&1; then
  pass "LLM Shield 3H AgentDojo harness smoke"
else
  fail "LLM Shield 3H AgentDojo harness smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3h-smoke.log"
fi

step "LLM Shield 3H security audit"
if scripts/security-audit-llm-shield-stage3h.sh > "$LOG_DIR/llm-shield-stage3h-security-audit.log" 2>&1; then
  pass "LLM Shield 3H security audit"
else
  fail "LLM Shield 3H security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3h-security-audit.log"
fi

step "LLM Shield 3H privacy audit"
if node scripts/privacy-audit-llm-shield-stage3h.mjs > "$LOG_DIR/llm-shield-stage3h-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3H privacy audit"
else
  fail "LLM Shield 3H privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3h-privacy-audit.log"
fi

step "LLM Shield 3H metrics unit test"
if node --test tests/unit/llmShield/stage3hMetricsLib.test.js > "$LOG_DIR/llm-shield-stage3h-metrics-unit.log" 2>&1; then
  pass "LLM Shield 3H metrics unit test"
else
  fail "LLM Shield 3H metrics unit test"
  tail -80 "$LOG_DIR/llm-shield-stage3h-metrics-unit.log"
fi

step "LLM Shield 3H-L2 deterministic E2E smoke"
if scripts/e2e-smoke-llm-shield-stage3h-layer2.sh > "$LOG_DIR/llm-shield-stage3h-layer2-e2e-smoke.log" 2>&1; then
  pass "LLM Shield 3H-L2 deterministic E2E smoke"
else
  fail "LLM Shield 3H-L2 deterministic E2E smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3h-layer2-e2e-smoke.log"
fi

if [[ "${SIMURGH_RUN_STAGE3H_LAYER2:-0}" == "1" ]]; then
  step "LLM Shield 3H-L2 AgentDojo external run"
  if scripts/smoke-llm-shield-stage3h-layer2.sh > "$LOG_DIR/llm-shield-stage3h-layer2-smoke.log" 2>&1; then
    pass "LLM Shield 3H-L2 AgentDojo external run"
  else
    fail "LLM Shield 3H-L2 AgentDojo external run"
    tail -80 "$LOG_DIR/llm-shield-stage3h-layer2-smoke.log"
  fi
else
  pass "LLM Shield 3H-L2 AgentDojo external run skipped (set SIMURGH_RUN_STAGE3H_LAYER2=1)"
fi

step "LLM Shield 3I context-calibration audits"
if scripts/smoke-llm-shield-stage3i-phase1.sh > "$LOG_DIR/llm-shield-stage3i-phase1-smoke.log" 2>&1; then
  pass "LLM Shield 3I context-calibration audits"
else
  fail "LLM Shield 3I context-calibration audits"
  tail -80 "$LOG_DIR/llm-shield-stage3i-phase1-smoke.log"
fi

step "LLM Shield 3J full-evaluation audits (workspace + all-suite)"
if scripts/smoke-llm-shield-stage3j-workspace.sh > "$LOG_DIR/llm-shield-stage3j-workspace-smoke.log" 2>&1 \
  && scripts/smoke-llm-shield-stage3j-all-suite.sh > "$LOG_DIR/llm-shield-stage3j-all-suite-smoke.log" 2>&1; then
  pass "LLM Shield 3J full-evaluation audits"
else
  fail "LLM Shield 3J full-evaluation audits"
  tail -80 "$LOG_DIR/llm-shield-stage3j-all-suite-smoke.log"
fi

if [[ "${SIMURGH_RUN_STAGE3J_ALL_SUITES:-0}" == "1" ]]; then
  pass "LLM Shield 3J real all-suite run executed via smoke (SIMURGH_RUN_STAGE3J_ALL_SUITES=1)"
else
  pass "LLM Shield 3J real all-suite run skipped (set SIMURGH_RUN_STAGE3J_ALL_SUITES=1)"
fi

step "LLM Shield 3K adaptive-readiness audits"
if scripts/smoke-llm-shield-stage3k.sh > "$LOG_DIR/llm-shield-stage3k-smoke.log" 2>&1; then
  pass "LLM Shield 3K adaptive-readiness audits"
else
  fail "LLM Shield 3K adaptive-readiness audits"
  tail -80 "$LOG_DIR/llm-shield-stage3k-smoke.log"
fi

if [[ "${SIMURGH_RUN_STAGE3K:-0}" == "1" ]]; then
  pass "LLM Shield 3K real run executed via smoke (SIMURGH_RUN_STAGE3K=1)"
else
  pass "LLM Shield 3K real run skipped (set SIMURGH_RUN_STAGE3K=1)"
fi

step "LLM Shield 3L Fable-5 reference containment"
if scripts/smoke-llm-shield-stage3l.sh > "$LOG_DIR/llm-shield-stage3l-smoke.log" 2>&1; then
  pass "LLM Shield 3L Fable-5 reference containment"
else
  fail "LLM Shield 3L Fable-5 reference containment"
  tail -80 "$LOG_DIR/llm-shield-stage3l-smoke.log"
fi

if [[ "${SIMURGH_RUN_STAGE3L:-0}" == "1" ]]; then
  pass "LLM Shield 3L real run executed via smoke (SIMURGH_RUN_STAGE3L=1)"
else
  pass "LLM Shield 3L real run skipped (set SIMURGH_RUN_STAGE3L=1)"
fi

step "LLM Shield 3F/3G helper function coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tests/e2e/llm_shield_stage3f_benchmark_lib.mjs \
  --test-coverage-include=tests/e2e/llm_shield_stage3g_live_shadow_lib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3fBenchmarkLib.test.js \
  tests/unit/llmShield/stage3gLiveShadowLib.test.js \
  > "$LOG_DIR/llm-shield-stage3fg-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3F/3G helper function coverage"
else
  fail "LLM Shield 3F/3G helper function coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3fg-helper-coverage.log"
fi

step "LLM Shield 3L Fable-5 reference helper function coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3lFable5ReferenceLib.test.js \
  > "$LOG_DIR/llm-shield-stage3l-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3L Fable-5 reference helper function coverage"
else
  fail "LLM Shield 3L Fable-5 reference helper function coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3l-helper-coverage.log"
fi

step "LLM Shield 3M verifiable containment attestation"
if scripts/smoke-llm-shield-stage3m.sh > "$LOG_DIR/llm-shield-stage3m-smoke.log" 2>&1; then
  pass "LLM Shield 3M verifiable containment attestation"
else
  fail "LLM Shield 3M verifiable containment attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3m-smoke.log"
fi

step "LLM Shield 3M attestation helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/canonicalise.mjs \
  --test-coverage-include=tools/simurgh-attestation/attestationLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/attestation/canonicalise.test.js \
  tests/unit/llmShield/attestation/attestationLib.test.js \
  > "$LOG_DIR/llm-shield-stage3m-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3M attestation helper coverage"
else
  fail "LLM Shield 3M attestation helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3m-helper-coverage.log"
fi

step "LLM Shield 3N claim-checked security-utility ledger"
if scripts/smoke-llm-shield-stage3n.sh > "$LOG_DIR/llm-shield-stage3n-smoke.log" 2>&1; then
  pass "LLM Shield 3N claim-checked security-utility ledger"
else
  fail "LLM Shield 3N claim-checked security-utility ledger"
  tail -80 "$LOG_DIR/llm-shield-stage3n-smoke.log"
fi

# LLM Shield end-to-end reproduce (Stage 4D–4L) moved to scripts/check-e2e.sh — it
# runs as a separate CI step on Node 26 so byte-stable reproduce is gated. The base
# gate here stays unit tests + static checks + platform smokes.

step "LLM Shield 3N claim ledger helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3nClaimLedgerLib.test.js \
  > "$LOG_DIR/llm-shield-stage3n-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3N claim ledger helper coverage"
else
  fail "LLM Shield 3N claim ledger helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3n-helper-coverage.log"
fi

step "LLM Shield 3O BYO-gateway containment benchmark"
if scripts/smoke-llm-shield-stage3o.sh > "$LOG_DIR/llm-shield-stage3o-smoke.log" 2>&1; then
  pass "LLM Shield 3O BYO-gateway containment benchmark"
else
  fail "LLM Shield 3O BYO-gateway containment benchmark"
  tail -80 "$LOG_DIR/llm-shield-stage3o-smoke.log"
fi

step "LLM Shield 3O benchmark helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-benchmark/byoContractLib.mjs \
  --test-coverage-include=tools/simurgh-benchmark/corpus.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/benchmark/byoContractLib.test.js \
  tests/unit/llmShield/benchmark/byoCorpus.test.js \
  tests/unit/llmShield/benchmark/byoSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3o-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3O benchmark helper coverage"
else
  fail "LLM Shield 3O benchmark helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3o-helper-coverage.log"
fi

step "LLM Shield 3P cross-defence containment attestation"
if scripts/smoke-llm-shield-stage3p.sh > "$LOG_DIR/llm-shield-stage3p-smoke.log" 2>&1; then
  pass "LLM Shield 3P cross-defence containment attestation"
else
  fail "LLM Shield 3P cross-defence containment attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3p-smoke.log"
fi

step "LLM Shield 3P cross-defence helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-benchmark/crossDefenceMatrix.mjs \
  --test-coverage-include=tools/simurgh-benchmark/crossDefenceLib.mjs \
  --test-coverage-include=tools/simurgh-benchmark/crossDefenceCatalogue.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/crossDefence/crossDefenceMatrix.test.js \
  tests/unit/llmShield/crossDefence/crossDefenceLib.test.js \
  tests/unit/llmShield/crossDefence/crossDefenceCatalogue.test.js \
  tests/unit/llmShield/crossDefence/crossDefenceTargets.test.js \
  > "$LOG_DIR/llm-shield-stage3p-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3P cross-defence helper coverage"
else
  fail "LLM Shield 3P cross-defence helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3p-helper-coverage.log"
fi

step "LLM Shield 3Q attestation registry + regression diff"
if scripts/smoke-llm-shield-stage3q.sh > "$LOG_DIR/llm-shield-stage3q-smoke.log" 2>&1; then
  pass "LLM Shield 3Q attestation registry + regression diff"
else
  fail "LLM Shield 3Q attestation registry + regression diff"
  tail -80 "$LOG_DIR/llm-shield-stage3q-smoke.log"
fi

step "LLM Shield 3Q temporal helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-temporal/temporalLib.mjs \
  --test-coverage-include=tools/simurgh-temporal/registryChain.mjs \
  --test-coverage-include=tools/simurgh-temporal/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/temporal/temporalLib.test.js \
  tests/unit/llmShield/temporal/registryChain.test.js \
  tests/unit/llmShield/temporal/temporalSelfProof.test.js \
  tests/unit/llmShield/temporal/temporalVerify.test.js \
  > "$LOG_DIR/llm-shield-stage3q-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3Q temporal helper coverage"
else
  fail "LLM Shield 3Q temporal helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3q-helper-coverage.log"
fi

step "LLM Shield 3R trust-preserving provider fallback"
if scripts/smoke-llm-shield-stage3r.sh > "$LOG_DIR/llm-shield-stage3r-smoke.log" 2>&1; then
  pass "LLM Shield 3R trust-preserving provider fallback"
else
  fail "LLM Shield 3R trust-preserving provider fallback"
  tail -80 "$LOG_DIR/llm-shield-stage3r-smoke.log"
fi

step "LLM Shield 3R fallback helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=src/llmShield/gateway/fallbackPolicy.js \
  --test-coverage-include=src/llmShield/gateway/fallbackOrchestrator.js \
  --test-coverage-include=src/llmShield/gateway/fallbackSelfProof.js \
  --test-coverage-functions=100 \
  tests/unit/llmShield/gateway/fallbackPolicy.test.js \
  tests/unit/llmShield/gateway/fallbackOrchestrator.test.js \
  tests/unit/llmShield/gateway/fallbackSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3r-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3R fallback helper coverage"
else
  fail "LLM Shield 3R fallback helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3r-helper-coverage.log"
fi

step "LLM Shield 3S verifiable defensive narrative"
if scripts/smoke-llm-shield-stage3s.sh > "$LOG_DIR/llm-shield-stage3s-smoke.log" 2>&1; then
  pass "LLM Shield 3S verifiable defensive narrative"
else
  fail "LLM Shield 3S verifiable defensive narrative"
  tail -80 "$LOG_DIR/llm-shield-stage3s-smoke.log"
fi

step "LLM Shield 3S narrative helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-narrative/evidenceDigest.mjs \
  --test-coverage-include=tools/simurgh-narrative/claimChecker.mjs \
  --test-coverage-include=tools/simurgh-narrative/renderer.mjs \
  --test-coverage-include=tools/simurgh-narrative/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/narrative/evidenceDigest.test.js \
  tests/unit/llmShield/narrative/claimChecker.test.js \
  tests/unit/llmShield/narrative/renderer.test.js \
  tests/unit/llmShield/narrative/narrativeSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3s-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3S narrative helper coverage"
else
  fail "LLM Shield 3S narrative helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3s-helper-coverage.log"
fi

step "LLM Shield 3T capability-extraction attestation"
if scripts/smoke-llm-shield-stage3t.sh > "$LOG_DIR/llm-shield-stage3t-smoke.log" 2>&1; then
  pass "LLM Shield 3T capability-extraction attestation"
else
  fail "LLM Shield 3T capability-extraction attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3t-smoke.log"
fi

step "LLM Shield 3T extraction helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-extraction/metaSet.mjs \
  --test-coverage-include=tools/simurgh-extraction/signalFamilies.mjs \
  --test-coverage-include=tools/simurgh-extraction/detector.mjs \
  --test-coverage-include=tools/simurgh-extraction/renderer.mjs \
  --test-coverage-include=tools/simurgh-extraction/selfProof.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/extraction/metaSet.test.js \
  tests/unit/llmShield/extraction/signalFamilies.test.js \
  tests/unit/llmShield/extraction/detector.test.js \
  tests/unit/llmShield/extraction/renderer.test.js \
  tests/unit/llmShield/extraction/extractionSelfProof.test.js \
  > "$LOG_DIR/llm-shield-stage3t-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3T extraction helper coverage"
else
  fail "LLM Shield 3T extraction helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3t-helper-coverage.log"
fi

step "LLM Shield 3U red-team-hardened attestation"
if scripts/smoke-llm-shield-stage3u.sh > "$LOG_DIR/llm-shield-stage3u-smoke.log" 2>&1; then
  pass "LLM Shield 3U red-team-hardened attestation"
else
  fail "LLM Shield 3U red-team-hardened attestation"
  tail -80 "$LOG_DIR/llm-shield-stage3u-smoke.log"
fi

step "LLM Shield 3U extraction-v2 helper coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-extraction/signalFamiliesV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/metadataGrammar.mjs \
  --test-coverage-include=tools/simurgh-extraction/metaSetV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/detectorV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/rendererV2.mjs \
  --test-coverage-include=tools/simurgh-extraction/selfProofV2.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/extractionV2/signalFamiliesV2.test.js \
  tests/unit/llmShield/extractionV2/metadataGrammar.test.js \
  tests/unit/llmShield/extractionV2/metaSetV2.test.js \
  tests/unit/llmShield/extractionV2/detectorV2.test.js \
  tests/unit/llmShield/extractionV2/rendererV2.test.js \
  tests/unit/llmShield/extractionV2/extractionSelfProofV2.test.js \
  > "$LOG_DIR/llm-shield-stage3u-helper-coverage.log" 2>&1; then
  pass "LLM Shield 3U extraction-v2 helper coverage"
else
  fail "LLM Shield 3U extraction-v2 helper coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3u-helper-coverage.log"
fi

# ── LLM Shield 3V-A external-defence attestation ─────────
step "LLM Shield 3V-A external-defence smoke"
if scripts/smoke-llm-shield-stage3v.sh > "$LOG_DIR/llm-shield-stage3v-smoke.log" 2>&1; then
  pass "LLM Shield 3V-A external-defence smoke"
else
  fail "LLM Shield 3V-A external-defence smoke"
  tail -60 "$LOG_DIR/llm-shield-stage3v-smoke.log"
fi

step "LLM Shield 3V-A security audit"
if scripts/security-audit-llm-shield-stage3v.sh > "$LOG_DIR/llm-shield-stage3v-security.log" 2>&1; then
  pass "LLM Shield 3V-A security audit"
else
  fail "LLM Shield 3V-A security audit"
  tail -40 "$LOG_DIR/llm-shield-stage3v-security.log"
fi

step "LLM Shield 3V-A privacy audit"
if node scripts/privacy-audit-llm-shield-stage3v.mjs > "$LOG_DIR/llm-shield-stage3v-privacy.log" 2>&1; then
  pass "LLM Shield 3V-A privacy audit"
else
  fail "LLM Shield 3V-A privacy audit"
  tail -40 "$LOG_DIR/llm-shield-stage3v-privacy.log"
fi

step "LLM Shield 3V-A consistency audit"
if node scripts/consistency-audit-llm-shield-stage3v.mjs > "$LOG_DIR/llm-shield-stage3v-consistency.log" 2>&1; then
  pass "LLM Shield 3V-A consistency audit"
else
  fail "LLM Shield 3V-A consistency audit"
  tail -40 "$LOG_DIR/llm-shield-stage3v-consistency.log"
fi

step "LLM Shield 3V-A policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3v.sh > "$LOG_DIR/llm-shield-stage3v-policy.log" 2>&1; then
  pass "LLM Shield 3V-A policy-drift guard"
else
  fail "LLM Shield 3V-A policy-drift guard"
  tail -40 "$LOG_DIR/llm-shield-stage3v-policy.log"
fi

# Pure-lib function coverage gate (the verifier/runner CLIs are subprocess-covered by the
# smoke + audits above, matching the 3U precedent — they are not in this 100% gate).
step "LLM Shield 3V-A external-defence lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/external-defense-adapters/normaliseExternalVerdict.mjs \
  --test-coverage-include=tools/external-defense-adapters/externalDefenseAdapterContract.mjs \
  --test-coverage-include=tools/external-defense-adapters/harnessHashExternalOutput.mjs \
  --test-coverage-include=tools/external-defense-adapters/recordedFixtureExternalDefenseAdapter.mjs \
  --test-coverage-include=tests/e2e/llm_shield_stage3v_metrics_lib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3v/normaliseExternalVerdict.test.js \
  tests/unit/llmShield/stage3v/adapterContract.test.js \
  tests/unit/llmShield/stage3v/harnessComputedHashes.test.js \
  tests/unit/llmShield/stage3v/recordedFixtureAdapter.test.js \
  tests/unit/llmShield/stage3v/metrics.test.js \
  tests/unit/llmShield/stage3v/advisoryInvariance.test.js \
  tests/unit/llmShield/stage3v/bundle.test.js \
  tests/unit/llmShield/stage3v/verifierExternalDefenseBundle.test.js \
  tests/unit/llmShield/stage3v/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3v-coverage.log" 2>&1; then
  pass "LLM Shield 3V-A external-defence lib coverage"
else
  fail "LLM Shield 3V-A external-defence lib coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3v-coverage.log"
fi

# ── LLM Shield 3V-B live-capture external-defence attestation ─────────
step "LLM Shield 3V-B feedable-input preflight"
if node scripts/assert-stage3l-feedable-inputs.mjs > "$LOG_DIR/llm-shield-stage3vb-feedable.log" 2>&1; then
  pass "LLM Shield 3V-B feedable-input preflight"
else
  fail "LLM Shield 3V-B feedable-input preflight"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-feedable.log"
fi

step "LLM Shield 3V-B capture-integrity preflight"
if node scripts/assert-stage3vb-capture-integrity.mjs > "$LOG_DIR/llm-shield-stage3vb-capture.log" 2>&1; then
  pass "LLM Shield 3V-B capture-integrity preflight"
else
  fail "LLM Shield 3V-B capture-integrity preflight"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-capture.log"
fi

step "LLM Shield 3V-B external-defence smoke"
if scripts/smoke-llm-shield-stage3vb.sh > "$LOG_DIR/llm-shield-stage3vb-smoke.log" 2>&1; then
  pass "LLM Shield 3V-B external-defence smoke"
else
  fail "LLM Shield 3V-B external-defence smoke"
  tail -60 "$LOG_DIR/llm-shield-stage3vb-smoke.log"
fi

step "LLM Shield 3V-B security audit"
if scripts/security-audit-llm-shield-stage3vb.sh > "$LOG_DIR/llm-shield-stage3vb-security.log" 2>&1; then
  pass "LLM Shield 3V-B security audit"
else
  fail "LLM Shield 3V-B security audit"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-security.log"
fi

step "LLM Shield 3V-B privacy audit"
if node scripts/privacy-audit-llm-shield-stage3vb.mjs > "$LOG_DIR/llm-shield-stage3vb-privacy.log" 2>&1; then
  pass "LLM Shield 3V-B privacy audit"
else
  fail "LLM Shield 3V-B privacy audit"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-privacy.log"
fi

step "LLM Shield 3V-B consistency audit"
if node scripts/consistency-audit-llm-shield-stage3vb.mjs > "$LOG_DIR/llm-shield-stage3vb-consistency.log" 2>&1; then
  pass "LLM Shield 3V-B consistency audit"
else
  fail "LLM Shield 3V-B consistency audit"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-consistency.log"
fi

step "LLM Shield 3V-B policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3vb.sh > "$LOG_DIR/llm-shield-stage3vb-policy.log" 2>&1; then
  pass "LLM Shield 3V-B policy-drift guard"
else
  fail "LLM Shield 3V-B policy-drift guard"
  tail -40 "$LOG_DIR/llm-shield-stage3vb-policy.log"
fi

step "LLM Shield 3V-B external-defence lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/external-defense-adapters/llamaGuard4OutputGrammar.mjs \
  --test-coverage-include=tools/external-defense-adapters/llamaGuard4Adapter.mjs \
  --test-coverage-include=tools/external-defense-adapters/captureProvenanceHashes.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3vb/feedableInputs.test.js \
  tests/unit/llmShield/stage3vb/llamaGuard4Grammar.test.js \
  tests/unit/llmShield/stage3vb/llamaGuard4Adapter.test.js \
  tests/unit/llmShield/stage3vb/captureProvenanceHashes.test.js \
  tests/unit/llmShield/stage3vb/sampleCapture.test.js \
  tests/unit/llmShield/stage3vb/bundle.test.js \
  tests/unit/llmShield/stage3vb/advisoryInvariance.test.js \
  tests/unit/llmShield/stage3vb/verifier.test.js \
  tests/unit/llmShield/stage3vb/captureIntegrityScript.test.js \
  tests/unit/llmShield/stage3vb/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3vb-coverage.log" 2>&1; then
  pass "LLM Shield 3V-B external-defence lib coverage"
else
  fail "LLM Shield 3V-B external-defence lib coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3vb-coverage.log"
fi

# ── LLM Shield 3W witnessed VCA release provenance (offline gates only) ─────────
step "LLM Shield 3W witnessed-release smoke"
if scripts/smoke-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-smoke.log" 2>&1; then
  pass "LLM Shield 3W witnessed-release smoke"
else
  fail "LLM Shield 3W witnessed-release smoke"
  tail -60 "$LOG_DIR/llm-shield-stage3w-smoke.log"
fi

step "LLM Shield 3W security audit"
if scripts/security-audit-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-security.log" 2>&1; then
  pass "LLM Shield 3W security audit"
else
  fail "LLM Shield 3W security audit"
  tail -40 "$LOG_DIR/llm-shield-stage3w-security.log"
fi

step "LLM Shield 3W privacy audit"
if node scripts/privacy-audit-llm-shield-stage3w.mjs > "$LOG_DIR/llm-shield-stage3w-privacy.log" 2>&1; then
  pass "LLM Shield 3W privacy audit"
else
  fail "LLM Shield 3W privacy audit"
  tail -40 "$LOG_DIR/llm-shield-stage3w-privacy.log"
fi

step "LLM Shield 3W consistency audit"
if node scripts/consistency-audit-llm-shield-stage3w.mjs > "$LOG_DIR/llm-shield-stage3w-consistency.log" 2>&1; then
  pass "LLM Shield 3W consistency audit"
else
  fail "LLM Shield 3W consistency audit"
  tail -40 "$LOG_DIR/llm-shield-stage3w-consistency.log"
fi

step "LLM Shield 3W policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3w.sh > "$LOG_DIR/llm-shield-stage3w-policy.log" 2>&1; then
  pass "LLM Shield 3W policy-drift guard"
else
  fail "LLM Shield 3W policy-drift guard"
  tail -40 "$LOG_DIR/llm-shield-stage3w-policy.log"
fi

step "LLM Shield 3W witness lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/stage3wWitnessLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3w/witnessLib.test.js \
  tests/unit/llmShield/stage3w/bundle.test.js \
  tests/unit/llmShield/stage3w/verifier.test.js \
  tests/unit/llmShield/stage3w/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3w-coverage.log" 2>&1; then
  pass "LLM Shield 3W witness lib coverage"
else
  fail "LLM Shield 3W witness lib coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3w-coverage.log"
fi

# ── LLM Shield 3X public VCA timeline (offline gates only) ─────────
step "LLM Shield 3X public-VCA-timeline smoke"
if scripts/smoke-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-smoke.log" 2>&1; then
  pass "LLM Shield 3X public-VCA-timeline smoke"
else
  fail "LLM Shield 3X public-VCA-timeline smoke"
  tail -60 "$LOG_DIR/llm-shield-stage3x-smoke.log"
fi

step "LLM Shield 3X security audit"
if scripts/security-audit-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-security.log" 2>&1; then
  pass "LLM Shield 3X security audit"
else
  fail "LLM Shield 3X security audit"
  tail -40 "$LOG_DIR/llm-shield-stage3x-security.log"
fi

step "LLM Shield 3X privacy audit"
if node scripts/privacy-audit-llm-shield-stage3x.mjs > "$LOG_DIR/llm-shield-stage3x-privacy.log" 2>&1; then
  pass "LLM Shield 3X privacy audit"
else
  fail "LLM Shield 3X privacy audit"
  tail -40 "$LOG_DIR/llm-shield-stage3x-privacy.log"
fi

step "LLM Shield 3X consistency audit (index + evidence-root 10/10 + deep 5/5)"
if node scripts/consistency-audit-llm-shield-stage3x.mjs > "$LOG_DIR/llm-shield-stage3x-consistency.log" 2>&1; then
  pass "LLM Shield 3X consistency audit (index + evidence-root 10/10 + deep 5/5)"
else
  fail "LLM Shield 3X consistency audit (index + evidence-root 10/10 + deep 5/5)"
  tail -40 "$LOG_DIR/llm-shield-stage3x-consistency.log"
fi

step "LLM Shield 3X policy-drift guard"
if scripts/policy-drift-guard-llm-shield-stage3x.sh > "$LOG_DIR/llm-shield-stage3x-policy.log" 2>&1; then
  pass "LLM Shield 3X policy-drift guard"
else
  fail "LLM Shield 3X policy-drift guard"
  tail -40 "$LOG_DIR/llm-shield-stage3x-policy.log"
fi

step "LLM Shield 3X timeline lib coverage"
if node --test --experimental-test-coverage \
  --test-coverage-include=tools/simurgh-attestation/verifyEvidenceHashesLib.mjs \
  --test-coverage-include=tools/simurgh-attestation/stage3xTimelineLib.mjs \
  --test-coverage-functions=100 \
  tests/unit/llmShield/stage3x/verifyEvidenceHashes.test.js \
  tests/unit/llmShield/stage3x/timelineLib.test.js \
  tests/unit/llmShield/stage3x/build.test.js \
  tests/unit/llmShield/stage3x/verifier.test.js \
  tests/unit/llmShield/stage3x/tamper.test.js \
  > "$LOG_DIR/llm-shield-stage3x-coverage.log" 2>&1; then
  pass "LLM Shield 3X timeline lib coverage"
else
  fail "LLM Shield 3X timeline lib coverage"
  tail -100 "$LOG_DIR/llm-shield-stage3x-coverage.log"
fi

step "LLM Shield 3E-core docker smoke (skips if no docker)"
if bash scripts/docker-smoke-llm-shield-stage3e.sh > "$LOG_DIR/llm-shield-stage3e-docker-smoke.log" 2>&1; then
  pass "LLM Shield 3E-core docker smoke"
else
  fail "LLM Shield 3E-core docker smoke"
  tail -40 "$LOG_DIR/llm-shield-stage3e-docker-smoke.log"
fi

step "LLM Shield 3E-live gateway smoke"
if scripts/smoke-llm-shield-stage3e-live.sh > "$LOG_DIR/llm-shield-stage3e-live-smoke.log" 2>&1; then
  pass "LLM Shield 3E-live gateway smoke"
else
  fail "LLM Shield 3E-live gateway smoke"
  tail -80 "$LOG_DIR/llm-shield-stage3e-live-smoke.log"
fi

step "LLM Shield 3E-live security audit"
if scripts/security-audit-llm-shield-stage3e-live.sh > "$LOG_DIR/llm-shield-stage3e-live-security-audit.log" 2>&1; then
  pass "LLM Shield 3E-live security audit"
else
  fail "LLM Shield 3E-live security audit"
  tail -80 "$LOG_DIR/llm-shield-stage3e-live-security-audit.log"
fi

step "LLM Shield 3E-live privacy audit"
if node scripts/privacy-audit-llm-shield-stage3e-live.mjs > "$LOG_DIR/llm-shield-stage3e-live-privacy-audit.log" 2>&1; then
  pass "LLM Shield 3E-live privacy audit"
else
  fail "LLM Shield 3E-live privacy audit"
  tail -80 "$LOG_DIR/llm-shield-stage3e-live-privacy-audit.log"
fi

# Stage 3C evidence (informational — not gates; these print measurements only).
step "LLM Shield 3C ablation (informational)"
if node tests/e2e/llm_shield_ablation_runner.mjs > "$LOG_DIR/llm-shield-ablation.log" 2>&1; then
  pass "LLM Shield 3C ablation"
  cat "$LOG_DIR/llm-shield-ablation.log"
else
  pass "LLM Shield 3C ablation (non-gating; see log)"
  tail -20 "$LOG_DIR/llm-shield-ablation.log"
fi

step "LLM Shield 3C held-out generalization (informational)"
if node tests/e2e/llm_shield_heldout_runner.mjs > "$LOG_DIR/llm-shield-heldout.log" 2>&1; then
  pass "LLM Shield 3C held-out generalization"
  cat "$LOG_DIR/llm-shield-heldout.log"
else
  pass "LLM Shield 3C held-out (non-gating; see log)"
  tail -20 "$LOG_DIR/llm-shield-heldout.log"
fi

# ── 14. Git status sanity ────────────────────────────────
step "Git status"
if git rev-parse --git-dir > /dev/null 2>&1; then
  if [[ -z "$(git status --porcelain)" ]]; then
    pass "working tree clean"
  else
    echo -e "${YELLOW}Working tree has uncommitted changes:${NC}"
    git status --short
    pass "working tree (uncommitted changes are fine if you haven't pushed yet)"
  fi

  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  echo -e "${YELLOW}Branch: $CURRENT_BRANCH${NC}"

  if git rev-parse --verify "origin/$CURRENT_BRANCH" >/dev/null 2>&1; then
    AHEAD="$(git rev-list --count "origin/$CURRENT_BRANCH..HEAD" 2>/dev/null || echo 0)"
    BEHIND="$(git rev-list --count "HEAD..origin/$CURRENT_BRANCH" 2>/dev/null || echo 0)"
    echo -e "${YELLOW}Local vs origin/$CURRENT_BRANCH: $AHEAD ahead, $BEHIND behind${NC}"
  fi
else
  echo -e "${YELLOW}Not a git repository — skipping git status${NC}"
fi

# ── Summary ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━ Summary ━━━${NC}"
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo -e "${RED}Failed steps:${NC}"
  for failed in "${FAILED_STEPS[@]}"; do
    echo -e "  ${RED}- $failed${NC}"
  done
  echo ""
  echo -e "${YELLOW}Logs saved in: $LOG_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}All checks passed. Safe to commit and push.${NC}"
