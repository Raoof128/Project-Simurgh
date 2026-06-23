#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE=""
for ref in origin/main main; do
  if git rev-parse --verify --quiet "$ref" >/dev/null; then
    BASE="$ref"
    break
  fi
done
if [[ -z "$BASE" ]]; then
  echo "policy-drift-3x: no base ref; warn-pass"
  exit 0
fi
CHANGED="$(git diff --name-only "$BASE...HEAD" -- src/llmShield || true)"
if [[ -n "$CHANGED" ]]; then
  echo "policy-drift-3x: Stage 3X is tooling-only but src/llmShield changed:" >&2
  echo "$CHANGED" >&2
  exit 1
fi
echo "policy-drift-3x: PASS (no src/llmShield changes)"
