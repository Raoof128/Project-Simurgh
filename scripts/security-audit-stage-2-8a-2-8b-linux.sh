#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Stage 2.8A + 2.8B Linux cybersecurity audit"

echo "  [1/4] Stage 2.6/2.7 closeout cybersecurity audit (no regression)"
bash scripts/security-audit-stage-2-6-2-7-closeout.sh

echo "  [2/4] Stage 2.8A + 2.8B Linux security audit suite"
node --test tests/security/stage28ab_linux_security_audit.test.js

echo "  [3/4] Project privacy audit (CLI sweep)"
node tools/privacy-audit.mjs

echo "  [4/4] npm audit (high+ vulnerabilities)"
npm audit --audit-level=high

echo "Stage 2.8A + 2.8B Linux cybersecurity audit: pass"
