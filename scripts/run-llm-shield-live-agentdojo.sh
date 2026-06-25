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

# A self-hosted OpenAI-compatible endpoint (vLLM on RunPod) is selected with --base-url
# and needs no real OpenAI key; only the OpenAI-hosted path requires OPENAI_API_KEY.
case " $* " in *" --base-url "*) HAS_BASE_URL=1 ;; *) HAS_BASE_URL=0 ;; esac

if [ -z "${OPENAI_API_KEY:-}" ] && [ "$HAS_BASE_URL" -eq 0 ]; then
  cat <<'MSG'
[stage-1-live] OPENAI_API_KEY is not set and no --base-url given -- nothing to run (intentional).

OpenAI-hosted (costs tokens):
  export OPENAI_API_KEY=sk-...
  scripts/run-llm-shield-live-agentdojo.sh --model gpt-4o-2024-05-13

Self-hosted open model on RunPod (vLLM, no real key needed):
  # On the pod:  vllm serve meta-llama/Llama-3.3-70B-Instruct \
  #                --enable-auto-tool-choice --tool-call-parser llama3_json
  scripts/run-llm-shield-live-agentdojo.sh \
    --model meta-llama/Llama-3.3-70B-Instruct \
    --base-url https://<pod>-8000.proxy.runpod.net/v1 --greedy
  scripts/run-llm-shield-live-agentdojo.sh ... --base-url ... --defended   # through the gateway

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
