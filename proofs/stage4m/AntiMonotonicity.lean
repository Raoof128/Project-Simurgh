-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4M anti-monotonicity lemma (spec §2), machine-checked. Self-contained: core Lean 4
-- only, no mathlib. Model: a merged bucket's exposure is the sum of its constituents'
-- exposures; budgets never inflate under merges; therefore a breached constituent forces
-- the merged bucket to breach. `breaches are monotone under truth`.
-- Limitation (signed in the attestation): proof_is_of_model_not_implementation.

namespace Simurgh

structure Cluster where
  exposure : Nat
  budget : Nat

def breaches (c : Cluster) : Prop := c.exposure > c.budget

def sumExposure : List Cluster → Nat
  | [] => 0
  | c :: rest => c.exposure + sumExposure rest

theorem member_le_sum {c : Cluster} :
    ∀ {cs : List Cluster}, c ∈ cs → c.exposure ≤ sumExposure cs
  | [], h => nomatch h
  | x :: rest, h => by
    cases h with
    | head =>
      simp only [sumExposure]
      omega
    | tail _ hmem =>
      have ih := member_le_sum (cs := rest) hmem
      simp only [sumExposure]
      omega

/-- The lemma: if any constituent `c` of a merged bucket breaches, and the merged budget
    does not exceed any constituent budget (non-inflation), the merged bucket breaches. -/
theorem anti_monotonicity
    (cs : List Cluster) (c : Cluster) (newBudget : Nat)
    (hMem : c ∈ cs)
    (hNonInflation : ∀ x ∈ cs, newBudget ≤ x.budget)
    (hBreach : breaches c) :
    sumExposure cs > newBudget := by
  have hle : c.exposure ≤ sumExposure cs := member_le_sum hMem
  have hb : newBudget ≤ c.budget := hNonInflation c hMem
  unfold breaches at hBreach
  omega

end Simurgh
