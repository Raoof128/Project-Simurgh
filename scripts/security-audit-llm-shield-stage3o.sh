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

# 1. No actual PEM private-key block committed anywhere (anchored).
if git grep -lE "^-----BEGIN ([A-Z]+ )?PRIVATE KEY-----" -- . >/dev/null 2>&1; then
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
