#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Stage 2.6/2.7 closeout E2E smoke.
#
# Umbrella gate that runs:
#   - Stage 2.6 Windows scanner smoke (live server, mock Windows daemon, signed
#     proof flow with WDA_MONITOR / WDA_EXCLUDEFROMCAPTURE inputs)
#   - Stage 2.7 cross-platform Device Shield smoke (Scenarios A–G covering
#     macOS healthy / Windows healthy / macOS capture-excluded Critical /
#     Windows monitor-only Warning / Windows capture-excluded Critical /
#     Linux unsupported_platform rejection / raw-field rejection)
#   - Project privacy audit
#
# After this passes, the Windows Device Shield is fully closed as a research
# prototype and Stage 2.7 is safe to release.

echo "Stage 2.6/2.7 closeout E2E smoke"

echo "  [1/3] Stage 2.6 Windows scanner E2E smoke"
bash scripts/smoke-stage-2-6-windows-scanner.sh > /dev/null

echo "  [2/3] Stage 2.7 cross-platform Device Shield E2E smoke (Scenarios A-G)"
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh > /dev/null

echo "  [3/3] Project privacy audit"
node tools/privacy-audit.mjs

echo "Stage 2.6/2.7 closeout E2E smoke: pass"
