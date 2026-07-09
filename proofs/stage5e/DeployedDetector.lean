-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5E symbolic deployed-detector laws (5E spec §5). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. Theorem NAMES are deliberately BOUNDED to what the
-- inputs support (external-review correction): e.g. bundleJointlyBindsRevisionAndTable is a
-- within-bundle joint binding, NOT cross-bundle uniqueness. Eight theorems + one lemma:
-- slipArithmeticSound, inversionSound, inversionPredicateThetaFree (+ detectionGapInterval),
-- curveMonotoneInTheta, curvePointMatchesCommittedTable, forbiddenStructuredClaimUnrepresentable,
-- slipPredicateDependsOnlyOnCommittedScores, bundleJointlyBindsRevisionAndTable.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5E

/-- Scores/thresholds as Nat (higher = more "positive"/malicious). flag iff score ≥ θ. -/
def thresholdCrossing (raw ev theta : Nat) : Bool := decide (ev < theta ∧ theta ≤ raw)
def scoreInversion (raw ev : Nat) : Bool := decide (ev < raw)

/-- Theorem 1 — slipArithmeticSound: threshold_crossing ⇔ evasion < θ ≤ raw. -/
theorem slipArithmeticSound (raw ev theta : Nat) :
    thresholdCrossing raw ev theta = true ↔ (ev < theta ∧ theta ≤ raw) := by
  simp [thresholdCrossing]

/-- Theorem 2 — inversionSound: score_inversion ⇒ evasion < raw (a real inversion is necessary). -/
theorem inversionSound (raw ev : Nat) : scoreInversion raw ev = true → ev < raw := by
  simp [scoreInversion]

/-- score_inversion carries a θ argument that it IGNORES. -/
def inversionAtTheta (raw ev _theta : Nat) : Bool := scoreInversion raw ev

/-- Theorem 3 — inversionPredicateThetaFree: the inversion predicate does not mention θ (it is a
    ranking defect, NOT a claim of "uncatchable at every θ"). -/
theorem inversionPredicateThetaFree (raw ev t1 t2 : Nat) :
    inversionAtTheta raw ev t1 = inversionAtTheta raw ev t2 := rfl

/-- Lemma detectionGapInterval: the raw-flagged / evasion-cleared gap holds EXACTLY for
    θ ∈ (evasion, raw]. This bounds the honest reading (guards against overclaim). -/
theorem detectionGapInterval (raw ev theta : Nat) :
    thresholdCrossing raw ev theta = true ↔ (ev < theta ∧ theta ≤ raw) := by
  simp [thresholdCrossing]

/-- A non-increasing chain of flagged-counts as θ increases (curve sorted by ascending θ). -/
inductive NonIncr : List Nat → Prop where
  | nil : NonIncr []
  | single {a} : NonIncr [a]
  | cons {a b rest} : b ≤ a → NonIncr (b :: rest) → NonIncr (a :: b :: rest)

/-- Theorem 4 — curveMonotoneInTheta: on the committed curve, flagged-count is non-increasing as θ
    rises. Modeled over the committed count sequence (θ ascending) = (2, 1). -/
theorem curveMonotoneInTheta : NonIncr [2, 1] := by
  apply NonIncr.cons (by omega)
  exact NonIncr.single

/-- flagged-count = how many committed scores are ≥ θ. -/
def flaggedCount (theta : Nat) (scores : List Nat) : Nat :=
  scores.countP (fun s => decide (theta ≤ s))

/-- Theorem 5 — curvePointMatchesCommittedTable: a committed curve point equals the recomputed count
    over the committed scores (arithmetic consistency, NOT empirical detector quality). -/
theorem curvePointMatchesCommittedTable : flaggedCount 5 [9, 6, 3] = 2 := by decide

/-- The closed set of load-bearing structured claim codes. -/
def structuredClaims : List String :=
  ["evasion_slips_at_reference", "score_inverts", "reviewed_equivalent_inversion"]

/-- Theorem 6 — forbiddenStructuredClaimUnrepresentable: "detector defeated/unsafe/broken" is not in
    the closed structured-claim enum. (This bounds the STRUCTURED claim set; it does not prove semantic
    absence over free text — analyst_note is non-load-bearing.) -/
theorem forbiddenStructuredClaimUnrepresentable :
    "detector_defeated" ∉ structuredClaims ∧
    "detector_unsafe" ∉ structuredClaims ∧
    "detector_broken" ∉ structuredClaims := by decide

/-- The slip predicate carries an "attacker" argument it ignores. -/
def slipWithClaim (raw ev theta _claim : Nat) : Bool := thresholdCrossing raw ev theta

/-- Theorem 7 — slipPredicateDependsOnlyOnCommittedScores: slip determination is a function of the
    committed scores + θ alone (functional dependence on supplied evidence — NOT independence from
    attacker influence over what was captured). -/
theorem slipPredicateDependsOnlyOnCommittedScores (raw ev theta c1 c2 : Nat) :
    slipWithClaim raw ev theta c1 = slipWithClaim raw ev theta c2 := rfl

/-- The signed content jointly carries (revision, table digest). -/
def signedPair (revision tableDigest : Nat) : Nat × Nat := (revision, tableDigest)

/-- Theorem 8 — bundleJointlyBindsRevisionAndTable: WITHIN ONE signed bundle, the revision and the
    score-table digest are jointly bound (you cannot change one without changing the signed content).
    This is deliberately NOT a cross-bundle uniqueness claim. -/
theorem bundleJointlyBindsRevisionAndTable (r1 t1 r2 t2 : Nat)
    (h : signedPair r1 t1 = signedPair r2 t2) : r1 = r2 ∧ t1 = t2 := by
  simp [signedPair, Prod.mk.injEq] at h
  exact h

end Simurgh.Stage5E
