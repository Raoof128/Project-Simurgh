#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Stage 3V-B offline reproduction"
node scripts/assert-stage3l-feedable-inputs.mjs
node scripts/assert-stage3vb-capture-integrity.mjs
node tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs verify
node tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3vb-external-defense.mjs --reproduce
node tests/e2e/llm_shield_stage3vb_tamper_runner.mjs
echo "Stage 3V-B reproduction: PASS"
