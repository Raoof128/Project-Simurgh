# Stage 4N — Extraction Seismograph: Validation Matrix

> **Motto.** AnthropicSafe First, then ReviewerSafe.

Every falsifier arm has **exactly one legal answer**, guaranteed by the pinned gate order

**Q10 → Q11 → Q15 → Q13 → Q14 → Q16 → Q12 → Q17**

(first failure wins). The T0–T11 answers below are the frozen contents of
`tests/fixtures/llmShield/stage4n/expected-results/seismograph-matrix.json`, and every one
is exercised end-to-end through the real verifier CLI in
`tests/e2e/llmShield/stage4n/seismographFullNet.test.js`. T12 and T13 are covered by the
unit and e2e suites respectively.

| Arm (matrix key)            | Mutation                                                         |         Raw | Reason                                 | Gate    |
| --------------------------- | ---------------------------------------------------------------- | ----------: | -------------------------------------- | ------- |
| `t0-clean`                  | Clean feed at `as_of = synthetic-0006`                           |           0 | —                                      | —       |
| `t1-drop-heartbeat`         | Drop heartbeat `synthetic-0002`, re-forge links (cover-up)       |          47 | `heartbeat_absent_for_expected_window` | Q11     |
| `t2-fork`                   | Second artifact claims a different digest for window 0003        |          48 | `cross_artifact_digest_mismatch`       | Q17     |
| `t3-reorder`                | Swap two records, re-forge links                                 |          49 | `interleave_order_violation`           | Q10     |
| `t4-mutate-4k-root`         | Mutate the 4K root inside heartbeat 0003                         |          50 | `source_root_mismatch`                 | Q15     |
| `t5-absent-heartbeat`       | Bilateral proof references a heartbeat absent from the feed      |          51 | `referenced_heartbeat_absent`          | Q12     |
| `t6-early-reveal`           | Reveal for window 0000 appears at its own window (early)         |          52 | `reveal_early`                         | Q13     |
| `t7-drop-due-reveal`        | Drop the due reveal for window 0001 (overdue)                    |          52 | `reveal_overdue`                       | Q13     |
| `t8-reveal-band-mismatch`   | Reveal bands contradict the committed vector                     |          50 | `reveal_commitment_mismatch`           | Q13     |
| `t9-undeclared-dimension`   | Reveal + heartbeat consistently disclose an undeclared dimension |          53 | `undeclared_band_dimension`            | Q14     |
| `t10-raw-count`             | Public artifact discloses a raw count                            |          54 | `raw_count_public`                     | Q16     |
| `t11-proof-material-public` | Public artifact carries inclusion-proof material                 |          54 | `inclusion_proof_material_public`      | Q16     |
| T12 (unit)                  | Unknown raw code (e.g. 99) through the exit wrapper              | run-level 3 | —                                      | wrapper |
| T13 (e2e)                   | Delete the tail record; verdict must not stay green              |         ≠ 0 | (silence)                              | Q11     |

## Why the two tricky arms pin where they do

- **T1 (Q11, not Q10).** A naive drop also breaks positions and prev-digest links, so Q10
  would fire first and silence would never be exercised as silence. The arm is therefore a
  _cover-up_: drop the heartbeat, then re-number positions and re-forge prev digests so the
  chain looks internally perfect and only the gap remains. Q10 uses **subsequence** matching
  (it judges what exists), so the cover-up passes Q10 and Q11 catches the missing window.
  This is the realistic adversary — a producer hiding a window, not one leaving broken links.
- **T9 (Q14 `undeclared_band_dimension`).** A sloppy extra-dimension arm (band added,
  commitment stale) stops at Q13 `reveal_commitment_mismatch` (that is T8's territory). To
  reach Q14, the producer must _consistently_ disclose the undeclared dimension — the reveal
  carries the third band **and** the heartbeat's committed vector is re-forged to match — so
  Q10 (structural) and Q13 (commitment recompute) both pass and the violation surfaces at
  Q14. The policy-level `band_vector_space_exceeds_budget` reason (the draft's original
  arithmetic defect) stays covered as a permanent regression guard by the `fatPolicy` unit
  case in `gates.test.js`.

## Reproduce

```bash
bash scripts/reproduce-llm-shield-stage4n.sh   # -> [stage4n] ALL GREEN
node --test tests/e2e/llmShield/stage4n/*.test.js
```
