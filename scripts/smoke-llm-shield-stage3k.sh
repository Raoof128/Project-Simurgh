#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EV="docs/research/llm-shield/evidence/stage-3k"
PY="${SIMURGH_STAGE3K_PYTHON:-python3}"

# Opt-in real run: regenerate data-bearing evidence before auditing (needs a
# running Simurgh gateway and agentdojo==0.1.30). Otherwise this is audit-only
# over committed evidence, so an audit-only pass is never mistaken for the run.
if [[ "${SIMURGH_RUN_STAGE3K:-0}" == "1" ]]; then
  ( cd tools/agentdojo-simurgh-adapter &&
    "$PY" -m simurgh_agentdojo_adapter.stage3k_runner \
      --suites workspace travel banking slack --out "../../$EV" )
  npx prettier --write "$EV"/*.json >/dev/null 2>&1 || true
fi

bash scripts/policy-drift-guard-llm-shield-stage3k.sh
node scripts/privacy-audit-llm-shield-stage3k.mjs
node scripts/consistency-audit-llm-shield-stage3k.mjs
bash scripts/security-audit-llm-shield-stage3k.sh
echo "stage3k smoke: passed"
