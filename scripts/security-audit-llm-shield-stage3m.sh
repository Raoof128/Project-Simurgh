#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3M security audit: no private key material, machine-readable non-claims,
# no overclaim wording, no guard-logic drift.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3m"
fail() {
  echo "stage3m security audit FAIL: $1"
  exit 1
}

# 1. No actual PEM private-key block committed anywhere except the Stage 4D
#    deterministic test fixture key, which exists solely to reproduce signed
#    golden bytes in a clean clone.
PRIVATE_KEY_MATCHES="$(
  git grep -lE "^-----BEGIN ([A-Z]+ )?PRIVATE KEY-----" -- . \
    | grep -v -x "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem" \
    | grep -v -E "^tests/fixtures/llmShield/stage4o/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4p/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4q/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4r/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4s/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4t/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4v/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4w/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4x/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4y/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage4z/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage5a/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage5b/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage5c/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage5d/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" \
    | grep -v -E "^tests/fixtures/llmShield/stage5e/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" || true
)"
if [[ -n "$PRIVATE_KEY_MATCHES" ]]; then
  echo "$PRIVATE_KEY_MATCHES"
  fail "private key material committed"
fi

# 2. Bundle carries machine-readable non-claims, all true.
node -e '
const b = require("./'"$EV"'/attestation.bundle.json");
const nc = b.non_claims || {};
const req = ["does_not_prove_model_safety","does_not_prove_jailbreak_immunity","does_not_prove_server_uncompromised","does_not_prove_private_key_never_stolen","does_not_upgrade_audit_sample_to_full_chain","attests_only_to_referenced_run_set"];
for (const k of req) { if (nc[k] !== true) { console.error("non_claim missing/false: "+k); process.exit(1); } }
' || fail "non_claims"

# 3. No overclaim wording in 3M docs (reviewer checklist excluded — it lists the banned phrases).
if ls docs/research/llm-shield/*STAGE_3M* docs/research/llm-shield/LLM_SHIELD_STAGE_3M* >/dev/null 2>&1; then
  if grep -RniE "jailbreak-proof|claude defeated|fable fixed|universal safety|immune to" \
    --include='*.md' --exclude='*REVIEWER_CHECKLIST*' \
    docs/research/llm-shield/*STAGE_3M* docs/research/llm-shield/LLM_SHIELD_STAGE_3M* 2>/dev/null; then
    fail "overclaim wording in 3M docs"
  fi
fi

# 4. No src/llmShield drift.
bash scripts/policy-drift-guard-llm-shield-stage3m.sh >/dev/null || fail "policy drift"

echo "stage3m security audit: passed"
