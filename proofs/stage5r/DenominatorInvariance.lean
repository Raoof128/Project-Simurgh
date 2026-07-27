/-
  Stage 5R — L4: no admission sequence changes the inherited denominator.

  §0.1's first governing sentence, formally: "Nothing in 5R changes the published 5Q result. The
  6.2% stays 6.2% forever."

  §6.2 makes it structural in the data model — the ledger has no field capable of expressing a
  different 5Q-era denominator — and this makes it structural in the algebra: admitting cells is the
  only operation the campaign has, and it cannot touch `inheritedCells` however many times it runs,
  in whatever order, with whatever identifiers.
-/

namespace Vpf.DenominatorInvariance

/-- The ledger: a fixed inherited denominator, and the cells discharged so far. -/
structure Ledger where
  inheritedCells : Nat
  discharged : List Nat
  deriving Repr

/-- The only operation a campaign has.

    Named `admitCell` rather than `admit`: `admit` is a Lean tactic that closes a goal without
    proving it, and the proof gate scans for it. A definition that forces a scanner to special-case
    it is a definition with a worse name. -/
def admitCell (l : Ledger) (id : Nat) : Ledger :=
  { l with discharged := id :: l.discharged }

/-- Admitting one cell leaves the denominator alone. -/
theorem admitCellPreserves (l : Ledger) (id : Nat) :
    (admitCell l id).inheritedCells = l.inheritedCells := rfl

/-- L4. NO sequence of admissions changes the denominator. -/
theorem denominatorInvariant :
    ∀ (ids : List Nat) (l : Ledger), (ids.foldl admitCell l).inheritedCells = l.inheritedCells := by
  intro ids
  induction ids with
  | nil => intro l; rfl
  | cons a t ih =>
    intro l
    simp [List.foldl, ih (admitCell l a), admitCellPreserves]

/-- The numerator, by contrast, is free to move — otherwise L4 would be a theorem about a ledger
    that cannot record anything. -/
theorem numeratorDoesMove :
    ((admitCell ⟨23332, []⟩ 7).discharged).length = 1 := by rfl

/-- Non-vacuity: the inherited figure survives a real sequence, at its real value. -/
theorem witnessInheritedSurvives :
    (([1, 2, 3].foldl admitCell ⟨23332, [5]⟩).inheritedCells) = 23332 := by rfl

/-- And the cells accumulate underneath it, so the invariance is not the invariance of a no-op. -/
theorem witnessCellsAccumulate :
    (([1, 2, 3].foldl admitCell ⟨23332, [5]⟩).discharged).length = 4 := by rfl

end Vpf.DenominatorInvariance
