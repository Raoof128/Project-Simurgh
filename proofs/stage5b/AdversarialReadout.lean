-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5B symbolic adversarial-readout laws (5B spec §6). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only. Seven theorems: outcomePartitionTotal, asrConservation,
-- noSilentBypassSound, precommittedReadoutSound, precommitMonotone, severityLockTotal,
-- floorReconciliationSound. Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5B

/-- The four outcome classes (spec §3): a red-team attack resolves to exactly one. -/
inductive Outcome where
  | survived
  | bypass
  | modelRefused
  | laneDisabled
  deriving DecidableEq

open Outcome

/-- classify: map each attack to exactly one outcome (a total function). -/
def classify {α} (f : α → Outcome) : List α → List Outcome
  | [] => []
  | a :: as => f a :: classify f as

/-- Theorem 1 — outcomePartitionTotal: every scheduled attack receives exactly one outcome;
    the outcome list length equals the attack list length (no attack dropped or duplicated). -/
theorem outcomePartitionTotal {α} (f : α → Outcome) :
    ∀ atks : List α, (classify f atks).length = atks.length
  | [] => rfl
  | a :: as => by simp [classify, outcomePartitionTotal f as]

/-- Count outcomes of a given kind (structural recursion). -/
def countO (o : Outcome) : List Outcome → Nat
  | [] => 0
  | x :: xs => (if x = o then 1 else 0) + countO o xs

/-- Theorem 2 — asrConservation: the four class counts sum to the total; the published
    aggregates equal the recount, nothing lost or invented. -/
theorem asrConservation :
    ∀ os : List Outcome,
      countO survived os + countO bypass os + countO modelRefused os + countO laneDisabled os
        = os.length
  | [] => rfl
  | x :: xs => by
    have ih := asrConservation xs
    cases x <;> simp [countO, List.length_cons] <;> omega

/-- Theorem 3 — noSilentBypassSound: if any outcome is a bypass, the bypass count is positive.
    A bypass cannot be hidden — the ASR numerator is strictly > 0. -/
theorem noSilentBypassSound (os : List Outcome) (h : bypass ∈ os) : 0 < countO bypass os := by
  induction os with
  | nil => simp at h
  | cons x xs ih =>
    simp only [countO]
    rcases List.mem_cons.mp h with hx | hxs
    · subst hx; rw [if_pos (rfl : bypass = bypass)]; omega
    · have hpos := ih hxs; split <;> omega

/-- Theorem 4 — precommittedReadoutSound (the frontier theorem): if the frozen capture does not
    reconcile to the committed tensor root, the verifier rejects (No Author's Map, raw 214). -/
def rejected (reconciles : Bool) : Bool := !reconciles
theorem precommittedReadoutSound (reconciles : Bool) :
    reconciles = false → rejected reconciles = true := by
  intro h; simp [rejected, h]

/-- Theorem 5 — precommitMonotone: an attack is scorable iff it is under the signed manifest;
    an attack id not in the manifest cannot be scored (No Post-Hoc Attack). -/
def scorable (atk : Nat) (manifest : List Nat) : Prop := atk ∈ manifest
theorem precommitMonotone (atk : Nat) (manifest : List Nat) :
    atk ∉ manifest → ¬ scorable atk manifest := by
  intro h; exact h

/-- Theorem 6 — severityLockTotal: if every bypass finding carries a signed severity, then no
    bypass is left unlabelled (raw 220). A finding is (outcome, hasSeverity). -/
def unlabelledBypass : List (Outcome × Bool) → Bool
  | [] => false
  | (o, s) :: fs => (decide (o = bypass) && !s) || unlabelledBypass fs
def allSevered : List (Outcome × Bool) → Bool
  | [] => true
  | (o, s) :: fs => (decide (o = bypass) → s) && allSevered fs
theorem severityLockTotal :
    ∀ fs : List (Outcome × Bool), allSevered fs = true → unlabelledBypass fs = false
  | [], _ => rfl
  | (o, s) :: fs, h => by
    simp only [allSevered, Bool.and_eq_true] at h
    simp only [unlabelledBypass, severityLockTotal fs h.2, Bool.or_false]
    cases o <;> cases s <;> simp_all

/-- Theorem 7 — floorReconciliationSound: residue bypasses at or below the signed floor are
    corroborated; above the floor (without a new signed finding) they are exceeded. -/
def corroborated (bypasses floor : Nat) : Bool := decide (bypasses ≤ floor)
theorem floorReconciliationSound (bypasses floor : Nat) :
    bypasses ≤ floor → corroborated bypasses floor = true := by
  intro h; simp only [corroborated, decide_eq_true_eq]; exact h

end Simurgh.Stage5B
