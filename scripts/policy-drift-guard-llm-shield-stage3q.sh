#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q is tooling-only. Fail-closed: if merge-base is unavailable, WARN and fall
# back to a safe range; never silently pass without checking any range.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE="${SIMURGH_POLICY_BASE_REF:-main}"
RANGE="${BASE}...HEAD"
if ! git rev-parse --verify --quiet "${BASE}" >/dev/null; then
  echo "stage3q policy-drift: WARN — base '${BASE}' unavailable; falling back to HEAD~1..HEAD"
  RANGE="HEAD~1..HEAD"
fi
if ! git diff --name-only "${RANGE}" >/dev/null 2>&1; then
  echo "stage3q policy-drift: WARN — range '${RANGE}' unusable; falling back to full tree"
  changed="$(git ls-files 'src/llmShield')"
else
  changed="$(git diff --name-only "${RANGE}" 2>/dev/null || true)"
fi
if grep -q '^src/llmShield/' <<<"$changed"; then
  echo "stage3q policy-drift: FAIL — src/llmShield changed"
  exit 1
fi
echo "stage3q policy-drift: PASS (no src/llmShield change)"
