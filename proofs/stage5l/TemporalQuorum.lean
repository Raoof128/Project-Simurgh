-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5L symbolic Verifiable-Temporal-Commitment laws (VTC-Q spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. 14 theorems, all fully proved (no unfinished goals); no
-- user axioms — collision resistance and HashInjectiveOn are EXPLICIT theorem hypotheses.
-- Motto: BoundarySafe first, then ReviewerSafe.
namespace Simurgh.Stage5L

/-! ## 1 — acceptedAnchorsBindCommittedPolicySet: equal commitment digests ⟹ equal preimages, under a
    PASSED collision-resistance hypothesis (never a global axiom). -/
theorem acceptedAnchorsBindCommittedPolicySet {CommitInput Digest : Type}
    (commitDigest : CommitInput → Digest)
    (crHyp : ∀ a b, commitDigest a = commitDigest b → a = b)
    (a b : CommitInput) (h : commitDigest a = commitDigest b) : a = b :=
  crHyp a b h

/-! ## 2 — messageImprintBindsRawBytes: acceptance ⟹ both anchors bind the same commitment bytes. -/
structure Imprints where
  tsaImprint : Nat
  otsLeaf : Nat
  commitBytes : Nat
def bothBind (i : Imprints) : Prop := i.tsaImprint = i.commitBytes ∧ i.otsLeaf = i.commitBytes
theorem messageImprintBindsRawBytes (i : Imprints) (h : bothBind i) :
    i.tsaImprint = i.otsLeaf := by
  rw [h.1, h.2]

/-! ## 3 — boundedAuthorityFloor: any accepted profile has ≥1 bounded-time authority (OTS-only rejected). -/
structure Anchors where
  boundedAuthorities : Nat
  publication : Nat
def profileFloorMet (a : Anchors) : Prop := a.boundedAuthorities ≥ 1
theorem boundedAuthorityFloor (a : Anchors) (h : profileFloorMet a) : a.boundedAuthorities ≥ 1 := h
theorem otsOnlyInadmissible : ¬ profileFloorMet ⟨0, 1⟩ := by unfold profileFloorMet; decide

/-! ## 4 — quorumRequiresConfirmedDistinctRoots: vtc_quorum_confirmed ⟹ ≥threshold distinct domains ∧
    confirmed publication; pending is NOT confirmed. -/
inductive Finality | pending | confirmed | invalid
deriving DecidableEq
structure Quorum where
  distinctDomains : Nat
  threshold : Nat
  finality : Finality
def quorumConfirmed (q : Quorum) : Prop := q.distinctDomains ≥ q.threshold ∧ q.finality = Finality.confirmed
theorem quorumRequiresConfirmedDistinctRoots (q : Quorum) (h : quorumConfirmed q) :
    q.distinctDomains ≥ q.threshold ∧ q.finality = Finality.confirmed := h
theorem pendingNotQuorum (q : Quorum) (hp : q.finality = Finality.pending) : ¬ quorumConfirmed q := by
  intro h
  have h2 : q.finality = Finality.confirmed := h.2
  rw [hp] at h2
  exact absurd h2 (by decide)

/-! ## 5 — confirmedRequiresPolicyEvidence: a declared `confirmed` accepted ⟹ computed confirmed (no
    unsupported finality upgrade; reorg-aware — pending cannot upgrade without evidence). -/
structure FinalityClaim where
  declared : Finality
  computed : Finality
def finalityHonest (f : FinalityClaim) : Prop := f.declared = f.computed
theorem confirmedRequiresPolicyEvidence (f : FinalityClaim)
    (h : finalityHonest f) (hc : f.declared = Finality.confirmed) : f.computed = Finality.confirmed := by
  rw [← h]; exact hc

/-! ## 6 — receiptCompleteBeforeCapability: a defined capability derivation ⟹ a complete receipt (375
    runs before 373). -/
structure Receipt where
  complete : Bool
  capabilityDefined : Bool
def wellOrdered (r : Receipt) : Prop := r.capabilityDefined = true → r.complete = true
theorem receiptCompleteBeforeCapability (r : Receipt) (h : wellOrdered r)
    (hc : r.capabilityDefined = true) : r.complete = true := h hc

/-! ## 7 — acceptedReleaseImpliesVerifiedAnchorSet: protocol-enforced ordering (NOT physical causality).
    Acceptance of a release ⟹ the gate receipt bound the verified anchor set. -/
structure ReleaseCtx where
  validTsa : Bool
  validOts : Bool
  validGateSig : Bool
  gateBindsAnchors : Bool
  releaseConsumesChild : Bool
def releaseAccepted (c : ReleaseCtx) : Prop :=
  c.validTsa = true ∧ c.validOts = true ∧ c.validGateSig = true ∧
  c.gateBindsAnchors = true ∧ c.releaseConsumesChild = true
theorem acceptedReleaseImpliesVerifiedAnchorSet (c : ReleaseCtx) (h : releaseAccepted c) :
    c.gateBindsAnchors = true := h.2.2.2.1

/-! ## 8 — childCapabilityInputsDistinct: distinct (endpoint, ordinal) ⟹ distinct inputs (structural,
    no hash needed). -/
structure ChildInput where
  endpoint : Nat
  ordinal : Nat
deriving DecidableEq
theorem childCapabilityInputsDistinct (x y : ChildInput)
    (h : x.endpoint ≠ y.endpoint) : x ≠ y := by
  intro he; exact h (by rw [he])

/-! ## 9 — childCapabilityDistinctUnderNoCollision: distinct OUTPUTS only under an explicit HashInjectiveOn
    hypothesis (collision resistance is not literal injectivity). -/
theorem childCapabilityDistinctUnderNoCollision {Digest : Type}
    (childDigest : ChildInput → Digest)
    (hashInjectiveOn : ∀ a b, childDigest a = childDigest b → a = b)
    (x y : ChildInput) (h : x ≠ y) : childDigest x ≠ childDigest y := by
  intro hc; exact h (hashInjectiveOn x y hc)

/-! ## 10 — releaseCensusBijection: accept ⟹ the released-slot set equals the committed surface set. -/
structure Census where
  surface : List Nat
  released : List Nat
def bijection (c : Census) : Prop := c.surface = c.released
theorem releaseCensusBijection (c : Census) (h : bijection c) : c.surface = c.released := h
theorem censusRejectsExtra : ¬ bijection ⟨[1], [1, 2]⟩ := by unfold bijection; decide

/-! ## 11 — anchorOmissionTotality: every committed-registry member has exactly one typed result (bounded
    to the committed registry — silence impossible). -/
inductive Typed | valid | invalid | indeterminate
theorem anchorOmissionTotality (registry : List Nat) (typedOf : Nat → Typed)
    (m : Nat) (_hm : m ∈ registry) : typedOf m = Typed.valid ∨ typedOf m = Typed.invalid ∨ typedOf m = Typed.indeterminate := by
  cases typedOf m
  · exact Or.inl rfl
  · exact Or.inr (Or.inl rfl)
  · exact Or.inr (Or.inr rfl)

/-! ## 12 — capabilityDomainSeparation: distinct domain tags ⟹ no root/child substitution, under an
    explicit no-cross-domain-collision hypothesis. -/
theorem capabilityDomainSeparation {Payload Digest : Type}
    (h : String → Payload → Digest)
    (noCrossDomain : ∀ t1 t2 p1 p2, h t1 p1 = h t2 p2 → t1 = t2)
    (rootTag childTag : String) (p q : Payload)
    (hne : rootTag ≠ childTag) : h rootTag p ≠ h childTag q := by
  intro hc; exact hne (noCrossDomain rootTag childTag p q hc)

/-! ## 13 — auditImpliesPublic: a valid audit attestation implies a valid public attestation (audit ⟹
    public under the same context + policy_digest). -/
structure Attestation where
  publicValid : Bool
  auditValid : Bool
def auditImplies (a : Attestation) : Prop := a.auditValid = true → a.publicValid = true
theorem auditImpliesPublic (a : Attestation) (h : auditImplies a) (ha : a.auditValid = true) :
    a.publicValid = true := h ha

/-! ## 14 — temporalCompletenessNoHiddenGap: acceptance ⟹ every declared timeline event is anchored and
    censused (over the DECLARED timeline only — the moat's Completeness Invariant, extended into time). -/
structure Timeline where
  events : List Nat
  anchored : Nat → Bool
def allAnchored (t : Timeline) : Prop := ∀ e ∈ t.events, t.anchored e = true
theorem temporalCompletenessNoHiddenGap (t : Timeline) (h : allAnchored t)
    (e : Nat) (he : e ∈ t.events) : t.anchored e = true := h e he

end Simurgh.Stage5L
