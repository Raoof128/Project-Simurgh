-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4Q Friction Precedence Law, machine-checked (4Q spec §4.1 + Freeze 5).
-- Self-contained: core Lean 4 only, no mathlib. The theorems are over the RECORDED-run
-- decision model, not physical time (signed limitation:
-- pincer_ordering_is_recorded_run_order_not_physical_time_truth).
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4Q

/-- An approval receipt in the recorded model: its approver key and its digest. -/
structure Receipt where
  approverKey : Nat
  digest : Nat

/-- A protected authority crossing: the harness key and the digest it embeds. -/
structure Crossing where
  harnessKey : Nat
  embeddedDigest : Nat

/-- A recorded run: optional receipt, the crossing, chain positions, census, plus the
    Freeze-5 exemption facts (whether a signed exemption is bound, and whether policy
    admits it). -/
structure Run where
  receipt? : Option Receipt
  crossing : Crossing
  approvalPos : Nat
  crossingPos : Nat
  census : Nat
  crossings : Nat
  exemptionSignedBound : Bool   -- a signed exemption object bound to this crossing
  policyAdmitsExemption : Bool   -- crossing.boundary_kind ∈ admissible_exemption_boundary_kinds

/-- Causal claw: the crossing embeds the receipt's digest. -/
def causallyBound (r : Run) : Prop :=
  match r.receipt? with
  | some rec => r.crossing.embeddedDigest = rec.digest
  | none => False

/-- Chain claw: the approval precedes the crossing in the recorded run. -/
def chainPrecedes (r : Run) : Prop := r.approvalPos < r.crossingPos

/-- Two-key pincer: approver key distinct from the tool/harness key. -/
def approverDistinct (r : Run) : Prop :=
  match r.receipt? with
  | some rec => rec.approverKey ≠ r.crossing.harnessKey
  | none => False

/-- Completeness: the committed census equals the counted crossings. -/
def censusHonest (r : Run) : Prop := r.census = r.crossings

/-- The approval-path acceptance predicate. -/
def accept (r : Run) : Prop :=
  causallyBound r ∧ chainPrecedes r ∧ approverDistinct r ∧ censusHonest r

/-- Friction Precedence Law: any accepted crossing satisfies the two-key pincer. -/
theorem frictionPrecedence (r : Run) (h : accept r) :
    causallyBound r ∧ chainPrecedes r ∧ approverDistinct r :=
  ⟨h.1, h.2.1, h.2.2.1⟩

/-- No silent gap: with no approval receipt in the run, the approval path cannot accept. -/
theorem failClosed (r : Run) (h : r.receipt? = none) : ¬ accept r := by
  intro hacc
  have hcb := hacc.1
  simp [causallyBound, h] at hcb

/-- The two-key pincer is machine-visible: same-key approval never accepts. -/
theorem sameKeyFails (r : Run) (rec : Receipt) (hrec : r.receipt? = some rec)
    (hkey : rec.approverKey = r.crossing.harnessKey) : ¬ accept r := by
  intro hacc
  have hd := hacc.2.2.1
  simp [approverDistinct, hrec] at hd
  exact hd hkey

/-- Coverage: acceptance carries census honesty (even absence leaves feathers). -/
theorem frictionCoverage (r : Run) (h : accept r) : censusHonest r := h.2.2.2

-- Freeze 5 — No Silent Exemption. An unbound crossing (no receipt) is accepted ONLY via a
-- SIGNED exemption bound to it AND explicitly admitted by policy, with census still honest.
def acceptExempt (r : Run) : Prop :=
  r.receipt? = none ∧ r.exemptionSignedBound = true ∧ r.policyAdmitsExemption = true ∧ censusHonest r

theorem noSilentExemption (r : Run) (h : acceptExempt r) :
    r.exemptionSignedBound = true ∧ r.policyAdmitsExemption = true ∧ censusHonest r :=
  ⟨h.2.1, h.2.2.1, h.2.2.2⟩

end Simurgh.Stage4Q
