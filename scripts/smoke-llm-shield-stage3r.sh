#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3R smoke: deterministic, no network. Proves fallback resilience cannot bypass.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export SIMURGH_LLM_SHIELD_SECRET="${SIMURGH_LLM_SHIELD_SECRET:-smoke-llm-shield-secret-32-characters}"
node --test tests/e2e/llm_shield_stage3r_fallback.mjs
node scripts/security-audit-llm-shield-stage3r.mjs
echo "stage3r smoke: passed"
