/-
  Stage 5R — L5: verdict invariance under EVERY forbidden surrogate, with the declared signal
  pinned, means the detector discriminates by the declared signal alone.

  §3.4 and §1.4. The pinned-input clause is load-bearing and was added deliberately: invariance
  proves nothing about causation unless the model fixes what was allowed to vary. Here the model
  fixes it exactly — an observation is the declared property plus the six frozen surrogates, and
  suppression drives every surrogate to a fixed value.

  THIS IS ALSO WHY SUPPRESSION MUST BE APPLIED ALL AT ONCE. Suppressing one surrogate at a time
  proves invariance under each in isolation and NOT the conclusion below: a detector reading a
  disjunction of surrogates survives every single-surrogate suppression, because suppressing one
  leaves the others loud and the verdict never moves. The implementation was corrected to suppress
  the whole set at once after this file's statement made the gap explicit.
-/

namespace Vpf.OrthogonalSoundness

/-- An observation: the declared signal's property, and §3.4's six frozen surrogates. -/
structure Obs where
  declared : Bool
  exitCode : Nat
  threw : Bool
  stderrNonEmpty : Bool
  parseFailed : Bool
  elapsed : Nat
  genericMatch : Bool
  deriving DecidableEq, Repr

/-- A detector is any function from an observation to a verdict. -/
abbrev Detector := Obs → Bool

/-- Suppress every forbidden surrogate at once, leaving the declared property untouched. -/
def suppressAll (o : Obs) : Obs :=
  { declared := o.declared, exitCode := 0, threw := false, stderrNonEmpty := false,
    parseFailed := false, elapsed := 0, genericMatch := false }

/-- Two observations agreeing on the declared property are identical once suppressed. -/
theorem suppressAllEqOfDeclared (a b : Obs) (h : a.declared = b.declared) :
    suppressAll a = suppressAll b := by
  simp [suppressAll, h]

/-- L5. A detector invariant under suppression of every surrogate reads the declared signal alone. -/
theorem discriminatesByDeclaredAlone
    (d : Detector) (hinv : ∀ o, d (suppressAll o) = d o) :
    ∀ a b : Obs, a.declared = b.declared → d a = d b := by
  intro a b h
  have ha : d a = d (suppressAll a) := (hinv a).symm
  have hb : d b = d (suppressAll b) := (hinv b).symm
  rw [ha, hb, suppressAllEqOfDeclared a b h]

/-- An honest detector: reads the declared property and nothing else. -/
def honest : Detector := fun o => o.declared

/-- A sadness detector: fires on an unrelated failure, which is §1.4's whole concern. -/
def sadness : Detector := fun o => o.threw

/-- Non-vacuity, one: the hypothesis is satisfiable — an honest detector meets it. -/
theorem witnessHonestIsInvariant : ∀ o, honest (suppressAll o) = honest o := by
  intro o; rfl

/-- Non-vacuity, two: the hypothesis is NOT vacuous — the sadness detector fails it, so L5's
    conclusion is not something every detector satisfies for free. -/
theorem witnessSadnessIsNotInvariant : ¬(∀ o, sadness (suppressAll o) = sadness o) := by
  intro h
  have := h ⟨true, 1, true, true, true, 1, true⟩
  simp [sadness, suppressAll] at this

/-- And the sadness detector really does violate the conclusion: two observations that agree on the
    declared signal, and it answers differently. -/
theorem witnessSadnessDiscriminatesOnASurrogate :
    sadness ⟨true, 0, true, false, false, 0, false⟩ ≠
      sadness ⟨true, 0, false, false, false, 0, false⟩ := by
  simp [sadness]

end Vpf.OrthogonalSoundness
