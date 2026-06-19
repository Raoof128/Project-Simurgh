#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${SIMURGH_STAGE3H_LAYER2_PYTHON:-python3}"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage3h-layer2-e2e.XXXXXX")"
OUT="$TMP_ROOT/evidence"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

cd "$ROOT"
PYTHONPATH="$ROOT/tools/agentdojo-simurgh-adapter${PYTHONPATH:+:$PYTHONPATH}" \
  "$PYTHON_BIN" tools/agentdojo-simurgh-adapter/tests/stage3h_layer2_e2e_smoke.py \
  --sample-manifest docs/research/llm-shield/evidence/stage-3h-layer2/sample-manifest.json \
  --out "$OUT"

SIMURGH_STAGE3H_LAYER2_EVIDENCE_DIR="$OUT" \
  node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs
SIMURGH_STAGE3H_LAYER2_EVIDENCE_DIR="$OUT" \
  node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs

echo "stage3h-layer2 deterministic e2e smoke: passed"
