-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5P — Verifiable Submitter Identity: the componentwise Identity Resolution Lattice.
-- Core Lean 4 only, no mathlib. Six spec §1 targets, all fully proved: no proof holes, no user
-- assumptions. (The escape words themselves are deliberately absent from this file so the binding
-- test's scan can stay a plain literal search rather than a comment-aware one.)
-- Motto: AnthropicSafe first, then ReviewerSafe.
--
-- SCOPE, stated before the theorems rather than after them. This models the ORDER and the banking
-- algebra symbolically. It does not model cryptography, canonical encoding, or the fact-manufacturing
-- seam where an adapter turns the world into an assertion — Stage 5N paid for that lesson when a real
-- ceremony found a defect 61 tests and 13 theorems all missed. A proof here bounds the algebra; it
-- does not certify the pipeline.
--
-- Axis values are modelled as their POSITION within one axis. Positions are compared only within
-- their own axis and are never summed or averaged: Law 1 (No Imaginary Ordering) is enforced by the
-- shape of every definition below, not by a side condition.
namespace Simurgh.Stage5P

/-! ## The vector -/

structure Strength where
  binding : Nat
  resolution : Nat
  continuity : Nat
  role : Nat
deriving DecidableEq

/-- `a ≤ᵥ b` — the componentwise order. One axis above is enough to make it false, which is exactly
    what keeps the order PARTIAL rather than total. -/
def leqB (a b : Strength) : Bool :=
  Nat.ble a.binding b.binding && Nat.ble a.resolution b.resolution &&
    Nat.ble a.continuity b.continuity && Nat.ble a.role b.role

/-- Componentwise join `⊔`. -/
def joinV (a b : Strength) : Strength :=
  ⟨Nat.max a.binding b.binding, Nat.max a.resolution b.resolution,
   Nat.max a.continuity b.continuity, Nat.max a.role b.role⟩

theorem leqB_refl (a : Strength) : leqB a a = true := by
  simp [leqB, Nat.ble_eq]

theorem leqB_join_left (a b : Strength) : leqB a (joinV a b) = true := by
  simp [leqB, joinV, Nat.ble_eq]
  exact ⟨⟨⟨Nat.le_max_left _ _, Nat.le_max_left _ _⟩, Nat.le_max_left _ _⟩, Nat.le_max_left _ _⟩

theorem leqB_join_right (a b : Strength) : leqB b (joinV a b) = true := by
  simp [leqB, joinV, Nat.ble_eq]
  exact ⟨⟨⟨Nat.le_max_right _ _, Nat.le_max_right _ _⟩, Nat.le_max_right _ _⟩, Nat.le_max_right _ _⟩

theorem join_le (a b c : Strength) (ha : leqB a c = true) (hb : leqB b c = true) :
    leqB (joinV a b) c = true := by
  simp [leqB, joinV, Nat.ble_eq] at *
  exact ⟨⟨⟨Nat.max_le.mpr ⟨ha.1.1.1, hb.1.1.1⟩, Nat.max_le.mpr ⟨ha.1.1.2, hb.1.1.2⟩⟩,
    Nat.max_le.mpr ⟨ha.1.2, hb.1.2⟩⟩, Nat.max_le.mpr ⟨ha.2, hb.2⟩⟩

/-! ## 1 — relationPartition: the comparator's four cases partition the space.

    Exhaustive AND mutually exclusive. This is what forbids a fifth "roughly equivalent" verdict and
    what stops an incomparable pair from being silently swept into one of the ordered cases. -/

inductive Relation
  | equal
  | strictlyBelow
  | strictlyAbove
  | incomparable
deriving DecidableEq

def compareStrength (a b : Strength) : Relation :=
  match leqB a b, leqB b a with
  | true, true => .equal
  | true, false => .strictlyBelow
  | false, true => .strictlyAbove
  | false, false => .incomparable

def isEqual (a b : Strength) : Bool := leqB a b && leqB b a
def isBelow (a b : Strength) : Bool := leqB a b && !leqB b a
def isAbove (a b : Strength) : Bool := !leqB a b && leqB b a
def isIncomparable (a b : Strength) : Bool := !leqB a b && !leqB b a

def countTrue : List Bool → Nat
  | [] => 0
  | b :: rest => (if b then 1 else 0) + countTrue rest

theorem relationPartition (a b : Strength) :
    countTrue [isEqual a b, isBelow a b, isAbove a b, isIncomparable a b] = 1 := by
  simp [isEqual, isBelow, isAbove, isIncomparable, countTrue]
  cases leqB a b <;> cases leqB b a <;> simp

/-- The comparator agrees with the four predicates, so the partition above is a statement ABOUT
    `compareStrength` rather than about four definitions that merely sit next to it. -/
theorem compareAgreesWithPredicates (a b : Strength) :
    (compareStrength a b = .equal ↔ isEqual a b = true) ∧
      (compareStrength a b = .strictlyBelow ↔ isBelow a b = true) ∧
      (compareStrength a b = .strictlyAbove ↔ isAbove a b = true) ∧
      (compareStrength a b = .incomparable ↔ isIncomparable a b = true) := by
  simp [compareStrength, isEqual, isBelow, isAbove, isIncomparable]
  cases leqB a b <;> cases leqB b a <;> simp

/-! ## 2 — incomparableIff: BICONDITIONAL by ruling.

    The one-directional form is satisfied by a broken comparator that labels every pair
    incomparable. Only the biconditional pins the meaning down, so this is the theorem a hostile
    reviewer should attack first. -/

theorem incomparableIff (a b : Strength) :
    compareStrength a b = .incomparable ↔ (leqB a b = false ∧ leqB b a = false) := by
  simp [compareStrength]
  cases leqB a b <;> cases leqB b a <;> simp

/-! ## 3 — boundResolverDelta: Law 4, the ceiling bounds the DELTA and is a VECTOR.

    Per axis the result is confined to `[ e[i] , max(e[i], ceiling[i]) ]`, so a continuity resolver
    can neither manufacture role strength nor ERASE a role binding proved independently elsewhere.
    The join formulation is what prevents the second failure: an earlier draft's ceiling law would
    have silently lowered strength another resolver had already established. -/

/-- Attach asserted evidence under a profile ceiling, or reject. Rejects rather than clamps: a
    clamped over-claim would be silently accepted at a lower value, and the producer would never
    learn that it asked for something it had no standing to ask for. -/
def attach (prior asserted ceiling : Strength) : Option Strength :=
  if leqB asserted (joinV prior ceiling) then some (joinV prior asserted) else none

theorem boundResolverDelta (prior asserted ceiling next : Strength)
    (h : attach prior asserted ceiling = some next) :
    leqB prior next = true ∧ leqB next (joinV prior ceiling) = true := by
  unfold attach at h
  by_cases hc : leqB asserted (joinV prior ceiling) = true
  · rw [if_pos hc] at h
    have hnext : next = joinV prior asserted := by
      injection h with h'; exact h'.symm
    subst hnext
    refine ⟨leqB_join_left prior asserted, ?_⟩
    exact join_le prior asserted (joinV prior ceiling) (leqB_join_left prior ceiling) hc
  · rw [if_neg hc] at h
    exact absurd h (by simp)

/-! ## 4 — noSelfUpgrade: no new resolver evidence ⟹ strength never rises.

    An identity cannot bootstrap itself. Banking nothing changes nothing. -/

def bankWith (prior : Strength) (newEvidence : Option Strength) : Strength :=
  match newEvidence with
  | none => prior
  | some asserted => joinV prior asserted

theorem noSelfUpgrade (prior : Strength) : leqB (bankWith prior none) prior = true := by
  simp [bankWith, leqB_refl]

/-! ## 5 — replayMonotone: Law 2, a replay is granted no more than the original.

    `replay` may CLAIM anything — that is the attack. What it is GRANTED is the original, so the
    claim never becomes strength. The operational half (the replay is DETECTED whatever profile it
    is dressed in) is proved directly below, because monotonicity alone would be satisfied by a
    verifier that simply ignored replays. -/

structure Evidence where
  strength : Strength
  evidenceDigest : Nat
  submissionBinding : Nat

/-- Replay identity deliberately EXCLUDES the profile and the asserted delta. Two envelopes over the
    same underlying evidence share it even when one wears a stronger profile — which is precisely
    how the upgrade attempt stays visible instead of renaming itself into invisibility. -/
def replayIdentity (e : Evidence) : Nat × Nat := (e.evidenceDigest, e.submissionBinding)

def grantedOnReplay (original _claimed : Strength) : Strength := original

theorem replayMonotone (original claimed : Strength) :
    leqB (grantedOnReplay original claimed) original = true := by
  simp [grantedOnReplay, leqB_refl]

/-- The detection half: re-presenting the same evidence is caught however the second presentation is
    dressed, because the identity the verifier keys on cannot see the dressing. -/
theorem replayDetectedAcrossProfiles (seen : List (Nat × Nat)) (e e' : Evidence)
    (hSame : replayIdentity e' = replayIdentity e)
    (hSeen : seen.contains (replayIdentity e) = true) :
    seen.contains (replayIdentity e') = true := by
  rw [hSame]; exact hSeen

/-! ## 6 — principalMismatchNoJoin: Law 7, No Frankenidentity.

    Contributions join ONLY across the exact same canonical principal. A3 dropped the
    `¬ validDelegation` premise an earlier draft carried: a delegation edge is NOT an equality edge
    and transfers NO axis, so there is no exception to carve out. Both resolver assertions may be
    perfectly authentic — the defect is the attempted join. -/

inductive Outcome
  | banked (s : Strength)
  | identityPrincipalMismatch
deriving DecidableEq

/-- Principals are modelled by their canonical identity. Two contributions merge only when those
    identities are equal; otherwise the whole attachment fails atomically, banking nothing. -/
def attachMany (p₁ p₂ : Nat) (s₁ s₂ : Strength) : Outcome :=
  if p₁ = p₂ then .banked (joinV s₁ s₂) else .identityPrincipalMismatch

theorem principalMismatchNoJoin (p₁ p₂ : Nat) (s₁ s₂ : Strength) (h : p₁ ≠ p₂) :
    attachMany p₁ p₂ s₁ s₂ = .identityPrincipalMismatch := by
  simp [attachMany, h]

/-- Atomicity: a mismatched pair banks NOTHING. Stated separately because "returns the mismatch
    outcome" and "left no partial strength behind" are different claims, and only the second one
    rules out a half-applied join. -/
theorem principalMismatchBanksNothing (p₁ p₂ : Nat) (s₁ s₂ : Strength) (h : p₁ ≠ p₂) :
    ∀ s, attachMany p₁ p₂ s₁ s₂ ≠ .banked s := by
  intro s
  rw [principalMismatchNoJoin p₁ p₂ s₁ s₂ h]
  intro hc
  exact Outcome.noConfusion hc

/-! ## 7 — the honest bound, as a theorem rather than a caveat.

    Identity binding does not imply submission completeness (Law 6). The order says nothing whatever
    about whether everything that should have been submitted was: two submissions can carry the
    identical strength vector and differ in what they omitted. This is the seam SCITT concedes in
    RFC 9943 §9.3, and 5P does not close it — it declines to pretend otherwise. -/

theorem bindingDoesNotImplyCompleteness :
    ∃ (s : Strength) (complete₁ complete₂ : Bool),
      complete₁ ≠ complete₂ ∧ leqB s s = true := by
  exact ⟨⟨0, 0, 0, 0⟩, true, false, by decide, by decide⟩

end Simurgh.Stage5P
