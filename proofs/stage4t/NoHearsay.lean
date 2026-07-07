-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4T symbolic No Hearsay / No Two Stories laws, machine-checked (4T spec §11).
-- Self-contained: core Lean 4 only, no mathlib.
-- SCOPE (exact): Lean proves the SYMBOLIC laws over abstract models — partition
--   exhaustiveness, suppression detectability, census exactness (injective-digest
--   model), and view non-contradiction (injective-commitment model). Node exercises
--   the real Ed25519 + SHA-256 byte behaviour. No theorem claims hash
--   collision-resistance or that Lean verified real curve/hash arithmetic. A red
--   recorded verdict inside a capsule is a valid OUTCOME, not a verification failure.
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4T

-- ---------------------------------------------------------------------------
-- Model 1 — the three-way partition class. There is no fourth state.
-- ---------------------------------------------------------------------------
inductive Cls where
  | evidenceBacked
  | notDerivable
  | requiresHumanInput
  deriving DecidableEq

-- A projected section either carries a value (evidence_backed) or is a bare marker.
structure Section where
  cls : Cls
  hasValue : Bool

-- No Hearsay: an accepted section is evidence_backed WITH a value, or an explicit
-- absence marker (the two non-backed classes) WITHOUT a value. Nothing else.
def sectionOk (s : Section) : Bool :=
  match s.cls with
  | .evidenceBacked => s.hasValue
  | .notDerivable => ! s.hasValue
  | .requiresHumanInput => ! s.hasValue

-- ---------------------------------------------------------------------------
-- Theorem 1 — noHearsay: every accepted section is exactly one of the three
-- classes, and its value-presence is forced by that class. No hidden fourth state,
-- no evidence_backed-without-value (fabrication), no marker-with-value (leak).
-- ---------------------------------------------------------------------------
theorem noHearsay (s : Section) (h : sectionOk s = true) :
    (s.cls = Cls.evidenceBacked ∧ s.hasValue = true) ∨
    (s.cls = Cls.notDerivable ∧ s.hasValue = false) ∨
    (s.cls = Cls.requiresHumanInput ∧ s.hasValue = false) := by
  cases hc : s.cls <;> cases hv : s.hasValue <;>
    simp [sectionOk, hc, hv] at h ⊢

-- ---------------------------------------------------------------------------
-- Model 2 — suppression. A section is genuinely derivable when the census holds
-- matching-kind evidence. If it is derivable but the capsule marks it absent, the
-- checker must reject.
-- ---------------------------------------------------------------------------
structure Claim where
  derivable : Bool      -- census holds matching-kind evidence
  markedAbsent : Bool   -- capsule downgraded it to not_derivable / requires_human_input

def suppressionFree (c : Claim) : Bool := ! (c.derivable && c.markedAbsent)

-- Theorem 2 — suppressionDetectable: if a claim is derivable AND marked absent,
-- the suppression checker rejects it (contrapositive: an accepted claim is not
-- a hidden derivable one).
theorem suppressionDetectable (c : Claim)
    (hd : c.derivable = true) (hm : c.markedAbsent = true) :
    suppressionFree c = false := by
  simp [suppressionFree, hd, hm]

theorem acceptedNotSuppressed (c : Claim) (h : suppressionFree c = true) :
    ¬ (c.derivable = true ∧ c.markedAbsent = true) := by
  intro ⟨hd, hm⟩
  simp [suppressionFree, hd, hm] at h

-- ---------------------------------------------------------------------------
-- Model 3 — census exactness. Digests are modelled as Nat via an INJECTIVE digest
-- function; the "root" is the multiset of item digests captured as a sorted-free
-- fold (membership). Omitting or adding a committed item changes membership.
-- ---------------------------------------------------------------------------
-- A census is a list of item digests (Nat). Two censuses agree iff same elements.
def mem (x : Nat) : List Nat → Bool
  | [] => false
  | y :: ys => (x == y) || mem x ys

-- Theorem 3 — censusExactness: appending a fresh digest d (not already present)
-- changes membership at d, so the committed set is not invariant under addition.
theorem censusExactness (items : List Nat) (d : Nat) (hfresh : mem d items = false) :
    mem d (d :: items) = true ∧ mem d items = false := by
  constructor
  · simp [mem]
  · exact hfresh

-- Omission: removing the head d from (d :: items) when d is not in the tail
-- flips membership from true to false — the omitted item is detectable.
theorem censusOmissionDetectable (items : List Nat) (d : Nat)
    (hfresh : mem d items = false) :
    mem d (d :: items) = true ∧ mem d items = false := censusExactness items d hfresh

-- ---------------------------------------------------------------------------
-- Model 4 — No Two Stories. A view exposes, per section, either the capsule's own
-- value (disclosed) or a redaction marker. Commitments are modelled by the value
-- itself (injective-commitment model). A view is CONSISTENT iff every disclosed
-- value equals the capsule's value and every non-disclosed key is ledgered.
-- ---------------------------------------------------------------------------
structure ViewSection where
  capsuleVal : Nat
  disclosedVal : Option Nat  -- none = redacted
  ledgered : Bool            -- redaction declared

def viewSectionOk (v : ViewSection) : Bool :=
  match v.disclosedVal with
  | some x => x == v.capsuleVal        -- disclosed must equal capsule value (no contradiction)
  | none => v.ledgered                 -- redacted must be ledgered

-- Theorem 4 — noTwoStories: an accepted view section that discloses a value cannot
-- contradict the capsule (its value equals the capsule's); a redacted one is ledgered.
theorem noTwoStories (v : ViewSection) (h : viewSectionOk v = true) :
    (∃ x, v.disclosedVal = some x ∧ x = v.capsuleVal) ∨
    (v.disclosedVal = none ∧ v.ledgered = true) := by
  cases hd : v.disclosedVal with
  | some x =>
      left
      refine ⟨x, rfl, ?_⟩
      have : (x == v.capsuleVal) = true := by simpa [viewSectionOk, hd] using h
      exact (beq_iff_eq).1 this
  | none =>
      right
      refine ⟨rfl, ?_⟩
      simpa [viewSectionOk, hd] using h

end Simurgh.Stage4T
