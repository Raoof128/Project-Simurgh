# Stage 1-LIVE — AgentDojo with a real OpenAI agent (prepared, not yet run)

This is the **prepared, keyed** experiment. It is the only one of the three external-
validity directions that needs a paid API and so is left runnable behind a key.

## Why it matters

Stages 3H-3J ran AgentDojo with a deterministic ground-truth pipeline, so the
**baseline (undefended) attack success was trivially 0/949** — no LLM was present to
be fooled, and Simurgh's guards never fired. That run therefore cannot show the
defense doing anything. This stage replaces the deterministic agent with a **live
OpenAI model**, so the baseline ASR is expected to be **non-zero**, giving the
defended run something real to contain.

## How to run (opt-in, costs tokens)

```bash
export OPENAI_API_KEY=sk-...
scripts/run-llm-shield-live-agentdojo.sh                # baseline (undefended)
scripts/run-llm-shield-live-agentdojo.sh --defended     # routed through the local gateway
```

Cost control: defaults to the `workspace` suite, `gpt-4o-mini`, and `--max-user-tasks 5`.
Defended runs also need the local gateway on `127.0.0.1:33030`.

## Honesty / status

- **UNVERIFIED until first keyed run.** The live pipeline construction has not been
  executed (no key in this environment); the first real run may need iteration.
- The metrics aggregator it reuses (`build_stage3j_artifacts`) is already unit-tested.
- No evidence numbers are committed here yet — this directory holds only this README
  until a real keyed run produces metadata-only metrics.
- Output is metadata-only (no raw prompts, provider bodies, or API keys).

## What a successful run will write here

`workspace-live-metrics.json`, `workspace-live-suite-breakdown.json`,
`workspace-live-taxonomy.json`, `live-manifest.json` — all metadata-only.
