#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3U is additive: assert NO change to Stage 3T v1 modules or stage-3t evidence, and
# prove 3T historical evidence still reproduces. Fails closed (same base resolution as policy-drift).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
V1='^(tools/simurgh-extraction/(metaSet|signalFamilies|detector|renderer|selfProof|simurgh-extraction|sign-3t-attestation|verify-stage3t-attestation)\.mjs|docs/research/llm-shield/evidence/stage-3t/)'
BASE=""
for ref in "${SIMURGH_POLICY_BASE_REF:-}" origin/main main HEAD^1 HEAD~1; do
  [ -z "$ref" ] && continue
  if git rev-parse --verify --quiet "${ref}^{commit}" >/dev/null 2>&1; then BASE="$ref"; break; fi
done
if [ -n "$BASE" ] && changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null)"; then
  if grep -Eq "$V1" <<<"$changed"; then
    echo "stage3u v1-freeze: FAIL — a Stage 3T v1 module or stage-3t evidence changed in ${BASE}...HEAD"
    exit 1
  fi
  echo "stage3u v1-freeze: PASS (no 3T v1 / stage-3t evidence change in ${BASE}...HEAD)"
elif [ "${CI:-}" = "true" ]; then
  echo "stage3u v1-freeze: FAIL — no base ref resolved in CI (fail-closed)"
  exit 1
else
  echo "stage3u v1-freeze: WARN — no base ref resolved locally; verified on PR/post-merge CI"
fi
# Always prove 3T historical evidence still reproduces.
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce >/dev/null
echo "stage3u v1-freeze: 3T historical evidence still reproduces"
