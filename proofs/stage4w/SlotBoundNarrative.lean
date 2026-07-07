-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4W symbolic slot-bound-narrative laws (4W spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only — no claim about real hash/curve arithmetic, and the leakage
-- model is the FROZEN LEXICAL model (vsn.leakage.v1), not semantic claimhood.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage4W

/-- A token is either a lexical claim token (as recognised by vsn.leakage.v1) or plain. -/
inductive Tok
  | claim
  | plain
  deriving DecidableEq

/-- A span type. -/
inductive SpanType
  | slotBound
  | judgment
  | unverifiedProse
  deriving DecidableEq

/-- A span over byte indices [start, stop). -/
structure Span where
  start : Nat
  stop : Nat
  type : SpanType

/-- Index `i` is covered by some declared span. -/
def covered (spans : List Span) (i : Nat) : Prop :=
  ∃ s ∈ spans, s.start ≤ i ∧ i < s.stop

/-- The leakage gate PASSES (accepted) iff every claim token lies inside a declared span.
This is exactly the fail-closed rule: an undeclared claim token is a leak. -/
def noLeak (body : List Tok) (spans : List Span) : Prop :=
  ∀ i, i < body.length → body.get? i = some Tok.claim → covered spans i

/-- Theorem 1 — noSmuggledClaim: if the verifier accepts (the gate passes), every
lexical-claim token in the body lies inside a declared span. -/
theorem noSmuggledClaim (body : List Tok) (spans : List Span)
    (h : noLeak body spans) :
    ∀ i, i < body.length → body.get? i = some Tok.claim → covered spans i :=
  h

/-- Adjacent-sorted, non-overlapping: consecutive spans satisfy prev.stop ≤ next.start. -/
def sortedDisjointAdj (spans : List Span) : Prop :=
  List.Pairwise (fun a b => a.stop ≤ b.start) spans

/-- Two spans are disjoint. -/
def disjoint (a b : Span) : Prop := a.stop ≤ b.start ∨ b.stop ≤ a.start

/-- Theorem 2 — spanDisjointness: an accepted (sorted, non-overlapping) span map is
pairwise disjoint. -/
theorem spanDisjointness (spans : List Span) (h : sortedDisjointAdj spans) :
    List.Pairwise disjoint spans :=
  h.imp (fun hab => Or.inl hab)

/-- Evidentiary weight: slot_bound and judgment spans carry (stop - start) bytes;
unverified_prose carries zero (Voice Is Not Evidence). -/
def weight (s : Span) : Nat :=
  match s.type with
  | .slotBound => s.stop - s.start
  | .judgment => s.stop - s.start
  | .unverifiedProse => 0

def isEvidentiary (s : Span) : Bool :=
  match s.type with
  | .unverifiedProse => false
  | _ => true

def totalWeight : List Span → Nat
  | [] => 0
  | s :: rest => weight s + totalWeight rest

/-- Theorem 3 — voiceZeroWeight: projecting the span map onto its evidentiary spans
leaves the total evidentiary weight unchanged; the prose spans contribute nothing. -/
theorem voiceZeroWeight (spans : List Span) :
    totalWeight (spans.filter (fun s => isEvidentiary s)) = totalWeight spans := by
  induction spans with
  | nil => rfl
  | cons s rest ih =>
    simp only [isEvidentiary] at ih ⊢
    rw [List.filter_cons]
    cases hs : s.type <;> simp [hs, weight, totalWeight, ih]

/-- A capsule seals a finite set of evidence digests (modelled as a membership list). -/
structure Capsule where
  sealed : List Nat
  /-- projection: which (regime,section) keys are evidence_backed and their digest. -/
  projected : List (Nat × Nat)  -- (sectionKey, digest)

/-- A slot span cites (sectionKey, digest). It is well-formed iff the digest is sealed
AND the projection binds that exact (sectionKey, digest) pair (lens, not blender). -/
def slotAccepted (cap : Capsule) (sectionKey digest : Nat) : Prop :=
  digest ∈ cap.sealed ∧ (sectionKey, digest) ∈ cap.projected

/-- Theorem 4 — lensNotBlender: an accepted slot span references only sealed evidence,
and only through a matching projection (no right-evidence/wrong-section laundering). -/
theorem lensNotBlender (cap : Capsule) (sectionKey digest : Nat)
    (h : slotAccepted cap sectionKey digest) :
    digest ∈ cap.sealed ∧ (sectionKey, digest) ∈ cap.projected :=
  h

-- The 4V frozen status table (spec §3), reproduced here to prove the adapter is faithful.
inductive Cls
  | evidenceBacked | notDerivable | requiresHumanInput
  deriving DecidableEq

inductive Verb
  | agree | disputeByRecomputation | disputeAsJudgment
  deriving DecidableEq

inductive Status
  | agreed | conflictProven | absenceRebutted | disputeRecorded | disputeFailed
  deriving DecidableEq

structure Contest where
  cls : Cls
  verb : Verb
  recomputes : Bool
  matchesOperator : Bool

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

/-- The 4W adapter maps a slot-span contest to a 4V contest and delegates. No cloned court:
the adapter is exactly the identity on the contest, then `statusOf`. -/
def adapterStatus (c : Contest) : Status := statusOf c

/-- Theorem 5 — contestAdapterFaithful: the 4W span-contest adapter derives exactly the
status the 4V frozen table gives for the same inputs. -/
theorem contestAdapterFaithful (c : Contest) : adapterStatus c = statusOf c := rfl

end Simurgh.Stage4W
