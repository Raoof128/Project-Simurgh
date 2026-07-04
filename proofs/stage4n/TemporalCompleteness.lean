-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4N temporal completeness (spec §10, Lemma 1). Self-contained: core Lean 4 only,
-- no mathlib. Model: the expected schedule is a function `expected : Nat → Rec` (the
-- deterministic interleave of spec §5.0); a published chain is a list of records carrying
-- consecutive positions. THE THEOREM: if the chain is position-perfect (record i is
-- exactly expected i) and long enough to cover slot k, then slot k's record IS present —
-- contrapositively, omitting an expected record forces either a position/successor
-- discontinuity (Q10, raw 49) or a too-short chain (Q11/Q13, raw 47/52). Silence is
-- never invisible. Limitation (signed): proof_is_of_model_not_implementation.

namespace Simurgh.Stage4N

/-- A record in the model: its kind and window index. -/
structure Rec where
  kind : Nat -- 0 = heartbeat, 1 = aggregate_reveal
  window : Nat
  deriving Repr, DecidableEq

/-- A chain is well-formed w.r.t. a schedule iff every held position matches it. -/
def wellFormed (expected : Nat → Rec) (chain : List Rec) : Prop :=
  ∀ i, (h : i < chain.length) → chain.get ⟨i, h⟩ = expected i

/-- Temporal completeness: a well-formed chain covering slot k contains expected k. -/
theorem expected_present (expected : Nat → Rec) (chain : List Rec)
    (hwf : wellFormed expected chain) (k : Nat) (hk : k < chain.length) :
    chain.get ⟨k, hk⟩ = expected k :=
  hwf k hk

/-- Omission detectability (contrapositive form): if expected k is NOT in the chain,
    the chain is either too short to cover k (liveness failure — detectable by length)
    or not well-formed (a discontinuity — detectable by position/successor check). -/
theorem omission_detectable (expected : Nat → Rec) (chain : List Rec) (k : Nat)
    (habsent : ∀ i, (h : i < chain.length) → chain.get ⟨i, h⟩ ≠ expected k) :
    chain.length ≤ k ∨ ¬ wellFormed expected chain := by
  by_cases hlen : chain.length ≤ k
  · exact Or.inl hlen
  · apply Or.inr
    intro hwf
    have hk : k < chain.length := Nat.lt_of_not_le hlen
    exact habsent k hk (hwf k hk)

/-- Two well-formed chains over the same schedule agree on every shared position —
    the non-equivocation core of Q17: a fork requires breaking well-formedness. -/
theorem no_silent_fork (expected : Nat → Rec) (c₁ c₂ : List Rec)
    (h₁ : wellFormed expected c₁) (h₂ : wellFormed expected c₂)
    (i : Nat) (hi₁ : i < c₁.length) (hi₂ : i < c₂.length) :
    c₁.get ⟨i, hi₁⟩ = c₂.get ⟨i, hi₂⟩ := by
  rw [h₁ i hi₁, h₂ i hi₂]

end Simurgh.Stage4N
