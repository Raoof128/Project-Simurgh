# Simurgh — Stage 4 formal-verification core (Lean 4)

Machine-checked proofs of the load-bearing invariants of the Stage 4 line, checked under the
pinned toolchain `leanprover/lean4:v4.15.0` (see each dir's `lean-toolchain`). Self-contained:
core Lean 4 only, **no mathlib**. Run locally:

```
elan toolchain install leanprover/lean4:v4.15.0
node scripts/check-lean-proofs.mjs
```

That gate discovers every `.lean` under `proofs/` — 38 files as of Stage 5R — type-checks each
one, and refuses any escape hatch (`sorry`, `admit`, `native_decide`, a bare `axiom`) found in
comment-stripped source. It also poisons a scratch corpus on every run and demands its own
refusal, because a gate that cannot demonstrate going red is not evidence that anything passed.

This README used to name four files and say "all four type-check", while the CI workflow named
27 and 38 existed. That drift was Stage 5Q's finding F001 and is repaired in Q1: neither the gate
nor this file names a proof any more. `.github/workflows/stage-4-lean-proofs.yml` runs the script
above and nothing else.

Note that `lean` exits **0** on a file whose theorem is closed by `sorry` — it is a warning. The
escape scan, not the type-check, is what makes an unproven proof fail.

## What is formally proven (machine-checked)

| Theorem                                                     | File                                | Stage(s) | Statement                                                                                                                                                                                      |
| ----------------------------------------------------------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fail_closed`, `total`, `new_code_fails_closed`             | `stage4/ExitLattice.lean`           | 4H → 4M  | The typed-exit wrapper is total and fail-closed: any unmapped raw code → run-level 3; a new code can never silently downgrade severity.                                                        |
| `structuring_defeats_per_account`                           | `stage4/Structuring.lean`           | 4K → 4L  | `n ≥ 2` accounts each at exposure 1 satisfy a per-account budget of 1, yet exceed a cluster budget of `n−1`. Per-account accounting provably misses structuring; the cluster gate catches it.  |
| `member_le_total`, `passing_cluster_bounds_members`         | `stage4/Structuring.lean`           | 4L       | Cluster exposure is additive; a passing cluster (total ≤ budget) is a real, structuring-proof bound on every member.                                                                           |
| `anti_monotonicity`                                         | `stage4m/AntiMonotonicity.lean`     | 4M       | Breaches are monotone under truth: a breached constituent forces the merged (non-inflating) bucket to breach.                                                                                  |
| `expected_present`, `omission_detectable`, `no_silent_fork` | `stage4n/TemporalCompleteness.lean` | 4N       | A position-perfect chain covering slot k contains expected k; omitting an expected record forces a too-short chain or a detectable discontinuity; two well-formed chains cannot fork silently. |

Together these formalize the **extraction-containment spine**: the exit lattice is total and
fail-closed (4H..4N), the cluster gate catches structuring that per-account budgets miss
(4K→4L), improving the fraud graph can only reveal more past breaches, never erase them (4M),
and a position-perfect public heartbeat chain cannot omit an expected window without a
detectable discontinuity — silence is never invisible (4N).

## Honesty rails (what this is NOT)

- **`proof_is_of_model_not_implementation`** — each theorem is about the mathematical model. The
  bridge to the running `.mjs` is the JS unit/e2e suites plus the seeded property tests
  (`antiMonotonicity.property.test.js`), stated openly, never blurred. A green Lean check does
  not by itself prove the JavaScript matches the model.
- **Coverage is partial and honestly bounded.** The containment / information-flow stages
  (4A–4C capability-authority-provenance gating, 4D–4H proof-carrying data-flow) rest on graph
  reachability and lattice-join properties that are provable in principle but require
  substantially heavier modelling; they are currently **empirically verified** by their reproduce
  nets and tamper matrices, **not** formally proven here. Extending Lean coverage to the flow
  lattice is future work, not a claim made today.
- No proof asserts "model safe", "prevents distillation", or any capability the JS non-claims
  disavow. The formal layer proves _structure_ (totality, additivity, monotonicity), matching the
  signed non-claims exactly.
