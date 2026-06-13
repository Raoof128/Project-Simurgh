#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Stage 2.6/2.7 closeout cybersecurity audit.
#
# Runs the umbrella audit covering the nine dimensions enumerated in
# tests/security/stage_26_27_closeout_audit.test.js (proof, scanner, platform,
# daemon, SDK, report, dashboard, privacy, wording), plus the existing
# Stage 2.4/2.5 and Stage 2.7 audits and the project-wide privacy + npm audits.
#
# After this passes, both Stage 2.6 (Windows scanner) and Stage 2.7
# (cross-platform unification) are honestly closed as a research prototype.

echo "Stage 2.6/2.7 closeout cybersecurity audit"

echo "  [1/5] Stage 2.4/2.5 cybersecurity audit"
bash scripts/security-audit-stage-2-4-2-5.sh > /dev/null

echo "  [2/5] Stage 2.7 cross-platform security audit"
bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh > /dev/null

echo "  [3/5] Closeout audit — proof/scanner/platform/daemon/SDK/report/dashboard/privacy/wording"
node --check tests/security/stage_26_27_closeout_audit.test.js
node --test tests/security/stage_26_27_closeout_audit.test.js

echo "  [4/5] Project privacy audit (CLI sweep)"
node tools/privacy-audit.mjs

echo "  [5/5] npm audit (high+ vulnerabilities)"
npm audit --audit-level=high

echo "Stage 2.6/2.7 closeout cybersecurity audit: pass"
