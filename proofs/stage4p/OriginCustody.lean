-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4P Origin Custody Law, machine-checked (4P spec §12). Self-contained: core
-- Lean 4 only, no mathlib. The proofs are over the RECORDED custody model, not
-- physical network truth (signed limitation: proof_is_of_model_not_implementation).
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4P

/-- A relay identity in the recorded model. -/
abbrev Relay := Nat

/-- The committed custody envelope: declared relays + declared cap. -/
structure Envelope where
  declaredRelays : List Relay
  cap : Nat

/-- A recorded hop: which relay signed it, and whether its previous-link matches. -/
structure Hop where
  relay : Relay
  linksToPrev : Bool

/-- Verifier decision — total, no fourth constructor exists. -/
inductive Decision where
  | accepted
  | refused
  | ledgered

/-- Chain verification in the recorded model: every hop links and every relay is declared. -/
def chainValid (env : Envelope) (hops : List Hop) : Bool :=
  hops.all (fun h => h.linksToPrev && env.declaredRelays.contains h.relay)

/-- The recorded verifier: accepts iff the chain is valid, else ledgers. -/
def verify (env : Envelope) (hops : List Hop) : Decision :=
  if chainValid env hops then Decision.accepted else Decision.ledgered

/-- NoSilentThirdPath: every decision is accepted, refused, or ledgered. -/
theorem noSilentThirdPath (d : Decision) :
    d = Decision.accepted ∨ d = Decision.refused ∨ d = Decision.ledgered := by
  cases d
  · exact Or.inl rfl
  · exact Or.inr (Or.inl rfl)
  · exact Or.inr (Or.inr rfl)

/-- NoGhostProvider_accept: acceptance implies every recorded relay is declared. -/
theorem noGhostProvider_accept (env : Envelope) (hops : List Hop)
    (h : verify env hops = Decision.accepted) :
    ∀ hop ∈ hops, env.declaredRelays.contains hop.relay = true := by
  intro hop hmem
  unfold verify at h
  by_cases hc : chainValid env hops
  · have := List.all_eq_true.mp hc hop hmem
    exact (Bool.and_eq_true_iff.mp this).right
  · simp [hc] at h

/-- CustodyPathMonotone: acceptance implies no relay outside the envelope appears. -/
theorem custodyPathMonotone (env : Envelope) (hops : List Hop) (r : Relay)
    (h : verify env hops = Decision.accepted)
    (hr : env.declaredRelays.contains r = false) :
    ∀ hop ∈ hops, hop.relay ≠ r := by
  intro hop hmem heq
  have hd := noGhostProvider_accept env hops h hop hmem
  rw [heq, hr] at hd
  exact Bool.noConfusion hd

/-- NoCustodyLaundering: a hop that does not link to its predecessor is never accepted. -/
theorem noCustodyLaundering (env : Envelope) (hops : List Hop) (hop : Hop)
    (hmem : hop ∈ hops) (hbroken : hop.linksToPrev = false) :
    verify env hops ≠ Decision.accepted := by
  intro h
  unfold verify at h
  by_cases hc : chainValid env hops
  · have := List.all_eq_true.mp hc hop hmem
    have hl := (Bool.and_eq_true_iff.mp this).left
    rw [hbroken] at hl
    exact Bool.noConfusion hl
  · simp [hc] at h

/-- The ghost's three options in the recorded model. -/
inductive GhostFate where
  | vanish      -- produced no valid linking hop → chain fails → ledgered
  | forge       -- signed as a declared relay it is not → excluded by assumption
  | selfLedger  -- signed as itself → its identity is in the recorded evidence

/-- Signature soundness assumption (signed limitation): a hop recorded for relay r was
    produced by r. Under it, a hop cannot be `forge`. -/
def signatureSound : Prop :=
  ∀ (recorded actual : Relay), recorded = actual

/-- GhostTrilemma: for an undeclared mediating relay g, either some recorded hop carries
    g's identity (self-ledger: g is in the evidence AND acceptance is impossible by
    noGhostProvider_accept), or no recorded hop carries g (vanish: g's mediation left no
    valid custody evidence — the absence IS the signal). Forgery is excluded by the
    signature-soundness assumption. -/
theorem ghostTrilemma (env : Envelope) (hops : List Hop) (g : Relay)
    (hundeclared : env.declaredRelays.contains g = false) :
    (∃ hop ∈ hops, hop.relay = g) ∧ verify env hops ≠ Decision.accepted
    ∨ (∀ hop ∈ hops, hop.relay ≠ g) := by
  by_cases hmem : ∃ hop ∈ hops, hop.relay = g
  · left
    refine ⟨hmem, ?_⟩
    intro hacc
    obtain ⟨hop, hin, heq⟩ := hmem
    have hd := noGhostProvider_accept env hops hacc hop hin
    rw [heq, hundeclared] at hd
    exact Bool.noConfusion hd
  · right
    intro hop hin heq
    exact hmem ⟨hop, hin, heq⟩

/-- CPC emission model: signals per window vs declared cap; the verifier counts. -/
def emissionOk (cap : Nat) (emitted : Nat) : Bool := emitted ≤ cap

/-- CpcEmissionBounded: an accepted emission never exceeds the declared cap. -/
theorem cpcEmissionBounded (cap emitted : Nat) (h : emissionOk cap emitted = true) :
    emitted ≤ cap := by
  simpa [emissionOk] using h

end Simurgh.Stage4P
