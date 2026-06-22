#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3U smoke: offline, deterministic, verify-only (no gateway, no network).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node tools/simurgh-extraction/simurgh-extraction-v2.mjs build
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify-hashes
node tools/simurgh-extraction/verify-stage3u-attestation.mjs --reproduce
bash scripts/policy-drift-guard-llm-shield-stage3u.sh
bash scripts/v1-freeze-guard-llm-shield-stage3u.sh
node scripts/privacy-audit-llm-shield-stage3u.mjs
node scripts/consistency-audit-llm-shield-stage3u.mjs
node scripts/security-audit-llm-shield-stage3u.mjs
echo "stage3u smoke: passed"
