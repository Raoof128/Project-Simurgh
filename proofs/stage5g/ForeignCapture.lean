-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5G symbolic producer/verifier separation laws (5G spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic model predicates only, NOT real crypto. Theorem NAMES are deliberately bounded to what
-- the inputs support (e.g. externalRootRequiredForRung2 is a MODEL predicate that rung-2 acceptance needs
-- an externally-supplied trust value, NOT a proof of Fulcio/Rekor security). 10 theorems + 1 lemma. The
-- Anchoring Trilemma is a signed DESIGN OBSERVATION (spec §6), deliberately NOT a theorem here.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5G

/-- Rung ordinals: distinct_key_only=0, challenge_bound=1, externally_anchored=2. -/
def needs (rung pid : Nat) : Prop := pid ≤ rung

/-- Theorem 1 — rungMonotonicity: the required-predicate sets are ⊇-nested up the ladder. -/
theorem rungMonotonicity (pid : Nat) :
    (needs 0 pid → needs 1 pid) ∧ (needs 1 pid → needs 2 pid) := by
  constructor <;> intro h <;> · simp only [needs] at *; omega

/-- The proven rung computed from already-verified predicate booleans (consumes, re-checks nothing). -/
def proven (cb av sd : Bool) : Nat := if cb then (if av && sd then 2 else 1) else 0

/-- Verifier-computed overclaim code (Law 3). -/
def overclaimCode (claimed proven : Nat) : Nat := if claimed > proven then 296 else 0

/-- Theorem 2 — overclaimSound: claimed > proven ⇒ raw 296. -/
theorem overclaimSound (claimed p : Nat) (h : claimed > p) : overclaimCode claimed p = 296 := by
  simp only [overclaimCode]; exact if_pos h

/-- The rung-0 floor: acceptance requires a distinct producer key (raw 289). -/
def accepted (kd : Bool) : Bool := kd

/-- Theorem 3 — rung0RequiresDistinctKey. -/
theorem rung0RequiresDistinctKey (kd : Bool) (h : accepted kd = true) : kd = true := by
  simpa [accepted] using h

/-- An equality check returns pass (0) iff the two digests bind. -/
def checkEq (a b failCode : Nat) : Nat := if a == b then 0 else failCode

/-- Theorem 4 — challengeBindingSound: a bound challenge digest matching the receipt passes 290/291. -/
theorem challengeBindingSound (bound receipt : Nat) (h : bound = receipt) :
    checkEq bound receipt 291 = 0 := by simp [checkEq, h]

/-- Theorem 5 — captureDigestBindsContext: the accepted capture digest equals the recomputed hash (288). -/
theorem captureDigestBindsContext (cd hashOfCapture : Nat) (h : cd = hashOfCapture) :
    checkEq cd hashOfCapture 288 = 0 := by simp [checkEq, h]

/-- A distinctness check returns pass (0) iff the subjects differ (292). -/
def checkDistinct (a b : Nat) : Nat := if a == b then 292 else 0

/-- Theorem 6 — subjectAnchorBindingSound: an accepted rung-2 binds a subject distinct from the verifier. -/
theorem subjectAnchorBindingSound (ps vs : Nat) (h : ps ≠ vs) : checkDistinct ps vs = 0 := by
  simp [checkDistinct]; intro he; exact absurd he h

/-- Theorem 7 — externalRootRequiredForRung2: proven rung 2 requires anchor + subject predicates. -/
theorem externalRootRequiredForRung2 (cb av sd : Bool) (h : proven cb av sd = 2) :
    av = true ∧ sd = true := by
  cases cb <;> cases av <;> cases sd <;> simp_all [proven]

/-- Acceptance of any VFC attestation requires the externally-supplied verifier pin (raw 284). -/
def acceptedWithPin (pinPresent : Bool) : Bool := pinPresent

/-- Theorem 8 — attestationTrustRequiresExternalPin. -/
theorem attestationTrustRequiresExternalPin (pinPresent : Bool)
    (h : acceptedWithPin pinPresent = true) : pinPresent = true := by
  simpa [acceptedWithPin] using h

/-- Theorem 9 — producerTranscriptBindsIdentity: a valid transcript binds the producer identity digest
    (286); the check passes iff the bound digest equals the recomputed identity digest. -/
theorem producerTranscriptBindsIdentity (bound recomputed : Nat) (h : bound = recomputed) :
    checkEq bound recomputed 286 = 0 := by simp [checkEq, h]

/-- Strict min-rung policy (298). -/
def policyCode (p minRung : Nat) : Nat := if p ≥ minRung then 0 else 298

/-- Theorem 10 — strictPolicyMayRejectValidLowerRung: a truthful rung-0 record is rejected by a strict
    rung-1 policy with 298 (integrity untouched). -/
theorem strictPolicyMayRejectValidLowerRung : policyCode 0 1 = 298 := by decide

/-- Lemma — verifierCodomainHasNoIndependenceBoolean: the verifier's rung codomain is {0,1,2}; it can
    never emit a boolean "independent" sentinel (99). -/
theorem verifierCodomainHasNoIndependenceBoolean (cb av sd : Bool) : proven cb av sd ≠ 99 := by
  cases cb <;> cases av <;> cases sd <;> decide

end Simurgh.Stage5G
