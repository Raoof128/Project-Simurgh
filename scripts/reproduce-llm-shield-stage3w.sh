#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Stage 3W offline reproduction"
node tools/simurgh-attestation/build-3w-witness.mjs verify
node tools/simurgh-attestation/build-3w-witness.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce
node tests/e2e/llm_shield_stage3w_tamper_runner.mjs
echo "Stage 3W reproduction: PASS"
