-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4V symbolic due-process laws (4V spec §11). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only — no claim about real hash/curve arithmetic. A red
-- recorded status inside a conflict map is a valid OUTCOME, not a verification failure.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage4V

inductive Cls
  | evidenceBacked
  | notDerivable
  | requiresHumanInput
  deriving DecidableEq

inductive Verb
  | agree
  | disputeByRecomputation
  | disputeAsJudgment
  deriving DecidableEq

inductive Status
  | agreed
  | conflictProven
  | absenceRebutted
  | disputeRecorded
  | disputeFailed
  deriving DecidableEq

/-- One contest: the target's class, the verb, whether the respondent's own evidence
recomputes their claim, and whether the recompute matches the operator's value. -/
structure Contest where
  cls : Cls
  verb : Verb
  recomputes : Bool
  matchesOperator : Bool

/-- The frozen status table (spec §3), a TOTAL function — geometry over intent. -/
def statusOf (c : Contest) : Status :=
  match c.verb with
  | .disputeAsJudgment => .disputeRecorded
  | .agree =>
    match c.cls with
    | .evidenceBacked => if c.recomputes && c.matchesOperator then .agreed else .disputeFailed
    | _ => .disputeFailed
  | .disputeByRecomputation =>
    if !c.recomputes then .disputeFailed
    else
      match c.cls with
      | .evidenceBacked => if c.matchesOperator then .agreed else .conflictProven
      | _ => .absenceRebutted

/-- Theorem 1 — noTrialInAbsentia: every contestable class admits a well-formed
contest (a judgment dispute is always available and is always recorded). -/
theorem noTrialInAbsentia (cls : Cls) :
    ∃ c : Contest, c.cls = cls ∧ statusOf c = .disputeRecorded :=
  ⟨⟨cls, .disputeAsJudgment, false, false⟩, rfl, rfl⟩

/-- Binding model: the conflict map is derivable only on the exact sealed capsule id. -/
def derive (boundTo actual : Nat) (cs : List Contest) : Option (List Status) :=
  if boundTo = actual then some (cs.map statusOf) else none

/-- Theorem 2 — noStrawman: any binding mismatch yields no conflict map. -/
theorem noStrawman (b a : Nat) (cs : List Contest) (h : b ≠ a) : derive b a cs = none := by
  simp [derive, h]

/-- Census model: ONE predicate applied to both parties. -/
def censusOk (complete rootOk epochOk : Bool) : Bool := complete && rootOk && epochOk
def operatorCensusOk := censusOk
def respondentCensusOk := censusOk

/-- Theorem 3 — sameRulesForDefence: the defence predicate IS the operator predicate. -/
theorem sameRulesForDefence : respondentCensusOk = operatorCensusOk := rfl

/-- Theorem 4 — disputeLocality: statuses are computed pointwise; changing the contest
at one position never changes the status at another. -/
theorem disputeLocality (cs : List Contest) (i j : Nat) (c' : Contest) (hij : i ≠ j) :
    ((cs.set i c').map statusOf)[j]? = (cs.map statusOf)[j]? := by
  rw [List.getElem?_map, List.getElem?_map, List.getElem?_set_ne hij]

/-- Mirror contest: re-derive the operator's own value — recomputes and matches. -/
def mirror (cls : Cls) : Contest := ⟨cls, .disputeByRecomputation, true, true⟩

/-- Theorem 5 — mirrorAllAgreed: a self-contest over an evidence_backed section is AGREED.
Symmetry is not asserted; it is constructed — statusOf carries no party-bias term. -/
theorem mirrorAllAgreed : statusOf (mirror .evidenceBacked) = .agreed := rfl

end Simurgh.Stage4V
