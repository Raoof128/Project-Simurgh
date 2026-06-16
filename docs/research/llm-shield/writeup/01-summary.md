<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Measured Prompt-Injection Boundary Hardening in the Simurgh LLM Shield

**Raouf** · raoof.r12@gmail.com · One-page research summary (Stages 3A–3C)

## The problem

A frontier lab recently stated, when suspending two of its own models, that "perfect
jailbreak resistance is not currently possible for any model provider," and that its
strategy is defence-in-depth plus monitoring rather than immunity. If even the model
provider cannot promise resistance, the useful unit of work shifts: the application
layer needs a way to _prove what its safety boundary did_ on every input, not a claim
that the boundary is perfect. Most deployed prompt-injection filters report a single
efficacy number and rely on pattern matching that, by the literature's own account,
cannot keep pace with evolving obfuscation. They rarely publish a frozen benchmark, an
audit trail, or an honest failure baseline.

## What I built

Simurgh LLM Shield is an application-layer, pre-provider boundary that classifies user
input before any model call and emits a tamper-evident, metadata-only receipt for every
decision (`safe` / `warning` / `blocked`), chained under HMAC. I developed it as a
deliberate three-stage arc, and the discipline of the arc is the contribution as much
as the detector:

- **3A — seed.** A minimal input-only boundary with deterministic phrase matching.
- **3B — honest failure.** A frozen adversarial corpus (30 attacks across 10
  obfuscation styles + 15 benign, including 5 hard negatives) that measured the _seed_
  detector at **2/30** detection and published it as the baseline, not a result to hide.
- **3C — measured hardening.** A deterministic _canonicalize-then-classify_ pipeline
  (Unicode homoglyph folding, leet/symbol de-stuffing, base64 decode-for-inspection),
  plus a framing-aware context guard and a new `warning` tier — improving detection
  **without editing a single corpus payload**.

## Result (against the frozen corpus)

| Metric                                | Seed (3B) | Hardened (3C) |
| ------------------------------------- | --------- | ------------- |
| adversarial detection                 | 2/30      | **18/30**     |
| clean-benign pass                     | 10/10     | **10/10**     |
| hard-negative blocked false positives | 2/5       | **0/5**       |

An ablation isolates _why_: canonicalization drives recall (5→14→18 across stages),
while the context guard contributes **zero** additional detection and exists purely to
cut false positives (2/5 → 0/5) by de-escalating quoted/educational uses of attack
phrases to `warning` instead of blocking them. Recall and precision are improved by
separate, legible mechanisms. On a **held-out** set of 12 new variants authored _after_
the detector was frozen and never used to tune it, detection generalizes to **7/9**;
the two misses are the same semantic-intent styles that miss on the frozen corpus,
indicating a real capability ceiling rather than overfitting.

## Why this is the right shape

The work is honest about its own limits by construction. The baseline was published at
2/30; the success criterion was "strictly improve under fixed guardrails," never a
target number that would tempt gaming; the corpus is frozen with cryptographic digests;
and the held-out probe is the test most likely to embarrass the method. Everything is
reproducible from three commands.

## Non-claims

This does **not** prove jailbreak immunity or provider-level model safety; it uses no
live model; it does not yet handle untrusted retrieved context, tools, or multi-turn
memory. Detection is deterministic and incomplete by construction. Receipts attest
_process_ — what the boundary did — not ground truth.

## Why Anthropic

I did not set out to imitate a house style; I arrived at the same posture from the
evidence. Measure honestly, monitor, mitigate, and stay candid about residual risk is how
I built this — I published a 2/30 failure before I improved it, refused to set a target
that would tempt gaming, and shipped the test most likely to embarrass the method. That is
the kind of empirical care I would want to apply to the boundaries that matter more than a
single-turn input filter: untrusted retrieved context, tool use, and live models. I am not
looking for a place to learn the values from scratch — I am looking for the right people,
problems, and scale to apply them to. If that resonates, the three commands above
reproduce everything in this summary; the work can speak before I do.

_Full results, ablation, and limitations: `STAGE_3C_FINDINGS.md`. Motivation and
literature: `RELATED_WORK.md`. Reproduce: `scripts/smoke-llm-shield-bench.sh`,
`node tests/e2e/llm_shield_ablation_runner.mjs`,
`node tests/e2e/llm_shield_heldout_runner.mjs`._
