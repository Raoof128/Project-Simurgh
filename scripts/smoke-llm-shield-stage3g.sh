#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3G smoke: read-only live-shadow evidence verification.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs
echo "[PASS] stage3g live shadow smoke"
