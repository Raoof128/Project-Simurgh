#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Stage 2.7 cross-platform security audit"
node --check tests/security/stage27_cross_platform_security_audit.test.js
node --test tests/security/stage27_cross_platform_security_audit.test.js
node tools/privacy-audit.mjs
npm audit --audit-level=high
echo "Stage 2.7 cross-platform security audit: pass"
