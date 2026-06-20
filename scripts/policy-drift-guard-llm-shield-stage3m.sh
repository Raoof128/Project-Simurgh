#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Fix 3: Stage 3M is a MEASUREMENT stage, not a defence change. This guard fails
# if the branch diff vs main touches any containment-policy source file. A
# legitimate change must be added to the ALLOWLIST below with a justification.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE="${SIMURGH_STAGE3M_DIFF_BASE:-main}"

# Containment-policy files Stage 3M must not modify.
PROTECTED=(
  "src/llmShield/contextProvenanceGuard.js"
  "src/llmShield/contextCanonicalise.js"
  "src/llmShield/promptContextGuard.js"
  "src/llmShield/toolInvocationGate.js"
  "src/llmShield/toolPolicy.js"
  "src/llmShield/outputLeakageFirewall.js"
  "src/llmShield/promptFirewall.js"
  "src/llmShield/gateway/gatewayRouter.js"
  "src/llmShield/gateway/liveProviderGuard.js"
)

# Explicitly justified exceptions (path # reason). Empty by default.
ALLOWLIST=()

changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null || true)"

violation=0
for f in "${PROTECTED[@]}"; do
  if grep -qxF "$f" <<<"$changed"; then
    allowed=0
    for a in "${ALLOWLIST[@]:-}"; do
      [[ "$a" == "$f"* ]] && allowed=1
    done
    if [[ "$allowed" == "0" ]]; then
      echo "stage3m policy-drift FAIL: containment-policy file modified: $f"
      violation=1
    fi
  fi
done

if [[ "$violation" == "1" ]]; then
  echo "Stage 3M must not change defence logic. Add a justified ALLOWLIST entry if intentional."
  exit 1
fi
echo "stage3m policy-drift OK"
