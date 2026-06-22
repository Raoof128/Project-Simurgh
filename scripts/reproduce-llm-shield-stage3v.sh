#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Stage 3V-A offline reproduction"
node tests/e2e/llm_shield_stage3v_external_defense_runner.mjs verify
node tests/e2e/llm_shield_stage3v_external_defense_runner.mjs verify-hashes
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs --reproduce
node tests/e2e/llm_shield_stage3v_tamper_runner.mjs
echo "Stage 3V-A reproduction: PASS"
