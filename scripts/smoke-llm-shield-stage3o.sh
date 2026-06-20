#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3O smoke is VERIFY-ONLY (no signing, no network). Regeneration is a local
# maintainer flow: evidence --update -> sign-byo-attestation -> hash.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tools/simurgh-benchmark/simurgh-benchmark.mjs evidence
node tools/simurgh-benchmark/simurgh-benchmark.mjs verify-hashes
node tools/simurgh-benchmark/verify-byo-attestation.mjs
bash scripts/policy-drift-guard-llm-shield-stage3o.sh
node scripts/privacy-audit-llm-shield-stage3o.mjs
node scripts/consistency-audit-llm-shield-stage3o.mjs
bash scripts/security-audit-llm-shield-stage3o.sh
echo "stage3o smoke: passed"
