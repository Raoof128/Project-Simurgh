-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5H symbolic safety-claim disclosure laws (5H spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic model predicates only, NOT real crypto. Theorem NAMES are bounded to what the inputs
-- support (e.g. scopeBindingSound is a MODEL predicate that a changed scope digest fails the equality
-- check, NOT a proof of SHA-256 collision resistance). 10 theorems + 1 lemma.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5H

/-- Tier ordinals: restricted=0, controlled=1, public=2. Consequence ordinals likewise. -/
def needs (tier pid : Nat) : Prop := pid ≤ tier

/-- Theorem 1 — tierMonotonicity: the required-predicate sets are ⊇-nested up the ladder. -/
theorem tierMonotonicity (pid : Nat) :
    (needs 0 pid → needs 1 pid) ∧ (needs 1 pid → needs 2 pid) := by
  constructor <;> intro h <;> · simp only [needs] at *; omega

/-- warrant: the maximum consequence a proven tier warrants (restricted→contextual(0), else
    threshold_crossing(2)). -/
def maxc (tier : Nat) : Nat := if tier = 0 then 0 else 2

/-- Theorem 2 — warrantMonotone: warrant is monotone in the proven tier. -/
theorem warrantMonotone (a b : Nat) (h : a ≤ b) : maxc a ≤ maxc b := by
  simp only [maxc]
  by_cases ha : a = 0 <;> by_cases hb : b = 0 <;> simp [ha, hb] <;> omega

/-- The proven tier computed from already-verified predicate booleans. R2 needs method + empty-withheld
    + Simurgh's own recompute match; R1 needs method + a reproduced receipt; else R0. -/
def proven (hasMethod recv withheldEmpty recMatch : Bool) : Nat :=
  if hasMethod && withheldEmpty && recMatch then 2
  else if hasMethod && recv then 1
  else 0

/-- Acceptance predicate for evidential inversion (Law 1): declared ≤ warrant(proven). -/
def inversionOk (declaredConsequence provenTier : Nat) : Bool := declaredConsequence ≤ maxc provenTier

/-- Theorem 3 — inversionSound: an accepted verdict has declared ≤ warrant(proven). -/
theorem inversionSound (dc pt : Nat) (h : inversionOk dc pt = true) : dc ≤ maxc pt := by
  simpa [inversionOk] using (Nat.le_of_ble_eq_true (by simpa [inversionOk] using h))

/-- Acceptance predicate for tier overclaim: declared_tier ≤ proven_tier. -/
def tierOk (declaredTier provenTier : Nat) : Bool := declaredTier ≤ provenTier

/-- Theorem 4 — tierOverclaimSound: an accepted verdict has declared_tier ≤ proven_tier. -/
theorem tierOverclaimSound (dt pt : Nat) (h : tierOk dt pt = true) : dt ≤ pt :=
  Nat.le_of_ble_eq_true (by simpa [tierOk] using h)

/-- Theorem 5 — truthfulRestrictedVerifies: a well-formed restricted claim (tier 0) with contextual
    consequence (0) passes both gates. -/
theorem truthfulRestrictedVerifies :
    tierOk 0 0 = true ∧ inversionOk 0 0 = true := by
  constructor <;> rfl

/-- Theorem 6 — notReproducedCapsTier: with no reproduced receipt and no recompute match, proven = 0
    (< controlled). -/
theorem notReproducedCapsTier (hasMethod we : Bool) :
    proven hasMethod false we false = 0 := by
  simp [proven]

/-- Artefact-ledger completeness (Law 3): every referenced artefact is present ∨ withheld. -/
def accounted (referenced present withheld : List Nat) : Bool :=
  referenced.all (fun x => present.contains x || withheld.contains x)

/-- Theorem 7 — redactionCompleteness: an accounted ledger accounts for every referenced artefact. -/
theorem redactionCompleteness (referenced present withheld : List Nat)
    (h : accounted referenced present withheld = true) :
    ∀ x, x ∈ referenced → (present.contains x || withheld.contains x) = true := by
  intro x hx
  exact (List.all_eq_true.mp h) x hx

/-- An equality check returns pass (0) iff the two digests bind (else the fail code). -/
def checkEq (a b failCode : Nat) : Nat := if a = b then 0 else failCode

/-- Theorem 8 — scopeBindingSound: a swapped scope digest (≠ committed) fails the Law-4 check (304). -/
theorem scopeBindingSound (committed swapped : Nat) (h : swapped ≠ committed) :
    checkEq swapped committed 304 = 304 := by
  simp [checkEq, h]

/-- Theorem 9 — noFullWithoutRecompute: proven = public(2) ⇒ empty-withheld ∧ recompute matched. -/
theorem noFullWithoutRecompute (hasMethod recv we recMatch : Bool)
    (h : proven hasMethod recv we recMatch = 2) : we = true ∧ recMatch = true := by
  simp only [proven] at h
  by_cases hm : hasMethod <;> by_cases hw : we <;> by_cases hr : recMatch <;>
    by_cases hv : recv <;> simp_all

/-- Theorem 10 — publicTierRequiresEmptyWithheld. -/
theorem publicTierRequiresEmptyWithheld (hasMethod recv we recMatch : Bool)
    (h : proven hasMethod recv we recMatch = 2) : we = true :=
  (noFullWithoutRecompute hasMethod recv we recMatch h).1

/-- The verifier's codomain: exactly {tier, quality, inverted}. No `claim_true` channel exists. -/
structure Verdict where
  tier : Nat
  quality : Nat
  inverted : Bool

/-- Lemma — verifierCodomainHasNoTruthBoolean: a verdict is fully determined by its three fields;
    there is no hidden truth value the verifier could emit (honesty guardrail as a type-level fact). -/
theorem verifierCodomainHasNoTruthBoolean (v : Verdict) :
    v = { tier := v.tier, quality := v.quality, inverted := v.inverted } := rfl

end Simurgh.Stage5H
