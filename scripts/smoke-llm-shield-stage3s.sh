#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3S smoke: deterministic, verify-only (build re-derives + byte-compares; no gateway re-run).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export SIMURGH_LLM_SHIELD_SECRET="${SIMURGH_LLM_SHIELD_SECRET:-smoke-llm-shield-secret-32-characters}"
node tools/simurgh-narrative/simurgh-narrative.mjs build
node tools/simurgh-narrative/simurgh-narrative.mjs verify-hashes
node tools/simurgh-narrative/verify-stage3s-narrative.mjs
bash scripts/policy-drift-guard-llm-shield-stage3s.sh
node scripts/privacy-audit-llm-shield-stage3s.mjs
node scripts/consistency-audit-llm-shield-stage3s.mjs
node scripts/security-audit-llm-shield-stage3s.mjs
echo "stage3s smoke: passed"
