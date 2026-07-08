-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5A symbolic narrative–workspace-conflict laws (5A spec §4). Core Lean 4 only, no
-- mathlib. SCOPE: symbolic models only. Five theorems are substantive (verdictTotal,
-- flagPartition, contradictionSound, conflictAntitone, tallyConservation); one is an
-- invariant-lock (publicSubsetAudit). Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5A

/-- The three verdicts of the total classification (Law 2: No Silent Claim). -/
inductive Verdict where
  | corroborated
  | contradicted
  | unreadable
  deriving DecidableEq

open Verdict

/-- Classifying a list of claims maps each to exactly one verdict (a total function). -/
def classify {α} (f : α → Verdict) : List α → List Verdict
  | [] => []
  | c :: cs => f c :: classify f cs

/-- Theorem 1 — verdictTotal (substantive): every declared claim receives exactly one verdict
    row; the classification length equals the claim-table length. A dropped or duplicated
    verdict would break this — No Silent Claim. -/
theorem verdictTotal {α} (f : α → Verdict) :
    ∀ claims : List α, (classify f claims).length = claims.length
  | [] => rfl
  | c :: cs => by simp [classify, verdictTotal f cs]

/-- Theorem 2 — flagPartition (substantive): the flag set splits into covered (predicate holds)
    and unnarrated (predicate fails) with NO overlap and NO remainder — covered.length +
    unnarrated.length = |F|. No Silent Flag. -/
theorem flagPartition {α} (p : α → Bool) :
    ∀ l : List α, (l.filter p).length + (l.filter (fun x => ! p x)).length = l.length
  | [] => rfl
  | x :: xs => by
    have ih := flagPartition p xs
    cases h : p x <;> simp [List.filter, h, List.length_cons] <;> omega

/-- The asserts_unflagged verdict: corroborated iff there are no hits, else contradicted. -/
def verdictUnflagged (nHits : Nat) : Verdict :=
  if nHits = 0 then corroborated else contradicted

/-- Theorem 3 — contradictionSound (substantive): a `contradicted` verdict for an
    asserts_unflagged claim exists IFF a hit witness exists (nHits ≠ 0). A verdict can never
    assert a conflict without exhibiting one. -/
theorem contradictionSound (nHits : Nat) :
    verdictUnflagged nHits = contradicted ↔ nHits ≠ 0 := by
  unfold verdictUnflagged
  cases nHits with
  | zero => simp
  | succ n => simp

/-- Corroboration (asserts_unflagged) as a boolean on the hit count. -/
def corroboratesU (nHits : Nat) : Bool := nHits = 0

/-- Theorem 4 — conflictAntitone (substantive): for asserts_unflagged claims, growing the flag
    set never turns `contradicted` into `corroborated`. Corroboration is ANTITONE in the hit
    count: if the larger-flag world corroborates (n' hits), so does every smaller one (n ≤ n').
    New telemetry can only surface conflicts, never launder them (3Q lattice, inside edition).
    The dual for asserts_flagged is deliberately NOT claimed (it is false by design). -/
theorem conflictAntitone (n n' : Nat) (hle : n ≤ n') :
    corroboratesU n' = true → corroboratesU n = true := by
  unfold corroboratesU
  intro h
  simp only [decide_eq_true_eq] at h ⊢
  omega

/-- Count verdicts of a given kind (structural recursion). -/
def countV (v : Verdict) : List Verdict → Nat
  | [] => 0
  | x :: xs => (if x = v then 1 else 0) + countV v xs

/-- Theorem 5 — tallyConservation (substantive): the per-verdict counts sum to the total claim
    count — the published aggregates equal the recount, with nothing lost or invented. -/
theorem tallyConservation :
    ∀ vs : List Verdict,
      countV corroborated vs + countV contradicted vs + countV unreadable vs = vs.length
  | [] => rfl
  | x :: xs => by
    have ih := tallyConservation xs
    cases x <;> simp [countV, List.length_cons] <;> omega

/-- The public and audit check-code sets (5A spec §2): identical set, audit differs by DEPTH. -/
def publicCodes : List Nat := [199, 200, 201, 202, 203, 204, 205, 206, 207, 208]
def auditCodes : List Nat := [199, 200, 201, 202, 203, 204, 205, 206, 207, 208]

/-- Theorem 6 — publicSubsetAudit (invariant-lock): every public check code is an audit check
    code — a public PASS can never contradict audit scope. -/
theorem publicSubsetAudit : ∀ c ∈ publicCodes, c ∈ auditCodes := by
  intro c hc
  simpa [publicCodes, auditCodes] using hc

end Simurgh.Stage5A
