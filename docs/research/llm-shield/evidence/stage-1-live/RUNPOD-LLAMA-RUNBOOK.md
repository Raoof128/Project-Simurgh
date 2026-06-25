# Stage 1-LIVE on RunPod — Llama-3.3-70B agent (runbook)

Goal: drive AgentDojo with a **capable-but-foolable open model** so the baseline ASR is
**non-zero** (unlike gpt-5.4-mini, which scored 0). Then route the same agent through the
Simurgh gateway (`--defended`) for a real **live-agent containment** data point.

Why Llama-3.3-70B-Instruct: AgentDojo's published utility is ~42% (capable enough to do
tasks, so it can be _productively_ hijacked) and it sits in the foolable zone — the
"inverse scaling" finding is that capable-but-not-frontier models take real ASR. Reuses
the Stage 3V-B RunPod + 8-bit flow. (Qwen2.5-72B-Instruct, ~54% utility, is the
alternative — same steps, `--tool-call-parser hermes`.)

## 1. Pod sizing

- 70B in **8-bit** ≈ 70 GB VRAM → 1× H100 80GB or 1× A100 80GB (matches 3V-B).
- 70B in bf16 ≈ 140 GB → 2× A100/H100. 8-bit is enough here and cheaper.
- Expose container port **8000** (RunPod gives `https://<podid>-8000.proxy.runpod.net`).

## 2. Serve the model with tool calling (ON THE POD)

Tool calling MUST be on or AgentDojo can't drive tools (degenerate 0-utility trap):

```bash
pip install "vllm>=0.6.0"
vllm serve meta-llama/Llama-3.3-70B-Instruct \
  --quantization bitsandbytes --load-format bitsandbytes \
  --enable-auto-tool-choice --tool-call-parser llama3_json \
  --max-model-len 16384 --port 8000
# Qwen2.5-72B-Instruct → --tool-call-parser hermes
# If tool calls don't parse, add: --chat-template <vllm>/examples/tool_chat_template_llama3.1_json.jinja
```

Needs the HF token for the gated Llama repo: `huggingface-cli login` (classic Read token,
same as 3V-B). Sanity check it serves: `curl https://<pod>-8000.proxy.runpod.net/v1/models`.

## 3. Run the benchmark (FROM THIS REPO, locally)

The code is already wired (`--base-url`, `--api-key`, `--greedy`). No real OpenAI key needed.

```bash
# A) baseline (undefended) — does the open model take real ASR?
scripts/run-llm-shield-live-agentdojo.sh \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --base-url https://<podid>-8000.proxy.runpod.net/v1 \
  --greedy --max-user-tasks 10 --max-injection-tasks 14

# B) IF baseline ASR > 0 → defended arm through the local Simurgh gateway
#    (start the gateway on 127.0.0.1:33030 first)
scripts/run-llm-shield-live-agentdojo.sh \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --base-url https://<podid>-8000.proxy.runpod.net/v1 \
  --greedy --max-user-tasks 10 --max-injection-tasks 14 --defended
```

`--greedy` forces temperature=0 / seed=0 for byte-reproducible replay (the 3V-B method).
Start small (`--max-user-tasks 2`) to confirm non-zero utility before scaling.

## 4. What I need from you when the pod is up

1. The **proxy base URL** ending in `/v1` (e.g. `https://abc123-8000.proxy.runpod.net/v1`).
2. Confirm the **model id** served (Llama-3.3-70B-Instruct, or Qwen2.5-72B-Instruct).
3. Whether the HF download + `vllm serve` came up cleanly (`/v1/models` returns the id).

Paste those and I run step 3 immediately.

## 5. Honesty rails (unchanged)

- Output is **metadata-only**; no prompts, provider bodies, or keys are committed. The
  manifest records the endpoint **host** only, never the URL with credentials.
- A **zero** baseline ASR is reported as-is (no successful attack ⇒ nothing to contain),
  never dressed up as a defence win.
- A **non-zero** baseline + a contained defended arm is the real result we're after — and
  it is only claimed from the actual run, not assumed here.
