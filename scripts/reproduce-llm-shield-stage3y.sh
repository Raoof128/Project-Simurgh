#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Y reproduction: render the third-party AgentDojo attack corpus, drive it
# through the real Simurgh boundaries, and regenerate metadata-only evidence.
# Requires the AgentDojo venv from the Stage 3I adapter (agentdojo installed).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PY="tools/agentdojo-simurgh-adapter/.venv-stage3i/bin/python"
EVID="docs/research/llm-shield/evidence/stage-3y"
RUNTIME_DIR="$(mktemp -d)"
RUNTIME="$RUNTIME_DIR/runtime-corpus.json"
trap 'rm -rf "$RUNTIME_DIR"' EXIT

if [ ! -x "$PY" ]; then
  echo "ERROR: AgentDojo venv not found at $PY (install agentdojo==0.1.30 per Stage 3I)" >&2
  exit 1
fi

mkdir -p "$EVID"
echo "[1/3] Extracting third-party AgentDojo corpus (metadata-only manifest committed)"
"$PY" tests/e2e/llm_shield_stage3y_corpus_extract.py "$RUNTIME" "$EVID/corpus-provenance.json"

echo "[2/3] Driving corpus through real Simurgh boundaries"
node tests/e2e/llm_shield_stage3y_boundary_runner.mjs "$RUNTIME" "$EVID"

echo "[3/3] Privacy check: no raw payload text in committed evidence"
if grep -RIlE "Ignore your previous|INFORMATION|system_message\)" "$EVID" >/dev/null 2>&1; then
  echo "ERROR: raw payload text leaked into committed evidence" >&2
  exit 1
fi
echo "stage 3y reproduction: PASS"
