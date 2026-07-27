/-
  Stage 5R — L2: per-role admissibility does NOT promote to class-wide.

  §4.2 is the blade in mechanical form:

      admissible(class R, role S)  ⟺  an admissible family exists with attack_class == R
                                       and target_security_role == S

  There is no rule promoting per-role admissibility to class-wide, and the absence is structural:
  admissibility is a predicate on a PAIR, so a statement about one pair says nothing about another.

  The honest formal content is a counterexample. "Promotion is not derivable" is not a theorem about
  a definition — one cannot prove the non-existence of a rule nobody wrote. What can be proved, and
  is what §4.2 actually needs, is that a model exists in which a class is admissible in one role and
  inadmissible in another, so any inference from the first to the second is unsound.
-/

namespace Vpf.NoPromotion

/-- A (class, role) pair. Admissibility is a fact about one of these and nothing larger. -/
structure Pair where
  cls : Nat
  role : Nat
  deriving DecidableEq, Repr

/-- The admissible families a campaign published. -/
abbrev Families := List Pair

/-- §4.2, verbatim: admissible at a pair exactly when an admissible family sits at that pair. -/
def admissibleAt (fs : Families) (p : Pair) : Bool := fs.contains p

/-- L2. A class admissible in one role and inadmissible in another — so promotion is unsound. -/
theorem noPromotion :
    ∃ (fs : Families) (r s s' : Nat),
      s ≠ s' ∧ admissibleAt fs ⟨r, s⟩ = true ∧ admissibleAt fs ⟨r, s'⟩ = false := by
  refine ⟨[⟨1, 1⟩], 1, 1, 2, ?_, ?_, ?_⟩
  · decide
  · rfl
  · rfl

/-- Admissibility depends on BOTH components: differing in the role alone already changes it. -/
theorem roleIsLoadBearing (fs : Families) (r s s' : Nat) (h : s ≠ s') :
    admissibleAt fs ⟨r, s⟩ = fs.contains ⟨r, s⟩ ∧ (Pair.mk r s ≠ Pair.mk r s') := by
  refine ⟨rfl, ?_⟩
  intro hEq
  exact h (congrArg Pair.role hEq)

/-- Non-vacuity: the predicate is satisfiable, so L2 is not a statement about an empty world. -/
theorem witnessAdmissibleSomewhere : admissibleAt [⟨1, 1⟩, ⟨1, 2⟩] ⟨1, 2⟩ = true := by rfl

/-- Non-vacuity, the other side: an empty campaign admits nothing. -/
theorem witnessEmptyAdmitsNothing (p : Pair) : admissibleAt [] p = false := by rfl

end Vpf.NoPromotion
