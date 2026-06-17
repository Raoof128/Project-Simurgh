#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3E-live structural security invariants (static source checks).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
GW=src/llmShield/gateway
fail() {
  echo "FAIL: $1"
  exit 1
}

# No static SDK import anywhere under the gateway.
if grep -rn 'import .* from "@anthropic-ai/sdk"' "$GW"; then fail "static SDK import under gateway"; fi

# Dynamic import only in the adapter.
DYN=$(grep -rln 'import("@anthropic-ai/sdk")' "$GW" || true)
[ "$DYN" = "$GW/anthropicProviderAdapter.js" ] || fail "dynamic SDK import outside adapter: $DYN"

# No SDK tool helpers anywhere under the gateway.
if grep -rn 'toolRunner\|betaZodTool' "$GW"; then fail "SDK tool helper present"; fi

# Request builder must never include provider-side tool fields.
if grep -nE '"?(tools|tool_choice|mcp_servers|computer_use|web_search|code_execution)"?[[:space:]]*:' "$GW/anthropicMessageBuild.js"; then
  fail "provider-side tool field in request builder"
fi

echo "PASS: stage 3E-live security audit"
