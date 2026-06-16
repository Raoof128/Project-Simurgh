#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Stage 2.8C/D Linux Wayland + systemd + CI cybersecurity audit"

echo "  [1/5] Stage 2.8A/B audit (no regression)"
bash scripts/security-audit-stage-2-8a-2-8b-linux.sh

echo "  [2/5] Stage 2.8C/D audit suite (16 dimensions)"
node --test tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js

echo "  [3/5] Shellcheck on lifecycle scripts (if available)"
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck tools/simurgh-daemon-linux/scripts/*.sh
else
  echo "shellcheck not installed locally; CI enforces it"
fi

echo "  [4/5] Privacy audit (CLI sweep)"
node tools/privacy-audit.mjs

echo "  [5/5] npm audit (high+ vulnerabilities)"
npm audit --audit-level=high

echo "Stage 2.8C/D Linux Wayland + systemd + CI cybersecurity audit: pass"
