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

- **Harness verified live (2026-06-24).** The runner was executed end-to-end against
  the real OpenAI API and the pinned AgentDojo `workspace` suite. Two first-run bugs
  were fixed during that session: AgentDojo's `NullLogger` does not register a logdir
  on `__enter__` (use `OutputLogger`), and `SuiteResults` is a `TypedDict` (subscript,
  not attribute access).
- **The result on the available key was inconclusive, and we will not dress it up.**
  - `gpt-4o-mini-2024-07-18`, 12 user x 6 injection tasks: benign utility **1/12 (~8%)**,
    targeted ASR **0/72**. The agent is too weak to complete its own tasks, so it is
    also never productively hijacked -- a degenerate test, not a defense result (the
    same failure mode as the deterministic Stage 3J pipeline, for a different reason).
  - `gpt-4o-2024-05-13` (the capable model that would be a valid test) could not run:
    the test key's org is on a 30k tokens/min tier and each AgentDojo call is ~30k
    tokens, so it 429s immediately.
- **Conclusion:** a valid live-agent evaluation needs a capable model (gpt-4o class)
  with adequate rate limits. That is genuine future work, not something this key tier
  supports. The metrics aggregator it reuses (`build_stage3j_artifacts`) is unit-tested.
- **No live evidence numbers are committed here** -- the degenerate run is not a result.
  Output, when a valid run happens, is metadata-only (no raw prompts, provider bodies,
  or API keys; the test key never touched any committed file).

## What a successful run will write here

`workspace-live-metrics.json`, `workspace-live-suite-breakdown.json`,
`workspace-live-taxonomy.json`, `live-manifest.json` — all metadata-only.
