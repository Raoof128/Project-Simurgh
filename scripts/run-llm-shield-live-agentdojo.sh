#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 1-LIVE: AgentDojo with a REAL OpenAI agent. OPT-IN and KEYED.
#
# Safe no-op without OPENAI_API_KEY (so it never runs in CI / never spends money).
# Provide the key to actually run:
#   OPENAI_API_KEY=sk-... scripts/run-llm-shield-live-agentdojo.sh [--defended] [--model M] [--max-user-tasks N]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  cat <<'MSG'
[stage-1-live] OPENAI_API_KEY is not set -- nothing to run (this is intentional).

To run the live AgentDojo agent evaluation (costs OpenAI tokens):
  export OPENAI_API_KEY=sk-...
  scripts/run-llm-shield-live-agentdojo.sh                 # baseline (undefended)
  scripts/run-llm-shield-live-agentdojo.sh --defended      # routed through the local gateway

Defended runs also need the local Simurgh gateway running on 127.0.0.1:33030.
Output (metadata-only) lands in docs/research/llm-shield/evidence/stage-1-live/.
MSG
  exit 0
fi

PY="tools/agentdojo-simurgh-adapter/.venv-stage3i/bin/python"
[ -x "$PY" ] || { echo "ERROR: AgentDojo venv not found at $PY (install agentdojo==0.1.30)" >&2; exit 1; }

OUT="docs/research/llm-shield/evidence/stage-1-live"
mkdir -p "$OUT"
echo "[stage-1-live] running live AgentDojo agent ($*)"
PYTHONPATH="tools/agentdojo-simurgh-adapter" "$PY" -m simurgh_agentdojo_adapter.stage1_live_runner --out "$OUT" "$@"
echo "[stage-1-live] done -> $OUT (metadata-only)"
