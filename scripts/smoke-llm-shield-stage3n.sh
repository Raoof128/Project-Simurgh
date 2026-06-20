#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3n"

if [[ "${SIMURGH_RUN_STAGE3N:-0}" == "1" ]]; then
  node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs --update-metrics
  npx prettier --write "$EV"/*.json >/dev/null 2>&1 || true
fi

node tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs
bash scripts/policy-drift-guard-llm-shield-stage3n.sh
node scripts/privacy-audit-llm-shield-stage3n.mjs
node scripts/consistency-audit-llm-shield-stage3n.mjs
bash scripts/security-audit-llm-shield-stage3n.sh
echo "stage3n smoke: passed"
