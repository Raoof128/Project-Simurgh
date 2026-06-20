#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3l"

# Opt-in regeneration: refresh metadata-only evidence before auditing. Otherwise
# this is audit-only over committed evidence, so a pass is never mistaken for a run.
if [[ "${SIMURGH_RUN_STAGE3L:-0}" == "1" ]]; then
  node tests/e2e/llm_shield_stage3l_fable5_reference_runner.mjs --update-metrics
  npx prettier --write "$EV"/*.json >/dev/null 2>&1 || true
fi

node tests/e2e/llm_shield_stage3l_fable5_reference_runner.mjs
bash scripts/policy-drift-guard-llm-shield-stage3l.sh
node scripts/privacy-audit-llm-shield-stage3l.mjs
node scripts/consistency-audit-llm-shield-stage3l.mjs
bash scripts/security-audit-llm-shield-stage3l.sh
echo "stage3l smoke: passed"
