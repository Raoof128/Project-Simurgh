#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3T smoke: offline, deterministic, verify-only (no gateway, no network).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node tools/simurgh-extraction/simurgh-extraction.mjs build
node tools/simurgh-extraction/simurgh-extraction.mjs verify
node tools/simurgh-extraction/simurgh-extraction.mjs verify-hashes
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce
bash scripts/policy-drift-guard-llm-shield-stage3t.sh
node scripts/privacy-audit-llm-shield-stage3t.mjs
node scripts/consistency-audit-llm-shield-stage3t.mjs
node scripts/security-audit-llm-shield-stage3t.mjs
echo "stage3t smoke: passed"
