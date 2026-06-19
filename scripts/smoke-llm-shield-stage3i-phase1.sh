#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/privacy-audit-llm-shield-stage3i.mjs
node scripts/consistency-audit-llm-shield-stage3i.mjs
echo "stage3i-phase1 smoke: passed"
