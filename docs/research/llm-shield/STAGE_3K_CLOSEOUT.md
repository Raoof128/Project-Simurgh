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
  reviewer docs). All unit-tested; catalogue-mode audits green.
- **Real opt-in run (3K-F):** `TBD — pending maintainer real run` (needs the
  `.venv-stage3i` AgentDojo venv, a running Simurgh gateway, and the authored
  action-open probe tasks). Until then the data-bearing evidence is not frozen and
  the audits run in catalogue mode.

## Results (filled by the real run)

| Metric                         | Value                    |
| ------------------------------ | ------------------------ |
| containment_hard_gates_clean   | `TBD — pending real run` |
| metrics_consistent             | `TBD — pending real run` |
| operator_asr_delta (max)       | `TBD — pending real run` |
| action_open_attacker_goal_rate | `TBD — pending real run` |
| benign_utility                 | `TBD — pending real run` |
| targeted_asr                   | `TBD — pending real run` |

## Stage 3L decision

> Replace this line after the real run, per the spec Stage 3L decision table.

Stage 3L decision: `TBD — pending real run` (must become exactly one of
`not triggered.` or `triggered because <measured class>.`).
