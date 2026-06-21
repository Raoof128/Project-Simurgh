#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3T is tooling-only: assert NO src/llmShield change. Resolves a real base; if none
# resolves, FAIL CLOSED (CI uses fetch-depth:0 so a base is present).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then BASE="$ref"; break; fi
done
if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -q '^src/llmShield/' <<<"$changed"; then
    echo "stage3t policy-drift: FAIL — src/llmShield changed in ${BASE}...HEAD"
    exit 1
  fi
  echo "stage3t policy-drift: PASS (no src/llmShield change in ${BASE}...HEAD)"
else
  wt="$(git diff --name-only HEAD -- src/llmShield 2>/dev/null; git status --porcelain src/llmShield 2>/dev/null)"
  if grep -q 'src/llmShield' <<<"$wt"; then
    echo "stage3t policy-drift: FAIL — src/llmShield changed (working tree) and no base ref"
    exit 1
  fi
  if [ "${CI:-}" = "true" ]; then
    echo "stage3t policy-drift: FAIL — no base ref resolved in CI (fail-closed)"
    exit 1
  fi
  echo "stage3t policy-drift: WARN — no base ref resolved locally; verified on PR/post-merge CI"
fi
