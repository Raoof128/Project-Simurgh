#!/usr/bin/env bash
# Simurgh comprehensive check script.
#
# Runs:
#   npm install (deps)
#   node syntax check
#   unit tests
#   privacy audit (tools/privacy-audit.mjs + forbidden-field grep)
#   secret scan
#   tone check (no "unhackable" / "fully secure" / "proves cheating" / etc.)
#   forbidden npm package check (no analytics SDKs)
#   npm audit
#   server boot smoke + security headers + auth gates (full mode only)
#   audit chain verify self-test (full mode only)
#   git status sanity
#
# Usage:
#   ./scripts/check.sh
#   ./scripts/check.sh --quick
#   ./scripts/check.sh --fix
#   ./scripts/check.sh --verbose
#   ./scripts/check.sh --quick --verbose

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

# ── 4. Tests ─────────────────────────────────────────────
step "Tests"
run_step "npm test" "npm test"

# ── 5. Privacy guard ─────────────────────────────────────
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
FORBIDDEN_FIELDS_PATTERN='\b(typed_content|paste_content|answer_text|answer_content|screen_frame|screen_data|webcam_frame|microphone_data|microphone_audio|biometric_data|face_data|raw_student_name|raw_identity)\b'
PRIVACY_GREP_LOG="$LOG_DIR/privacy-fields.log"

if grep -RIEn "$FORBIDDEN_FIELDS_PATTERN" \
    server.js src/ public/ tools/ \
    --include='*.js' --include='*.mjs' --include='*.html' \
    --exclude-dir=node_modules 2>/dev/null \
  | grep -v "FORBIDDEN_FIELDS" \
  | grep -v "tools/privacy-audit.mjs" \
  | grep -v "src/privacy/normaliseTelemetry.js" \
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

# ── 6. Secret scan ───────────────────────────────────────
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

# ── 7. Tone check ────────────────────────────────────────
step "Tone check"
# Forbidden marketing/overclaim words. "unhackable" / "unbreakable" are allowed
# only when used as a negation ("not unhackable").
TONE_LOG="$LOG_DIR/tone.log"
: > "$TONE_LOG"
TONE_FAIL=false

# Hard-forbidden — any occurrence fails.
HARD_FORBIDDEN='\b(fully secure|guaranteed detection|proves cheating|cannot be bypassed|impossible to evade|automatic misconduct finding)\b'
if grep -RInE "$HARD_FORBIDDEN" \
    README.md AGENT.md CHANGELOG.md SECURITY.md PRIVACY.md ETHICS.md DISCLAIMER.md ROADMAP.md 2>/dev/null \
  | grep -iv "never makes automatic misconduct" \
  | grep -iv "no automatic misconduct finding" \
  | grep -iv "cannot be bypassed by configuration" \
  >> "$TONE_LOG"; then : ; fi

# Soft-forbidden — must be negated. Flag if line does NOT contain "not".
for word in "unhackable" "unbreakable"; do
  if grep -RInE "\\b$word\\b" \
      README.md AGENT.md CHANGELOG.md SECURITY.md PRIVACY.md ETHICS.md DISCLAIMER.md ROADMAP.md 2>/dev/null \
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

# ── 8. Dependency vulnerability scan ─────────────────────
step "npm audit"
if npm audit --audit-level=high > "$LOG_DIR/npm-audit.log" 2>&1; then
  pass "npm audit (0 high/critical vulnerabilities)"
else
  fail "npm audit (high or critical vulnerabilities found)"
  tail -40 "$LOG_DIR/npm-audit.log" || true
fi

# ── 9. Server boot smoke + auth gates ────────────────────
if [[ "$QUICK" == true ]]; then
  step "Server boot smoke"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Server boot smoke"
  # Use an off-band port so we don't collide with a running dev server.
  SMOKE_PORT=33030
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
      -d '{"sessionId":"check_neg","telemetry":{"keystrokes":-1,"chars_typed":5,"effective_wpm":50,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}' 2>/dev/null)"
    if echo "$NEG_RESPONSE" | grep -q '"error"'; then
      pass "telemetry rejects negative numbers"
    else
      fail "telemetry accepted negative number (expected rejection)"
      echo "  got: $NEG_RESPONSE"
      SMOKE_FAIL=true
    fi

    # Negative test: replay (duplicate sequence) must be rejected
    NOW_MS="$(node -p 'Date.now()')"
    BODY='{"sessionId":"check_replay","sequence":1,"timestamp":'"$NOW_MS"',"telemetry":{"keystrokes":5,"chars_typed":20,"effective_wpm":40,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}'
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
      -d '{"title":"check smoke","durationMinutes":60}' 2>/dev/null)"
    EXAM_ID="$(echo "$EXAM_RESPONSE" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(JSON.parse(d).id||"")}catch{}})' 2>/dev/null)"
    if [[ -n "$EXAM_ID" ]]; then
      JOIN_RESPONSE="$(curl -s -X POST "http://localhost:$SMOKE_PORT/api/exams/$EXAM_ID/join" \
        -H 'Content-Type: application/json' \
        -d '{"studentId":"check@test","sessionId":"check_joined"}' 2>/dev/null)"
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
        -d '{"sessionId":"check_joined","sequence":1,"timestamp":'"$(node -p 'Date.now()')"',"telemetry":{"keystrokes":1,"chars_typed":1,"effective_wpm":10,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}' 2>/dev/null)"
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

# ── 10. Audit chain self-test ────────────────────────────
if [[ "$QUICK" == true ]]; then
  step "Audit chain self-test"
  echo -e "${YELLOW}Skipped because --quick was used.${NC}"
else
  step "Audit chain self-test"
  # Build a tiny chain via the hmacChain module, write to a temp file,
  # then verify it with verify-audit.mjs.
  TMP_CHAIN="$(mktemp -t simurgh-chain.XXXXXX.json)"
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

# ── 11. Git status sanity ────────────────────────────────
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
