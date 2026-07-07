#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3O security audit: no private key material, no overclaim wording, external
# targets measured_not_certified, no guard drift.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3o"
fail() {
  echo "stage3o security audit FAIL: $1"
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
    | grep -v -E "^tests/fixtures/llmShield/stage4v/test-keys/INSECURE_FIXTURE_ONLY_[A-Za-z-]+\.pem$" || true
)"
if [[ -n "$PRIVATE_KEY_MATCHES" ]]; then
  echo "$PRIVATE_KEY_MATCHES"
  fail "private key material committed"
fi

# 2. No overclaim wording in 3O docs (reviewer checklist excluded — lists banned phrases).
if ls docs/research/llm-shield/*STAGE_3O* docs/research/llm-shield/LLM_SHIELD_STAGE_3O* >/dev/null 2>&1; then
  if grep -RniE "jailbreak-proof|state of the art|first in industry|universal robustness|immune to|certified safe" \
    --include='*.md' --exclude='*REVIEWER_CHECKLIST*' \
    docs/research/llm-shield/*STAGE_3O* docs/research/llm-shield/LLM_SHIELD_STAGE_3O* 2>/dev/null; then
    fail "overclaim wording in 3O docs"
  fi
fi

# 3. Attestation carries the measured_not_certified non-claim.
node -e '
const a = require("./'"$EV"'/containment-attestation.json");
if (a.non_claims?.external_targets_measured_not_certified !== true) { console.error("missing measured_not_certified non-claim"); process.exit(1); }
' || fail "attestation non-claims"

# 4. No src/llmShield drift.
bash scripts/policy-drift-guard-llm-shield-stage3o.sh >/dev/null || fail "policy drift"

echo "stage3o security audit: passed"
