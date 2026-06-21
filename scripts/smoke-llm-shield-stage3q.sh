#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q smoke is VERIFY-ONLY. Regeneration is a local maintainer flow:
# build --update -> sign-3q-registry -> hash.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tools/simurgh-temporal/registry.mjs manifest-check
node tools/simurgh-temporal/registry.mjs build
node tools/simurgh-temporal/registry.mjs verify-hashes
node tools/simurgh-temporal/verify-stage3q-registry.mjs
node tools/simurgh-temporal/verify-stage3q-append.mjs
node tools/simurgh-temporal/verify-stage3q-diff.mjs
bash scripts/smoke-llm-shield-stage3q-self-proof.sh
bash scripts/policy-drift-guard-llm-shield-stage3q.sh
node scripts/privacy-audit-llm-shield-stage3q.mjs
node scripts/consistency-audit-llm-shield-stage3q.mjs
bash scripts/security-audit-llm-shield-stage3q.sh
echo "stage3q smoke: passed"
