#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs
node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs
echo "stage3h-layer2 security audit: passed"
