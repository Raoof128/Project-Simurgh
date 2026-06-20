#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export SIMURGH_STAGE3J_SCOPE=workspace
EV="docs/research/llm-shield/evidence/stage-3j"
PY="${SIMURGH_STAGE3J_PYTHON:-python3}"

# Opt-in real run: regenerate real evidence before auditing (needs a running
# Simurgh gateway and agentdojo==0.1.30). Otherwise this is audit-only over
# committed evidence — so an audit-only pass is never mistaken for the heavy run.
if [[ "${SIMURGH_RUN_STAGE3J_WORKSPACE:-0}" == "1" ]]; then
  export SIMURGH_STAGE3J_REAL=1
  ( cd tools/agentdojo-simurgh-adapter &&
    "$PY" -m simurgh_agentdojo_adapter.stage3j_full_runner \
      --scope workspace --suites workspace --out "../../$EV" )
fi

node scripts/privacy-audit-llm-shield-stage3j.mjs
node scripts/consistency-audit-llm-shield-stage3j.mjs
bash scripts/security-audit-llm-shield-stage3j.sh
echo "stage3j-workspace smoke: passed"
