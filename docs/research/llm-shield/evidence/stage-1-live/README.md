# Stage 1-LIVE — AgentDojo with a real agent (run, with caveats)

This is the **keyed** external-validity experiment: the pinned AgentDojo benchmark
driven by a **live model** instead of the deterministic Stage 3H–3J pipeline. It runs
against either an OpenAI-hosted model or a self-hosted OpenAI-compatible endpoint
(vLLM on RunPod) — see `RUNPOD-LLAMA-RUNBOOK.md`.

## Results by model

- **`gpt-5.4-mini/`** — frontier OpenAI model. Benign 5/5, **targeted ASR 0** (natively
  resists `injecagent` and the canonical `important_instructions`). Honest null: a
  zero baseline means there is nothing for a downstream layer to contain. (Also where the
  AgentDojo tool-serialization bug was found and fixed.)
- **`llama-3.3-70b-fp8/`** — self-hosted open model, the first run with a **non-zero
  baseline** (ASR 10/140) and the first live A/B of an in-loop gateway defence. Honest
  finding: **provenance demotion alone does not contain a live model** (ASR 10→8, within
  noise) and costs utility (benign 8/10 → 6/10). Demotion is advisory, not live behavioural
  containment; action-level (tool-gate) containment is the next step. See its README.

## Why it matters

Stages 3H–3J ran AgentDojo with a deterministic ground-truth pipeline, so the
**baseline (undefended) attack success was trivially 0/949** — no LLM was present to
be fooled, and Simurgh's guards never fired. This stage replaces the deterministic
agent with a real model so the baseline ASR can, in principle, be non-zero, giving a
downstream containment layer something real to contain.

## How to run (opt-in, costs tokens)

```bash
export OPENAI_API_KEY=sk-...
scripts/run-llm-shield-live-agentdojo.sh --model gpt-5.4-mini --max-user-tasks 5 --max-injection-tasks 6
scripts/run-llm-shield-live-agentdojo.sh --model gpt-5.4-mini --defended   # routes through the local gateway
```

Defended runs also need the local Simurgh gateway on `127.0.0.1:33030`. Output
(metadata-only) lands in this directory.

## What we found (run live 2026-06-25, model `gpt-5.4-mini`)

### 1. A real AgentDojo bug had to be fixed first

AgentDojo 0.1.30's `_message_to_openai` serializes **tool results** as its internal
content blocks `[{"type":"text","content": ...}]`. OpenAI's schema requires the key
`text`, not `content`. Older chat models tolerated the malformed part; a modern
reasoning model (gpt-5.4-mini) reads it as an **empty** tool result and refuses
("I couldn't retrieve …"), collapsing benign utility to ~0.

This is what made the earlier exploratory runs look degenerate. It is **not** a
property of the model and **not** Simurgh catching anything — it is a library
incompatibility. The runner now repairs it (`make_modern_model_compatible`), changing
only tool-output serialization, never scoring, environments, tasks, or attack
payloads.

| gpt-5.4-mini, workspace, 5 user tasks | benign utility |
| ------------------------------------- | -------------- |
| AgentDojo 0.1.30 as-shipped           | **0/5**        |
| with the serialization fix            | **5/5**        |

A second, smaller fix registers the live model name so AgentDojo's canonical
`important_instructions` attack (which otherwise hard-fails on post-2024 model
strings) can name it. This only fills the `{model}` slot of the jailbreak text.

### 2. The honest security result

With the fix applied, against `gpt-5.4-mini` on the `workspace` suite:

- **Benign utility: 5/5** — the model is strong and completes its own tasks.
- **Targeted ASR: 0** — `0/30` with `injecagent`, and `0/42` with the canonical
  `important_instructions` attack covering **all 14 injection goals** (×3 user tasks).
- **Utility-under-attack: 25–42 / case** — the model keeps doing its real task and
  ignores the injected instructions.

The committed artifacts here are a 5×6 baseline slice (benign 5/5, ASR 0/30,
utility-under-attack 29/30) produced by the committed runner.

### 3. What this does and does not show

- It **does** show the live harness is now valid for current models, and that a
  frontier-class model natively resists AgentDojo's stock workspace attacks.
- It **does not** show a Simurgh containment win, and we will not present it as one.
  A **zero baseline ASR means there is no successful attack for a downstream
  containment layer to catch** — a defended run would also be 0, exactly like the
  deterministic Stage 3J. Demonstrating live containment requires a **non-zero**
  baseline, i.e. a capable-but-foolable weaker model or a stronger adaptive attack.
  That remains genuine future work.

## Honesty / status

- **Harness verified live (2026-06-25)** end-to-end against the real OpenAI API and the
  pinned AgentDojo `workspace` suite, via the committed runner.
- Earlier exploratory note (kept for the record): `gpt-4o-mini-2024-07-18` looked
  degenerate (benign ~1/12) and `gpt-4o-2024-05-13` 429'd on the test key's 30k-TPM
  tier. The benign-utility collapse is now explained by the serialization bug above,
  not (only) model weakness.
- **No raw prompts, provider bodies, or API keys** are committed. The test key never
  touched any committed file. Committed output is aggregated metadata only.

## Files written by a run

`workspace-live-metrics.json`, `workspace-live-suite-breakdown.json`,
`workspace-live-taxonomy.json`, `live-manifest.json` — all metadata-only.
