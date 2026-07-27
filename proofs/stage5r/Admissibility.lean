/-
  Stage 5R — L1: admissibility is CONJUNCTIVE.

  §4.1: a family is admissible only when all seven conditions hold. There is no partial
  admissibility; six of seven is inadmissible and the failing condition is published.

  Zero `sorry`, zero `admit`, zero `native_decide`. An escape hatch in a proof is the formal
  analogue of a vacuous gate: it type-checks, it is green, and it establishes nothing.

  The witnesses at the end are not decoration. A theorem about a predicate no model satisfies is
  true and worthless, so each file exhibits both a model that satisfies its statement non-trivially
  and one that does not.
-/

namespace Vpf.Admissibility

/-- §4.1's seven conditions, in §4.1's order. -/
structure Conditions where
  vulnerableDetected : Bool
  safeNotDetected : Bool
  orthogonalNotMisclassified : Bool
  premisesRecomputed : Bool
  roleMatches : Bool
  bindsToClosure : Bool
  restorationProven : Bool
  deriving DecidableEq, Repr

/-- The seven, as a list, so "any false" is a statement about all of them at once. -/
def toList (c : Conditions) : List Bool :=
  [c.vulnerableDetected, c.safeNotDetected, c.orthogonalNotMisclassified,
   c.premisesRecomputed, c.roleMatches, c.bindsToClosure, c.restorationProven]

/-- Admissible exactly when every condition holds. -/
def admissible (c : Conditions) : Bool := (toList c).all (fun b => b)

/-- There are seven conditions, not six and not eight. -/
theorem sevenConditions (c : Conditions) : (toList c).length = 7 := by
  simp [toList]

/-- L1. ANY false condition makes the family inadmissible. No partial credit. -/
theorem anyFalseIsInadmissible (c : Conditions) (h : false ∈ toList c) :
    admissible c = false := by
  cases c with
  | mk a b d e f g i =>
    cases a <;> cases b <;> cases d <;> cases e <;> cases f <;> cases g <;> cases i <;>
      simp_all [admissible, toList]

/-- The converse, so `admissible` cannot drift into meaning something weaker. -/
theorem admissibleIffAll (c : Conditions) :
    admissible c = true ↔ ∀ b ∈ toList c, b = true := by
  cases c with
  | mk a b d e f g i =>
    cases a <;> cases b <;> cases d <;> cases e <;> cases f <;> cases g <;> cases i <;>
      simp [admissible, toList]

/-- Non-vacuity, one: a model that IS admissible. -/
theorem witnessAdmissible :
    admissible ⟨true, true, true, true, true, true, true⟩ = true := by rfl

/-- Non-vacuity, two: six of seven is inadmissible, which is the rule doing work. -/
theorem witnessSixOfSevenFails :
    admissible ⟨true, true, false, true, true, true, true⟩ = false := by rfl

end Vpf.Admissibility
