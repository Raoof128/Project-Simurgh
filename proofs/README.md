# Simurgh — Stage 4 formal-verification core (Lean 4)

Machine-checked proofs of the load-bearing invariants of the Stage 4 line, checked under the
pinned toolchain `leanprover/lean4:v4.15.0` (see each dir's `lean-toolchain`). Self-contained:
core Lean 4 only, **no mathlib**. Run locally:

```
elan toolchain install leanprover/lean4:v4.15.0
lean proofs/stage4/ExitLattice.lean
lean proofs/stage4/Structuring.lean
lean proofs/stage4m/AntiMonotonicity.lean
```

All three type-check with exit 0 and no `sorry`. CI gate:
`.github/workflows/stage-4-lean-proofs.yml`.

## What is formally proven (machine-checked)

| Theorem                                             | File                            | Stage(s) | Statement                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fail_closed`, `total`, `new_code_fails_closed`     | `stage4/ExitLattice.lean`       | 4H → 4M  | The typed-exit wrapper is total and fail-closed: any unmapped raw code → run-level 3; a new code can never silently downgrade severity.                                                       |
| `structuring_defeats_per_account`                   | `stage4/Structuring.lean`       | 4K → 4L  | `n ≥ 2` accounts each at exposure 1 satisfy a per-account budget of 1, yet exceed a cluster budget of `n−1`. Per-account accounting provably misses structuring; the cluster gate catches it. |
| `member_le_total`, `passing_cluster_bounds_members` | `stage4/Structuring.lean`       | 4L       | Cluster exposure is additive; a passing cluster (total ≤ budget) is a real, structuring-proof bound on every member.                                                                          |
| `anti_monotonicity`                                 | `stage4m/AntiMonotonicity.lean` | 4M       | Breaches are monotone under truth: a breached constituent forces the merged (non-inflating) bucket to breach.                                                                                 |

Together these formalize the **extraction-containment spine**: the exit lattice is total and
fail-closed (4H..4M), the cluster gate catches structuring that per-account budgets miss
(4K→4L), and improving the fraud graph can only reveal more past breaches, never erase them (4M).

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
