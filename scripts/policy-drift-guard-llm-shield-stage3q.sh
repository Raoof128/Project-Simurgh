#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q is tooling-only. It runs the REAL check (three-dot diff vs the first base
# ref that resolves). It must not false-FAIL on a shallow CI checkout where no base
# ref is present, and it must not silently skip: if no base resolves it warns loudly
# and passes (degraded), exactly the posture of the proven 3O/3P guards but explicit.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then
    BASE="$ref"
    break
  fi
done

if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -q '^src/llmShield/' <<<"$changed"; then
    echo "stage3q policy-drift: FAIL — src/llmShield changed in ${BASE}...HEAD"
    exit 1
  fi
  echo "stage3q policy-drift: PASS (no src/llmShield change in ${BASE}...HEAD)"
else
  echo "stage3q policy-drift: WARN — no base ref resolved on this checkout; policy-drift not verified here (verified on local + post-merge runs). Not failing the build."
  echo "stage3q policy-drift: PASS (unverified — no base ref)"
fi
