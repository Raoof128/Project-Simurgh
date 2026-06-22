#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Resolve a real base; warn-pass only if none can be resolved (shallow-checkout safety).
BASE=""
for ref in origin/main main; do
  if git rev-parse --verify --quiet "$ref" >/dev/null; then
    BASE="$ref"
    break
  fi
done
if [[ -z "$BASE" ]]; then
  echo "policy-drift-3v: no base ref; warn-pass"
  exit 0
fi
CHANGED="$(git diff --name-only "$BASE...HEAD" -- src/llmShield || true)"
if [[ -n "$CHANGED" ]]; then
  echo "policy-drift-3v: Stage 3V-A is tooling-only but src/llmShield changed:" >&2
  echo "$CHANGED" >&2
  exit 1
fi
echo "policy-drift-3v: PASS (no src/llmShield changes)"
