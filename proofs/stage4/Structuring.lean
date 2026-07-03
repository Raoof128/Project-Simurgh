-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4K→4L structuring theorem: per-account budgets provably MISS what cluster budgets catch.
-- Self-contained: core Lean 4 only, no mathlib. Formalizes the 4L crown (F-STRUCTURE / F8):
-- 100 accounts each at exposure 1 pass a per-account budget of 1, yet their cluster of budget 99
-- is exceeded. Also: cluster aggregation is additive (a member never exceeds the cluster total),
-- so the cluster gate is a sound upper bound. Bridges into 4M's anti-monotonicity.
-- Limitation (signed): proof_is_of_model_not_implementation.

namespace Simurgh.Stage4

/-- Cluster exposure is the sum of member exposures (matches `aggregateClusterExposure`). -/
def clusterTotal : List Nat → Nat
  | [] => 0
  | x :: xs => x + clusterTotal xs

/-- Aggregation soundness: no single member's exposure exceeds the cluster total. The cluster
    gate (total > budget) therefore dominates any per-member view. -/
theorem member_le_total {m : Nat} :
    ∀ {members : List Nat}, m ∈ members → m ≤ clusterTotal members
  | [], h => nomatch h
  | x :: rest, h => by
    cases h with
    | head =>
      simp only [clusterTotal]
      omega
    | tail _ hmem =>
      have ih := member_le_total (members := rest) hmem
      simp only [clusterTotal]
      omega

/-- `n` accounts each with exposure exactly 1 (the structuring campaign shape). -/
def ones : Nat → List Nat
  | 0 => []
  | n + 1 => 1 :: ones n

theorem sum_ones (n : Nat) : clusterTotal (ones n) = n := by
  induction n with
  | zero => rfl
  | succ k ih =>
    simp only [ones, clusterTotal, ih]
    omega

theorem all_ones (n : Nat) : ∀ m ∈ ones n, m = 1 := by
  induction n with
  | zero => intro m hm; nomatch hm
  | succ k ih =>
    intro m hm
    cases hm with
    | head => rfl
    | tail _ hmem => exact ih m hmem

/-- **Structuring theorem.** With `n ≥ 2` accounts each at exposure 1, a per-account budget of 1
    is satisfied by EVERY account (`m ≤ 1`), yet the cluster's total `n` exceeds a cluster budget
    of `n - 1`. So per-account accounting passes a campaign that the cluster gate catches — the
    exact gap 4L (Q9) closes over 4K (Q8). -/
theorem structuring_defeats_per_account (n : Nat) (h : 2 ≤ n) :
    (∀ m ∈ ones n, m ≤ 1) ∧ clusterTotal (ones n) > n - 1 := by
  refine ⟨fun m hm => ?_, ?_⟩
  · have := all_ones n m hm; omega
  · rw [sum_ones]; omega

/-- **Cluster soundness (contrapositive).** If the cluster gate PASSES (total ≤ budget), then no
    member alone breaches the budget either — a passing cluster is a real, structuring-proof
    bound, not an artifact of aggregation. -/
theorem passing_cluster_bounds_members
    (members : List Nat) (budget : Nat) (hpass : clusterTotal members ≤ budget) :
    ∀ m ∈ members, m ≤ budget := by
  intro m hm
  have := member_le_total (members := members) hm
  omega

end Simurgh.Stage4
