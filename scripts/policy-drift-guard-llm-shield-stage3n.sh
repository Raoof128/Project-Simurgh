#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3N is a MEASUREMENT stage, not a defence change. Fails if the branch diff
# vs main touches any containment-policy source file.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BASE="${SIMURGH_STAGE3N_DIFF_BASE:-main}"
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
ALLOWLIST=()
changed="$(git diff --name-only "${BASE}...HEAD" 2>/dev/null || true)"
violation=0
for f in "${PROTECTED[@]}"; do
  if grep -qxF "$f" <<<"$changed"; then
    allowed=0
    for a in "${ALLOWLIST[@]:-}"; do [[ "$a" == "$f"* ]] && allowed=1; done
    if [[ "$allowed" == "0" ]]; then
      echo "stage3n policy-drift FAIL: containment-policy file modified: $f"
      violation=1
    fi
  fi
done
[[ "$violation" == "0" ]] && echo "stage3n policy-drift: passed" || exit 1
