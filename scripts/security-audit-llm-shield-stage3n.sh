#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3N security audit: no overclaim wording, no guard drift, no pooled ASR.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3n"
fail() {
  echo "stage3n security audit FAIL: $1"
  exit 1
}

# 1. No overclaim wording in 3N docs (reviewer checklist excluded — it lists the banned phrases).
if ls docs/research/llm-shield/*STAGE_3N* docs/research/llm-shield/LLM_SHIELD_STAGE_3N* >/dev/null 2>&1; then
  if grep -RniE "jailbreak-proof|state of the art|first in industry|universal robustness|immune to" \
    --include='*.md' --exclude='*REVIEWER_CHECKLIST*' \
    docs/research/llm-shield/*STAGE_3N* docs/research/llm-shield/LLM_SHIELD_STAGE_3N* 2>/dev/null; then
    fail "overclaim wording in 3N docs"
  fi
fi

# 2. Pooled ASR must never be reported.
node -e '
const r = require("./'"$EV"'/denominator-pooling-report.json");
if (r.pooled_asr_reported !== false || r.cross_family_pooling_performed !== 0) { console.error("pooled asr"); process.exit(1); }
' || fail "pooled asr reported"

# 3. No src/llmShield drift.
bash scripts/policy-drift-guard-llm-shield-stage3n.sh >/dev/null || fail "policy drift"

echo "stage3n security audit: passed"
