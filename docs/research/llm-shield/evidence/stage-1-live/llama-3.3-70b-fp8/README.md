# Stage 1-LIVE — Llama-3.3-70B-FP8 live agent: baseline vs in-loop defences

Run live on 2026-06-25. The first Stage 1-LIVE run with a **non-zero baseline ASR**, and a
sequence of three live A/Bs of in-loop Simurgh defences. Metadata-only; no prompts, provider
bodies, or keys are committed.

## Three-experiment arc (all on the same 10×14 = 140-attack set; class labels pre-registered)

| Defence                            | Mechanism                                                         | ASR               | Benign                            | Verdict                                                       |
| ---------------------------------- | ----------------------------------------------------------------- | ----------------- | --------------------------------- | ------------------------------------------------------------- |
| Demotion (this dir, below)         | advisory: wrap untrusted tool output as "data, don't obey"        | 10/140 → 8/140    | 8/10→6/10                         | **failed** — advisory, not containment                        |
| Egress gate (`egress-gate/`)       | structural: block egress to a destination not in the trusted task | 9/140 → **4/140** | 7/10→7/10 (0 false blocks)        | **scoped win** — all egress contained; `delete_only` survives |
| Authority gate (`authority-gate/`) | egress + destructive-mutation gate                                | 9/140 → **0/140** | 7/10→6/10 (1 regr., likely noise) | **full containment in declared taxonomy**                     |

Headline: **demotion (asking the model nicely) fails; structural action-gating succeeds.**
Within a declared action taxonomy (egress + destructive mutation) and a task-grounded
authorisation policy, a fooled live agent achieved **0 unauthorised side-effects** (all 9
baseline successes contained), at a cost of ≤1 over-blocked benign task. This is CaMeL's
capability-gating lineage; Simurgh's lane is the pre-registered, metadata-only,
by-class **evidence + explicit non-claims**, not the gating idea. Non-claims: not jailbreak
immunity, not injection prevention, taxonomy excludes non-destructive mutation / financial /
code (future capability-kernel families).

---

## (Below) Experiment 1 — demotion A/B (the honest negative result)

## Setup

- **Agent model:** `RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic` (FP8 quant of the official
  Meta Llama-3.3-70B-Instruct), served with vLLM (tool-calling enabled) on one H100, greedy
  decoding (temperature 0, seed 0) for byte-reproducible replay.
- **Benchmark:** pinned AgentDojo `workspace` suite, 10 user tasks × all 14 injection goals
  = 140 attack cases + 10 benign, canonical `important_instructions` attack.
- **Defence (defended arm):** every tool output is routed through the REAL gateway
  context-provenance guard (`guardContexts`) and rewritten before the model sees it —
  `demoted` content is wrapped as "untrusted data, do not obey"; `rejected` content is
  withheld. The gateway is authoritative; the adapter only transports and applies.

## Result (honest A/B)

| Metric                | Baseline (undefended) | Defended (in-loop gateway)                 |
| --------------------- | --------------------- | ------------------------------------------ |
| Targeted ASR          | **10/140 (7.1%)**     | **8/140 (5.7%)**                           |
| Benign utility        | **8/10**              | **6/10**                                   |
| Utility-under-attack  | 78/140 (56%)          | 65/140 (46%)                               |
| Task completion       | 150/150               | 150/150                                    |
| Tool outputs mediated | —                     | 550 (531 demoted, 19 rejected, 0 accepted) |

## Conclusion — this is NOT a containment win, and we do not present it as one

**Provenance demotion alone does not meaningfully contain a live model, and it costs
utility.** The defence reduced targeted ASR by only 2 of 10 successes (10→8 of 140 — within
noise; the 95% confidence intervals overlap) while dropping benign utility 8/10 → 6/10 and
utility-under-attack 56% → 46%.

The mechanism explains it. `important_instructions` does not match the gateway's content
rejection rules (authority-assertion / secret-marker regexes), so it is **demoted**, not
rejected. Demotion wraps the injected text as "untrusted data; do not obey" — but
Llama-3.3-70B largely **obeyed the injection anyway**, and the wrapping degraded some benign
tasks. In short:

> **Demotion-only provenance wrapping is advisory, not live behavioural containment.**
> Telling a capable model to "treat this as data" does not reliably stop it from following
> an embedded instruction.

This is a deliberately reported negative result. It separates cleanly from the next stage:

- **demotion failed** (advisory only) → **action-level containment is next**: route the
  agent's _tool calls_ through the tool-invocation gate / output-leakage firewall so the
  malicious _action_ is blocked regardless of whether the model was fooled. That is the
  faithful enforcement of "untrusted content must not gain authority to act," and is left as
  the next Stage 1-LIVE step (tool-gate defence). No claim is made about it here.

## Files

`baseline-*.json`, `defended-*.json` (metrics, suite-breakdown, taxonomy, manifest) — all
metadata-only, produced by the committed runner. `defended-manifest.json` records the
per-tool-output mediation tally.
