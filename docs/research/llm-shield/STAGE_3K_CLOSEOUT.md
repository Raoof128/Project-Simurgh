# Stage 3K — Closeout

Stage 3K extends the shipped Stage 3J static full-suite evidence with a
deterministic adaptive-style stress probe. It does not claim adaptive robustness
or live-model safety; it reports whether Simurgh's consequence-containment hard
gates remain clean under mutated and action-open prompt-injection variants, and
uses any measured failures to decide whether a later calibration stage is
justified.

## Status

- **CI-safe machinery:** complete (manifest, mutations, action-open, metrics,
  operator breakdown, aggregator, audits, policy-drift guard, smoke gate,
  reviewer docs). All unit-tested; audits run in full mode over the frozen
  real-run evidence.
- **Real opt-in run (3K-F):** completed against the real Simurgh gateway
  (`SIMURGH_DEMO_MODE=1` `node server.js`) using the deterministic key-free
  ground-truth pipeline via the `.venv-stage3i` AgentDojo venv. No live provider.

## Variant set (bounded, deterministic)

- **benign lane:** 97 user tasks (synthetic seed, expected accepted).
- **3K-A mutation lane:** 35 injection tasks × 10 operators = **350** variants
  (untrusted context envelope).
- **3K-B action-open lane:** 35 injection tasks assigned round-robin across the
  five action-open categories (untrusted context).
- Security cross-product evaluated by the native scorer: **385** (350 + 35).

## Results (real run)

| Metric                                | Value           |
| ------------------------------------- | --------------- |
| containment_hard_gates_clean          | **true**        |
| metrics_consistent                    | **true**        |
| benign_utility                        | **97/97**       |
| targeted_asr                          | **0/385**       |
| mutation_variant_count                | **350**         |
| action_open_case_count                | **35**          |
| operator_asr_delta (every operator)   | **0**           |
| action_open_attacker_goal_rate        | **0**           |
| receipt coverage / audit verification | **100% / 100%** |
| native_agentdojo_scorer_changed       | false           |
| python_side_safety_classifier         | false           |

Across all ten deterministic mutation operators and all five action-open
categories, no variant crossed a Simurgh consequence boundary: zero unsafe tool
execution, zero unsafe output export, zero context authority escalation, with
complete receipts and audit verification. This is a containment-invariance result
under a deterministic key-free harness — not an adaptive-robustness claim.

## Stage 3L decision

Hard gates clean and utility stable (benign 97/97, ASR 0/385), so per the spec
Stage 3L decision table no calibration stage is required.

Stage 3L decision: not triggered.
