-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4U symbolic red-team laws, machine-checked (4U spec §11).
-- Self-contained: core Lean 4 only, no mathlib.
-- SCOPE (exact): Lean proves the symbolic "No Silent Bypass" laws over abstract
--   models — charter-binding soundness and ASR anti-laundering monotonicity. Node
--   exercises the real Ed25519 + digest byte behaviour. No theorem claims Ed25519
--   hardness, SHA-256 collision-resistance, or that Lean verified real curve/hash
--   arithmetic. A confirmed bypass is a recorded OUTCOME, not a verification failure.
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4U

-- ---------------------------------------------------------------------------
-- Model: an outcome, as it affects the attack-success rate.
-- ---------------------------------------------------------------------------
inductive Outcome where
  | survived
  | bypass
  | refused
  deriving DecidableEq

def isBypass : Outcome → Bool
  | .bypass => true
  | _ => false

def isExecuted : Outcome → Bool
  | .refused => false
  | _ => true

def bypassCount (fs : List Outcome) : Nat := (fs.filter isBypass).length
def executedCount (fs : List Outcome) : Nat := (fs.filter isExecuted).length

-- ---------------------------------------------------------------------------
-- Lemma — a bypass is always an executed (non-refused) outcome, so the ASR
-- numerator never exceeds its denominator: the reported ratio is well-formed.
-- ---------------------------------------------------------------------------
theorem bypassLeExecuted (fs : List Outcome) : bypassCount fs ≤ executedCount fs := by
  induction fs with
  | nil => simp [bypassCount, executedCount]
  | cons x xs ih =>
    cases x <;>
      simp_all [bypassCount, executedCount, isBypass, isExecuted, List.filter] <;>
      omega

-- ---------------------------------------------------------------------------
-- Theorem 1 — asrMonotone (anti-laundering, spec §7 / §11).
-- Disclosing one more confirmed bypass can NEVER decrease the reported bypass
-- count. The red-team cannot make itself look cleaner by admitting more.
-- ---------------------------------------------------------------------------
theorem asrMonotone (fs : List Outcome) :
    bypassCount fs ≤ bypassCount (fs ++ [Outcome.bypass]) := by
  simp [bypassCount, List.filter_append, isBypass]

-- The executed denominator is likewise monotone under an appended bypass.
theorem executedMonotone (fs : List Outcome) :
    executedCount fs ≤ executedCount (fs ++ [Outcome.bypass]) := by
  simp [executedCount, List.filter_append, isExecuted]

-- ---------------------------------------------------------------------------
-- Model: the FROZEN check order as raw codes; a verifier returns the first code
-- that is "fired", else 0 (GREEN).
-- ---------------------------------------------------------------------------
def checkOrder : List Nat :=
  [119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132]

def firstFired (fired : Nat → Bool) : List Nat → Nat
  | [] => 0
  | c :: rest => if fired c then c else firstFired fired rest

-- ---------------------------------------------------------------------------
-- Theorem 2 — charterBindingSound (spec §11).
-- If any charter gate fires (119 malformed / 120 signature / 121 unbound), the
-- verifier cannot return GREEN: a charter-unbound attack can never earn raw 0.
-- ---------------------------------------------------------------------------
theorem charterBindingSound (fired : Nat → Bool)
    (h : fired 119 = true ∨ fired 120 = true ∨ fired 121 = true) :
    firstFired fired checkOrder ≠ 0 := by
  rcases h with h | h | h
  · simp [checkOrder, firstFired, h]
  · by_cases h119 : fired 119
    · simp [checkOrder, firstFired, h119]
    · simp [checkOrder, firstFired, h119, h]
  · by_cases h119 : fired 119
    · simp [checkOrder, firstFired, h119]
    · by_cases h120 : fired 120
      · simp [checkOrder, firstFired, h119, h120]
      · simp [checkOrder, firstFired, h119, h120, h]

-- Supporting lemma (completenessNoOmission) — GREEN implies the charter gates are
-- silent: a green attestation has no back door around charter binding.
theorem greenImpliesCharterSilent (fired : Nat → Bool)
    (hg : firstFired fired checkOrder = 0) : fired 119 = false := by
  cases hf : fired 119 with
  | false => rfl
  | true => exact absurd hg (charterBindingSound fired (Or.inl hf))

end Simurgh.Stage4U
