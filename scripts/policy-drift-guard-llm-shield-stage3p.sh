#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3P is tooling-only: assert no src/llmShield change is bundled with 3P work.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# Branch-wide scope: three-dot diff vs the base merge-base so an early bad commit
# cannot hide behind later clean commits. `main` resolves in CI; `|| true` keeps
# the diff itself from hard-failing on a shallow checkout (matches the 3O guard).
BASE="${SIMURGH_POLICY_BASE_REF:-main}"
changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null || true)"
if grep -q '^src/llmShield/' <<<"$changed"; then
  echo "stage3p policy-drift: FAIL — src/llmShield changed in this branch"
  exit 1
fi
echo "stage3p policy-drift: PASS (no src/llmShield change in branch)"
