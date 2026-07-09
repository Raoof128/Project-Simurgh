-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5C symbolic semantic-bypass laws (5C spec §5). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. Seven theorems: gridClosure, partitionTotal,
-- slipTableComplete, slipRateSound, floorMonotone, kernelDisjoint, mutationDeterminism.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5C

/-- The total (MR × base) product enumerates every pair. -/
def product {α β} (mrs : List α) (bases : List β) : List (α × β) :=
  mrs.flatMap (fun m => bases.map (fun b => (m, b)))

/-- Theorem 1 — gridClosure: the grid IS the complete product; its length is |MR|·|base|
    (No Cherry-Picked Mutation — the grid omits nothing from the reachable set). -/
theorem gridClosure {α β} (mrs : List α) (bases : List β) :
    (product mrs bases).length = mrs.length * bases.length := by
  induction mrs with
  | nil => simp [product]
  | cons m ms ih =>
    simp only [product, List.flatMap_cons, List.length_append, List.length_map,
      List.length_cons, Nat.succ_mul] at *
    omega

/-- The four cell classes (spec §2): each grid cell resolves to exactly one. -/
inductive CellClass where
  | caught
  | slipped
  | notApplicable
  | degenerate
  deriving DecidableEq

/-- classify: map each cell to exactly one class (a total function). -/
def classify {α} (f : α → CellClass) : List α → List CellClass
  | [] => []
  | a :: as => f a :: classify f as

/-- Theorem 2 — partitionTotal: every grid cell receives exactly one class; the class list
    length equals the cell list length (no cell dropped or duplicated). -/
theorem partitionTotal {α} (f : α → CellClass) :
    ∀ cells : List α, (classify f cells).length = cells.length
  | [] => rfl
  | a :: as => by simp [classify, partitionTotal f as]

/-- A cell is a slip iff its class is `slipped`. -/
def isSlipped (c : CellClass) : Bool :=
  match c with
  | .slipped => true
  | _ => false

/-- The slip table is the projection of the slipped cells. -/
def projectSlips (cells : List CellClass) : List CellClass :=
  cells.filter isSlipped

/-- Theorem 3 — slipTableComplete: the signed slip table equals the slipped cells of the grid
    (No Silent Slip — nothing laundered out). -/
theorem slipTableComplete (cells : List CellClass) :
    projectSlips cells = cells.filter isSlipped := rfl

/-- Slip-rate as an exact integer pair. -/
def num (slipped : Nat) : Nat := slipped
def den (caught slipped : Nat) : Nat := caught + slipped

/-- Theorem 4a — slipRateDenSound: the denominator is exactly caught + slipped. -/
theorem slipRateDenSound (caught slipped : Nat) : den caught slipped = caught + slipped := rfl

/-- Theorem 4b — slipRateZeroGuard: when the denominator is 0 (all not_applicable/degenerate),
    the numerator is 0 too — the guarded 0/0 ⇒ rate 0 case (the Lean edge). -/
theorem slipRateZeroGuard (caught slipped : Nat) (h : den caught slipped = 0) :
    num slipped = 0 := by
  simp only [den] at h
  simp only [num]
  omega

/-- Count of cells satisfying a boolean predicate (structural recursion). -/
def countTrue {α} (p : α → Bool) : List α → Nat
  | [] => 0
  | x :: xs => (if p x then 1 else 0) + countTrue p xs

/-- Theorem 5 — floorMonotone: if every newer-version slip is also an older-version slip
    (slipSet(vNew) ⊆ slipSet(vOld) pointwise), the newer slip count never exceeds the older —
    a sound gate improvement cannot regress. -/
theorem floorMonotone {α} (sNew sOld : α → Bool) (h : ∀ x, sNew x = true → sOld x = true) :
    ∀ cells : List α, countTrue sNew cells ≤ countTrue sOld cells
  | [] => by simp [countTrue]
  | x :: xs => by
    have ih := floorMonotone sNew sOld h xs
    simp only [countTrue]
    by_cases hn : sNew x = true
    · have ho := h x hn
      rw [if_pos hn, if_pos ho]; omega
    · rw [if_neg hn]; split <;> omega

/-- The verifier state: a detector-text field (what mutations touch) and the kernel decision bit. -/
structure State where
  detectorText : Nat
  kernelBit : Bool

/-- authorise reads ONLY the kernel bit. -/
def authorise (s : State) : Bool := s.kernelBit

/-- A slip mutates ONLY the detector text. -/
def applySlip (s : State) (t : Nat) : State := { s with detectorText := t }

/-- Theorem 6 — kernelDisjoint: a semantic slip (mutating detector text) never changes the
    authorise verdict — a detector-slip is not a kernel breach (Law 3 / raw 237). -/
theorem kernelDisjoint (s : State) (t : Nat) : authorise (applySlip s t) = authorise s := rfl

/-- Theorem 7 — mutationDeterminism: the mutation engine is a function — equal (mr_id, base)
    yield equal output (reproducibility; the sealed digest recomputes, raw 229). -/
theorem mutationDeterminism {α β} (f : α → β) (a₁ a₂ : α) (h : a₁ = a₂) : f a₁ = f a₂ := by
  rw [h]

end Simurgh.Stage5C
