-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5M symbolic VTC-Quorum laws (spec §4). Core Lean 4 only, no mathlib. 11 theorems, all fully proved
-- (no unfinished goals); no user axioms — collision resistance / injectivity are EXPLICIT hypotheses.
-- SCOPE: symbolic models of the pure-core state machine, not real crypto.
namespace Simurgh.Stage5M

/-- Symbolic facts the pure core decides over (booleans + the distinct-ecology count). -/
structure Facts where
  schemaOk : Bool        -- 384 passed
  rekorCode : Nat        -- 0 (absent/valid) or 385..390 (present-but-invalid seat)
  crossOk : Bool         -- 391 (all present seats bind one commitment)
  distinctOk : Bool      -- 392 (no aliasing among present seats)
  seatPresent : Bool     -- transparency-log seat present
  distinctClasses : Nat  -- N: distinct verifier-pinned ecologies among present valid seats
  declared : Bool        -- declared_externally_anchored

/-- confirmed iff the log seat is present and three distinct ecologies attest. -/
def isConfirmed (f : Facts) : Prop := f.seatPresent = true ∧ f.distinctClasses = 3
instance (f : Facts) : Decidable (isConfirmed f) := by unfold isConfirmed; infer_instance

/-- Two-level: the state-layer code (394 lie before 393 gap). -/
def stateCode (f : Facts) : Nat :=
  if isConfirmed f then 0 else if f.declared = true then 394 else 393

/-- Frozen first-failure spine of the extension (all conditions are decidable Props). -/
def verdict (f : Facts) : Nat :=
  if f.schemaOk = true then
    if f.rekorCode = 0 then
      if f.crossOk = true then
        if f.distinctOk = true then stateCode f else 392
      else 391
    else f.rekorCode
  else 384

def N (f : Facts) : Nat := f.distinctClasses
def externallyAnchored (f : Facts) : Bool := decide (verdict f = 0)

/-- Well-formed facts: N cannot exceed the number of present seats (2 without the log seat, 3 with it). -/
def wf (f : Facts) : Prop := f.distinctClasses ≤ (if f.seatPresent = true then 3 else 2)

/-- Reduction: once schema/seat/cross/distinct pass, the verdict is exactly the state-layer code. -/
theorem verdictState (f : Facts) (h : f.schemaOk = true) (hr : f.rekorCode = 0)
    (hc : f.crossOk = true) (hd : f.distinctOk = true) : verdict f = stateCode f := by
  unfold verdict; simp [h, hr, hc, hd]

/-! ## 1 — exactConjunction: raw 0 ⟺ every seat + cross-seat + distinctness + 3-ecology holds. -/
theorem exactConjunction (f : Facts) :
    verdict f = 0 ↔
      (f.schemaOk = true ∧ f.rekorCode = 0 ∧ f.crossOk = true ∧ f.distinctOk = true ∧
        f.seatPresent = true ∧ f.distinctClasses = 3) := by
  unfold verdict stateCode isConfirmed
  by_cases hs : f.schemaOk = true <;> by_cases hr : f.rekorCode = 0 <;>
    by_cases hc : f.crossOk = true <;> by_cases hd : f.distinctOk = true <;>
    by_cases hp : f.seatPresent = true <;> by_cases hn : f.distinctClasses = 3 <;>
    by_cases hde : f.declared = true <;> simp_all

/-! ## 2 — incompleteNeverAnchored: not-confirmed ⟹ externally_anchored = false. -/
theorem incompleteNeverAnchored (f : Facts)
    (h : f.schemaOk = true) (hr : f.rekorCode = 0) (hc : f.crossOk = true) (hd : f.distinctOk = true)
    (hi : ¬ isConfirmed f) : externallyAnchored f = false := by
  unfold externallyAnchored
  rw [verdictState f h hr hc hd]; unfold stateCode
  by_cases hde : f.declared = true <;> simp [hi, hde]

/-! ## 3a — overclaimBeforeFloor: declared over an incomplete ecology ⟹ raw 394. -/
theorem overclaimBeforeFloor (f : Facts)
    (h : f.schemaOk = true) (hr : f.rekorCode = 0) (hc : f.crossOk = true) (hd : f.distinctOk = true)
    (hi : ¬ isConfirmed f) (hde : f.declared = true) : verdict f = 394 := by
  rw [verdictState f h hr hc hd]; unfold stateCode; simp [hi, hde]

/-! ## 3b — lieBeforeGap: in the public spine, 394 (lie) is checked before 393 (gap). -/
def publicSpine : List Nat := [384, 385, 386, 387, 388, 389, 390, 391, 392, 394, 393]
def spinePos : List Nat → Nat → Nat
  | [], _ => 0
  | x :: xs, c => if x = c then 0 else 1 + spinePos xs c
theorem lieBeforeGap : spinePos publicSpine 394 < spinePos publicSpine 393 := by decide

/-! ## 4 — rekorSpecificWins: a present-invalid log seat (385..390) wins over 391/392/393/394/0. -/
theorem rekorSpecificWins (f : Facts) (h : f.schemaOk = true)
    (hlo : 385 ≤ f.rekorCode) (hhi : f.rekorCode ≤ 390) : verdict f = f.rekorCode := by
  unfold verdict
  have hne : f.rekorCode ≠ 0 := by omega
  simp [h, hne]

/-! ## 5 — distinctFromPinnedClasses: aliasing (distinctOk=false) ⟹ raw 392. -/
theorem distinctFromPinnedClasses (f : Facts)
    (h : f.schemaOk = true) (hr : f.rekorCode = 0) (hc : f.crossOk = true) (hd : f.distinctOk = false) :
    verdict f = 392 := by
  unfold verdict; simp [h, hr, hc, hd]

/-! ## 6 — crossSeatBindingSound: seats binding different commitments (crossOk=false) ⟹ raw 391. -/
theorem crossSeatBindingSound (f : Facts)
    (h : f.schemaOk = true) (hr : f.rekorCode = 0) (hc : f.crossOk = false) : verdict f = 391 := by
  unfold verdict; simp [h, hr, hc]

/-! ## 7 — frozenCorePreserved: a nonzero 5L core verdict is returned unchanged (extension never runs). -/
def dispatch (coreVerdict ext : Nat) : Nat := if coreVerdict ≠ 0 then coreVerdict else ext
theorem frozenCorePreserved (c ext : Nat) (h : c ≠ 0) : dispatch c ext = c := by
  unfold dispatch; simp [h]

/-! ## 8 — v1Unreinterpreted: no v2 marker ⟹ verdict is exactly the core verdict. -/
def dispatchV1 (envelopePresent : Bool) (coreVerdict ext : Nat) : Nat :=
  if envelopePresent = true then (if coreVerdict ≠ 0 then coreVerdict else ext) else coreVerdict
theorem v1Unreinterpreted (c ext : Nat) : dispatchV1 false c ext = c := by
  unfold dispatchV1; simp

/-! ## 9 — canonicalAnchorRoundTrip: decode∘encode = id and encode is injective (explicit hyps). -/
theorem canonicalAnchorRoundTrip {Digest Anchor : Type}
    (enc : Digest → Anchor) (dec : Anchor → Digest)
    (roundtrip : ∀ d, dec (enc d) = d) (d : Digest) : dec (enc d) = d := roundtrip d
theorem canonicalAnchorInjective {Digest Anchor : Type}
    (enc : Digest → Anchor) (dec : Anchor → Digest) (roundtrip : ∀ d, dec (enc d) = d)
    (d1 d2 : Digest) (h : enc d1 = enc d2) : d1 = d2 := by
  have hx : dec (enc d1) = dec (enc d2) := by rw [h]
  rw [roundtrip, roundtrip] at hx; exact hx

/-! ## 10 — rewriteFloorExact: confirmed ⟹ N=3; incomplete ⟹ N<3 (under well-formedness). -/
theorem rewriteFloorExactConfirmed (f : Facts) (h : isConfirmed f) : N f = 3 := by
  unfold N; exact h.2
theorem rewriteFloorExactIncomplete (f : Facts) (hwf : wf f) (h : ¬ isConfirmed f) : N f < 3 := by
  unfold isConfirmed at h; unfold N wf at *
  cases hsp : f.seatPresent with
  | false => simp [hsp] at hwf; omega
  | true =>
    have hne : f.distinctClasses ≠ 3 := fun hc => h ⟨hsp, hc⟩
    simp [hsp] at hwf; omega

/-! ## 11 — crossEcologyEquivocationBound: with the log seat absent (≤2 ecologies fixed), the outcome is
    never a confirmed anchor — a single ecology cannot manufacture the third seat. -/
theorem crossEcologyEquivocationBound (f : Facts) (hwf : wf f) (habsent : f.seatPresent = false) :
    ¬ isConfirmed f ∧ N f < 3 := by
  have hc : ¬ isConfirmed f := by unfold isConfirmed; simp [habsent]
  exact ⟨hc, rewriteFloorExactIncomplete f hwf hc⟩

end Simurgh.Stage5M
