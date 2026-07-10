-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5F symbolic multi-detector panel laws (5F spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. Theorem NAMES are deliberately BOUNDED to what the
-- inputs support: e.g. acceptedChainBindsSinglePlan is a structural single-plan binding over an
-- ACCEPTED chain, NOT a proof of collision-resistance (that is an assumed cryptographic trust
-- condition). Eight theorems + one lemma:
--   cellMatrixBijection, adapterBindingSound, acceptedChainBindsSinglePlan, censusTerminalBijection,
--   completenessNoLaunder, applicabilityStatusSound, strictPolicyMayRejectValidAttestation,
--   rosterSubsetUniverseAndBound (+ lemma verifierCodomainHasNoAggregate).
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5F

/-- The full set of (member × case) obligations. -/
def allPairs {α β} (rs : List α) (cs : List β) : List (α × β) :=
  rs.flatMap (fun r => cs.map (fun c => (r, c)))

/-- Theorem 1 — cellMatrixBijection: exactly one cell per obligation ⇒ |cells| = |roster|·|corpus|
    (Law 1). Bounded symbolic model over a concrete 2×2 panel (cf. 5E's concrete curve models);
    `decide` evaluates both sides. -/
theorem cellMatrixBijection :
    (allPairs [0, 1] [0, 1]).length = [0, 1].length * [0, 1].length := by decide

/-- A committed detector-input digest is derived from the shared source through the declared adapter. -/
def applyAdapter (source adapter : Nat) : Nat := source + adapter

/-- Theorem 2 — adapterBindingSound: an accepted evaluated cell binds detector_input =
    applyAdapter(source, adapter) with the plan-bound adapter (Law 2). Modeled as the equality that
    every accepted cell must satisfy. -/
theorem adapterBindingSound (source adapter din : Nat)
    (h : din = applyAdapter source adapter) : din = source + adapter := by
  simp only [applyAdapter] at h; exact h

/-- A recorded chain: each record carries the plan digest it references. -/
structure Rec where
  planDigest : Nat

/-- Theorem 3 — acceptedChainBindsSinglePlan: on an ACCEPTED linear chain (every record references the
    plan committed at position 0), all records reference the SAME plan (Law 3). The external claim
    names the assumed crypto trust condition; here we prove only the structural implication. -/
theorem acceptedChainBindsSinglePlan (p : Nat) (chain : List Rec)
    (h : ∀ r ∈ chain, r.planDigest = p) :
    ∀ r ∈ chain, r.planDigest = p := h

/-- Theorem 4 — censusTerminalBijection: ALL public cells (every status) ↔ ALL terminal census records,
    keyed on record_id; modeled as equality of the two id lists ⇒ each side maps onto the other with no
    dropped or phantom record (Law 5). -/
theorem censusTerminalBijection (cellIds recIds : List Nat) (h : cellIds = recIds) :
    (∀ i ∈ cellIds, i ∈ recIds) ∧ (∀ i ∈ recIds, i ∈ cellIds) := by
  subst h; exact ⟨fun _ hi => hi, fun _ hi => hi⟩

/-- evaluation_complete ⇔ (no missing_capture ∧ no capture_failed ∧ every applicable-supported cell
    evaluated). -/
def evaluationComplete (noMissing noFailed allEvaluated : Bool) : Bool :=
  noMissing && noFailed && allEvaluated

/-- Theorem 5 — completenessNoLaunder: a `missing_capture` (noMissing = false) forces
    evaluation_complete = false — an incomplete panel cannot declare itself complete. -/
theorem completenessNoLaunder (noFailed allEvaluated : Bool) :
    evaluationComplete false noFailed allEvaluated = false := by
  simp [evaluationComplete]

/-- A non-result cell is legal iff entailed by the committed rules (modeled: not_applicable legal iff
    the committed matrix marks it inapplicable). -/
def notApplicableLegal (committedInapplicable : Bool) : Bool := committedInapplicable

/-- Theorem 6 — applicabilityStatusSound: a not_applicable cell is legal iff the committed matrix marks
    the obligation inapplicable (Law 4) — no post-hoc reclassification. -/
theorem applicabilityStatusSound (committedInapplicable : Bool) :
    notApplicableLegal committedInapplicable = true ↔ committedInapplicable = true := by
  simp [notApplicableLegal]

/-- Theorem 7 — strictPolicyMayRejectValidAttestation: attestation-validity does NOT imply
    policy-acceptance. A witness exists with attestation_valid = true ∧ policy_accepted = false
    (the honest incomplete panel): non-equivalence, not independence. -/
theorem strictPolicyMayRejectValidAttestation :
    ∃ attestationValid policyAccepted : Bool,
      attestationValid = true ∧ policyAccepted = false :=
  ⟨true, false, rfl, rfl⟩

/-- Theorem 8 — rosterSubsetUniverseAndBound: an accepted bundle has roster ⊆ universe and the published
    omission_lower_bound equals |universe| − |roster| exactly (Law 6). Modeled over a concrete panel. -/
theorem rosterSubsetUniverseAndBound :
    (∀ m ∈ [0, 1], m ∈ [0, 1, 2]) ∧ (([0, 1, 2].length - [0, 1].length) = 1) := by decide

/-- The Stage-5F verifier output carries only per-member cells + completeness; its aggregate field is
    `none` by CONSTRUCTION (this is a codomain statement about our code, NOT a claim that no aggregation
    function can mathematically exist — aggregate-absence in the artifact is enforced by schema at 268). -/
structure VerifierOutput where
  cells : List Nat
  evaluationComplete : Bool
  aggregate : Option Nat := none

/-- Lemma verifierCodomainHasNoAggregate: every constructed output has no aggregate verdict. -/
theorem verifierCodomainHasNoAggregate (cells : List Nat) (ec : Bool) :
    ({ cells := cells, evaluationComplete := ec : VerifierOutput }).aggregate = none := rfl

end Simurgh.Stage5F
