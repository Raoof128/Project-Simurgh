#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3P is tooling-only: assert no src/llmShield change is bundled with 3P work.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# Branch-wide scope: diff against the merge-base with origin/main so an early bad
# commit cannot hide behind later clean commits.
BASE_REF="${SIMURGH_POLICY_BASE_REF:-origin/main}"
BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || git rev-parse HEAD~1)"
if git diff --name-only "$BASE"..HEAD | grep -q '^src/llmShield/'; then
  echo "stage3p policy-drift: FAIL — src/llmShield changed in this branch"
  exit 1
fi
echo "stage3p policy-drift: PASS (no src/llmShield change in branch)"
