#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3P smoke is VERIFY-ONLY (no signing, no network). Regeneration is a local
# maintainer flow: evidence --update -> sign-3p-attestation -> hash.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tools/simurgh-benchmark/simurgh-crossdefence.mjs evidence
node tools/simurgh-benchmark/simurgh-crossdefence.mjs verify-hashes
for id in no-defence-baseline keyword-filter-replica regex-denylist-replica llm-judge-replica context-sanitiser-replica tool-gate-replica full-gateway-target; do
  node tools/simurgh-attestation/verify-stage3p-target.mjs docs/research/llm-shield/evidence/stage-3p/targets/$id/containment-attestation.json
done
node tools/simurgh-attestation/verify-stage3p-catalogue.mjs
bash scripts/smoke-llm-shield-stage3p-self-proof.sh
bash scripts/policy-drift-guard-llm-shield-stage3p.sh
node scripts/privacy-audit-llm-shield-stage3p.mjs
node scripts/consistency-audit-llm-shield-stage3p.mjs
bash scripts/security-audit-llm-shield-stage3p.sh
echo "stage3p smoke: passed"
