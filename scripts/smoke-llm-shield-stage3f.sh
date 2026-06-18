#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3F smoke: read-only benchmark verification.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs
echo "[PASS] stage3f benchmark smoke"
