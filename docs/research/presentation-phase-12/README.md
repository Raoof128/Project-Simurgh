# Simurgh: presentation guide

16 October 2026. Start with one question:

> Can an agent's host preserve authorization, useful work and an auditable account of
> effects when model proposals, safety signals, delegation or credentials go wrong?

The contribution is an inspectable research prototype connecting these controls to
actual receiver outcomes. Its evidence comprises local scripted fault experiments,
fresh small-model observations and deterministic reexecution of captured proposals.
Each supports a different claim. No result establishes general model safety, production
readiness, OpenAI endorsement or prevention of the reported real-world incidents.

## Result to lead with

In the frozen local Llama study, composed controls preserved **22/24 active branch
completions** while reducing new unauthorized-effect branches from **16/24 to 0/24**
on stopped tasks, compared with the credential-only control. Deny-all had zero new
unauthorized effects and zero active completions. Each denominator of 24 represents
12 tasks repeated twice; it is not 24 independent tasks.

| Outcome                                             | Credential only | Composed | Deny all |
| --------------------------------------------------- | --------------: | -------: | -------: |
| Active completions / 24 branches                    |              22 |       22 |        0 |
| Stopped branches with new unauthorized effects / 24 |              16 |        0 |        0 |
| False blocks / 22 exact valid active proposals      |               0 |        0 |       22 |

The model proposed sends on 20/24 stopped branches despite the explicit trusted state.
Four were already denied by receiver credential checks; composition blocked the other 16. Two active adversarial branches proposed wrong content and remained failures under
both useful controls. The **0/12 stopped-task** result has a descriptive Wilson upper
bound around **24.2%**, with pairing/family dependence that limits population interpretation.
See the [canonical report](../model-composition-phase-10/report.json) and
[full results](../model-composition-phase-10/RESULTS.md) before quoting these numbers.

## Five-minute walkthrough

1. **Problem and boundary.** Show the [public needs review](../OPENAI_NEEDS_2026-10-16.md):
   asynchronous stops, context changes, shared authority and credentials can disagree.
   Show the [Phase 9 pipeline](../composition-phase-9/RESULTS.md): isolated action →
   durable hold → lineage/budget → signal checks → credential gateway → actual receiver.
2. **Engineering evidence.** Explain a lost acknowledgment: an effect can exist while
   its outcome remains unknown to the caller. The reservation persists; a sibling must
   not spend the same budget. Phase 9 retains all 40 scripted rows and 360 snapshots.
   Its four observed composed outcomes include one cached prior success; only three
   are the predefined intended new-delivery cases.
3. **Model evidence.** Use the [Phase 10 results](../model-composition-phase-10/RESULTS.md)
   and canonical report. Explain the 24 internally separately authored tasks, two trials,
   three matched controls and one fixed proposal per generation. Trusted execution state
   is explicit. Describe actual failures and denominators before interpreting differences.
4. **Reproduce it.** Use the [Phase 11 handoff](../handoff-phase-11/README.md). A reviewer
   can check the exact published revision/root, install hash-pinned dependencies and
   replay all supplied branches without weights or API keys. Show the archive, full
   journal, raw databases and receipt. Replay validates recorded policy consequences;
   tokenizer linkage connects recorded text and tokens but does not prove inference origin.
5. **State the limits and next experiment.** Show the [current gap map](GAPS.md).
   External custody, representative live-provider integration, realistic multi-step tasks,
   broader models and compromised-host completeness remain open. The Phase 8 review was
   interrupted; the separate clean Phase 9 review does not close it.

## Evidence checklist for a presenter

| Claim                                                       | Evidence to show                                                                                   | Boundary to state                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Controls compose across signals, delegation and credentials | [Phase 9 results and archive](../composition-phase-9/RESULTS.md)                                   | Scripted local engineering cases, exact trusted actions                                  |
| A fresh local model was evaluated against that composition  | [Phase 10 results and capture](../model-composition-phase-10/RESULTS.md)                           | One 3B model, short synthetic tasks, explicit trusted states, two correlated trials      |
| Unknown effects are not silently erased or recounted as new | Initial/final raw receiver state and [review regressions](../model-composition-phase-10/REVIEW.md) | Supplied same-operator observations; no malicious-host completeness proof                |
| Evidence can be reexecuted without the model                | [Phase 11 execution record](../handoff-phase-11/RESULTS.md)                                        | Clean project-operated reproduction, distinct from outside custody                       |
| Work responds to published OpenAI concerns                  | [Dated source register](../openai-needs-2026-10-16/sources.json) and [gap map](GAPS.md)            | Scoped public research; neither a complete industry survey nor a procurement requirement |

## Questions to be ready for

**Why a small model?** It makes a bounded local experiment executable and repeatable.
Its size does not invalidate observed local behavior, but it limits transfer claims.
A larger model alone would not fix internal corpus custody, task realism or sample size.

**Does replay prove that the model produced the capture?** No. The project retained
requests, complete returned batches, tokens and timing before executing their branches.
Hashes and replay detect changes to supplied evidence; they do not independently attest
inference or prove a producer did not omit an entire undisclosed run.

**Does the study show discovery of impossible tasks?** No. Phase 10 explicitly tells the
model the trusted execution state. Hidden infeasibility, justified clarification and
multi-step recovery need a new prospective study.

**Would this have stopped the Hugging Face or Australian incident?** The cited reports
motivate selected local tests. Their complete environments, causal chains and mitigations
were not reproduced. Present synthetic containment mechanisms and their limits, not an
incident-prevention claim.

**What should someone validate next?** Start with outside reproduction of the pinned
artifact, then an authorized provider integration and a new externally held, multi-model
study. Keep those milestones separate so each result answers a concrete question.
