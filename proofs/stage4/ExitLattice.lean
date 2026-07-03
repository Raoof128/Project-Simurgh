-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4 exit-code lattice: the shared typed-exit wrapper (4H..4M) is TOTAL and FAIL-CLOSED.
-- Self-contained: core Lean 4 only, no mathlib. Model: `stage4Code` looks a raw code up in a
-- provider-supplied partial map and defaults to run-level 3 (the most severe) on any miss.
-- This formalizes `stage4CodeForRawCode` in tools/simurgh-attestation/stage4h/exitCodes.mjs.
-- Limitation (signed): proof_is_of_model_not_implementation — the concrete map table is data,
-- exercised in JS; this proves the WRAPPER discipline (totality + fail-closed default).

namespace Simurgh.Stage4

/-- The wrapper: a raw code maps through the (partial) run-level table, or fails closed to 3. -/
def stage4Code (level : Nat → Option Nat) (c : Nat) : Nat :=
  (level c).getD 3

/-- Fail-closed: any code absent from the table maps to run-level 3 (most severe). -/
theorem fail_closed (level : Nat → Option Nat) (c : Nat) (h : level c = none) :
    stage4Code level c = 3 := by
  simp [stage4Code, h]

/-- Maps through: a code present in the table maps to exactly its declared level. -/
theorem maps_through (level : Nat → Option Nat) (c n : Nat) (h : level c = some n) :
    stage4Code level c = n := by
  simp [stage4Code, h]

/-- Totality: every raw code (mapped or not) yields a defined result — either its table level
    or the fail-closed default 3. The wrapper is a total function; there is no "unmapped → crash"
    path, so the exit code is always well-defined. -/
theorem total (level : Nat → Option Nat) (c : Nat) :
    stage4Code level c = 3 ∨ ∃ n, level c = some n ∧ stage4Code level c = n := by
  cases h : level c with
  | none => exact Or.inl (by simp [stage4Code, h])
  | some n => exact Or.inr ⟨n, rfl, by simp [stage4Code, h]⟩

/-- Additive-code safety: introducing a NEW raw code (previously `none`) can only ever produce
    the fail-closed level 3 until the table is explicitly extended — so an un-reviewed code can
    never silently downgrade severity. This is the invariant behind every "additive raw codes"
    commit (30, 31-38, 40-42, 43-46). -/
theorem new_code_fails_closed (level : Nat → Option Nat) (c : Nat) (h : level c = none) :
    stage4Code level c = 3 ∧ stage4Code level c ≠ 0 ∧ stage4Code level c ≠ 1 := by
  refine ⟨fail_closed level c h, ?_, ?_⟩ <;> simp [stage4Code, h]

end Simurgh.Stage4
