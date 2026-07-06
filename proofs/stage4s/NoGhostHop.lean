-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4S symbolic delegation-chain laws, machine-checked (4S spec §15).
-- Self-contained: core Lean 4 only, no mathlib.
-- SCOPE (exact, spec §15): Lean proves symbolic completeness, attenuation, flux,
--   fan-out, split-brain, and inclusion≠completeness laws over abstract models.
--   Node/Python exercise real Ed25519 + digest byte behaviour. No theorem claims
--   Ed25519 hardness, SHA-256 collision-resistance, or that Lean verified the real
--   curve/hash arithmetic.
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4S

-- ---------------------------------------------------------------------------
-- Theorem 1 — noGhostHop (the trilemma, spec §2.2 / §11).
-- A crossing acts under a hop that is either on the ledger (committed by its
-- parent's fan-out, bound in the tree, with a binding) or it is caught by one of
-- three detection species: uncounted (106/107), orphan (111), receiptless (112).
-- ---------------------------------------------------------------------------
structure Crossing where
  committedHop : Bool   -- the acted-under hop is committed in its parent's fan-out
  boundInTree : Bool    -- bound_receipt_digest resolves to a verified tree node
  hasBinding : Bool     -- bound_receipt_digest is non-empty

def uncounted (c : Crossing) : Bool := !c.committedHop
def orphan (c : Crossing) : Bool := c.hasBinding && !c.boundInTree
def receiptless (c : Crossing) : Bool := !c.hasBinding

/-- Contrapositive form: if NO detection species fires, the crossing is fully on
    the ledger — committed, bound in the tree, and carrying a binding. Either a hop
    is on the chain, or its absence is detectable at the guarded boundary. -/
theorem noGhostHop (c : Crossing)
    (h1 : uncounted c = false) (h2 : orphan c = false) (h3 : receiptless c = false) :
    c.committedHop = true ∧ c.boundInTree = true ∧ c.hasBinding = true := by
  refine ⟨?_, ?_, ?_⟩
  · simpa [uncounted] using h1
  · have hb : c.hasBinding = true := by simpa [receiptless] using h3
    simp [orphan, hb] at h2
    simpa using h2
  · simpa [receiptless] using h3

/-- Disjunctive form: a hidden hop (not committed) is always caught. -/
theorem noGhostHopHidden (c : Crossing) (hHidden : c.committedHop = false) :
    uncounted c = true ∨ orphan c = true ∨ receiptless c = true := by
  exact Or.inl (by simp [uncounted, hHidden])

-- ---------------------------------------------------------------------------
-- Theorem 2 — attenuationComposes (spec §7).
-- Scope as a membership predicate; ⊆ as pointwise implication; path scope as the
-- running intersection. The composed path scope is always ⊆ the root scope.
-- ---------------------------------------------------------------------------
def Scope := Nat → Bool
def sub (s t : Scope) : Prop := ∀ x, s x = true → t x = true
def inter (s t : Scope) : Scope := fun x => s x && t x

theorem subRefl (s : Scope) : sub s s := fun _ h => h
theorem subTrans {a b c : Scope} (h1 : sub a b) (h2 : sub b c) : sub a c :=
  fun x hx => h2 x (h1 x hx)
theorem subInterLeft (a b : Scope) : sub (inter a b) a := by
  intro x hx
  simp [inter] at hx
  exact hx.1

/-- The path scope (root intersected with every edge scope down the path) is a
    subset of the root scope, for any path length. -/
theorem attenuationComposes (root : Scope) (es : List Scope) :
    sub (es.foldl inter root) root := by
  induction es generalizing root with
  | nil => exact subRefl root
  | cons e rest ih =>
      have step : sub (rest.foldl inter (inter root e)) (inter root e) := ih (inter root e)
      exact subTrans step (subInterLeft root e)

-- ---------------------------------------------------------------------------
-- Theorem 3 — fluxConservation (spec §6).
-- The per-level flux law composes: local spend plus ACTUAL child spend (which is
-- bounded by the delegated child budget) never exceeds the node budget. Applied
-- inductively down the tree this bounds total spend by the root budget for ANY
-- tree shape, so structuring-by-delegation cannot exceed the root budget.
-- ---------------------------------------------------------------------------
theorem fluxConservation (budget localSpend childBudget childSpend : Nat)
    (hflux : localSpend + childBudget ≤ budget) (hchild : childSpend ≤ childBudget) :
    localSpend + childSpend ≤ budget :=
  Nat.le_trans (Nat.add_le_add_left hchild localSpend) hflux

-- ---------------------------------------------------------------------------
-- Theorem 4 — fanoutSound (spec §4).
-- If a parent's committed child set equals its observed child set, no observed
-- child is omitted from the commitment (completeness over declared participants).
-- ---------------------------------------------------------------------------
theorem fanoutSound (committed observed : List Nat) (h : committed = observed) :
    ∀ x, x ∈ observed → x ∈ committed := by
  intro x hx; rw [h]; exact hx

-- ---------------------------------------------------------------------------
-- Theorem 5 — splitBrainExcluded (spec §5).
-- Single root (in-degree 0) plus every non-root having exactly one parent forces
-- in-degree ≤ 1 everywhere: no node is claimed by two parents.
-- ---------------------------------------------------------------------------
theorem splitBrainExcluded (inDegree : Nat → Nat) (root : Nat)
    (hroot : inDegree root = 0) (hother : ∀ n, n ≠ root → inDegree n = 1) :
    ∀ n, inDegree n ≤ 1 := by
  intro n
  by_cases h : n = root
  · rw [h, hroot]; exact Nat.zero_le 1
  · rw [hother n h]; exact Nat.le_refl 1

-- ---------------------------------------------------------------------------
-- Theorem 6 — inclusionNotCompleteness (spec §10, the bold line, machine-checked).
-- Merkle inclusion (committed ⊆ observed) can hold while completeness (committed =
-- observed) fails: the observed set carries an extra, uncommitted hop. Inclusion
-- proves PRESENCE, never COMPLETENESS.
-- ---------------------------------------------------------------------------
theorem inclusionNotCompleteness :
    ∃ (committed observed : List Nat),
      (∀ x, x ∈ committed → x ∈ observed) ∧ committed ≠ observed := by
  refine ⟨[1], [1, 2], ?_, ?_⟩
  · intro x hx
    have : x = 1 := by simpa using hx
    simp [this]
  · simp

end Simurgh.Stage4S
