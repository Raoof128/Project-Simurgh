-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4O Monotone Consent Law (spec §12). Self-contained: core Lean 4 only, no mathlib.
-- Model: a tool surface is a list of typed entries; narrowing (⊑) is a per-tool partial
-- order (same identity/schema, non-escalating authority, non-expanding sinks). An epoch
-- chain is a list of accepted steps, each carrying its consent binding.
--
-- THE THEOREM (three legs):
--   1. no_silent_tool_swap     — acceptance implies the recorded dispatch surface matches
--                                the committed entry (identity + schema).
--   2. no_drift_laundering     — ⊑ is transitive, so an all-narrowing chain composes to a
--                                direct narrowing; a direct broadening cannot hide inside
--                                claimed narrowings.
--   3. delta_bound_broadening  — in an accepted chain, any non-narrowing step carries
--                                delta-bound consent.
--   monotone_consent           — the umbrella.
-- Limitation (signed): proof_is_of_model_not_implementation; statements are over the
-- recorded dispatch surface, not remote execution (4J discipline).
-- Motto: AnthropicSafe First, then ReviewerSafe.

namespace Simurgh.Stage4O

inductive AuthorityClass
  | read_only
  | write
  | egress
  | destructive
  deriving DecidableEq, Repr

def AuthorityClass.rank : AuthorityClass → Nat
  | .read_only => 0
  | .write => 1
  | .egress => 2
  | .destructive => 3

structure ToolEntry where
  name : Nat
  schemaDigest : Nat
  auth : AuthorityClass
  sinks : List Nat
  deriving DecidableEq, Repr

abbrev Surface := List ToolEntry

/-- One tool narrows another: same identity and schema, non-escalating authority, and no
    new sinks. -/
def entryNarrows (n p : ToolEntry) : Prop :=
  n.name = p.name ∧ n.schemaDigest = p.schemaDigest ∧
    n.auth.rank ≤ p.auth.rank ∧ ∀ s ∈ n.sinks, s ∈ p.sinks

/-- next ⊑ prev : every tool in `next` narrows some tool of `prev`. -/
def Narrows (next prev : Surface) : Prop :=
  ∀ n ∈ next, ∃ p ∈ prev, entryNarrows n p

theorem entryNarrows_refl (e : ToolEntry) : entryNarrows e e :=
  ⟨rfl, rfl, Nat.le_refl _, fun _ hs => hs⟩

theorem entryNarrows_trans {a b c : ToolEntry}
    (hab : entryNarrows a b) (hbc : entryNarrows b c) : entryNarrows a c := by
  obtain ⟨hn₁, hs₁, ha₁, hk₁⟩ := hab
  obtain ⟨hn₂, hs₂, ha₂, hk₂⟩ := hbc
  exact ⟨hn₁.trans hn₂, hs₁.trans hs₂, Nat.le_trans ha₁ ha₂, fun s hs => hk₂ s (hk₁ s hs)⟩

/-- ⊑ is reflexive. -/
theorem narrows_refl (s : Surface) : Narrows s s :=
  fun n hn => ⟨n, hn, entryNarrows_refl n⟩

/-- ⊑ is transitive: this is the engine of NoDriftLaundering — an all-narrowing chain
    composes to a direct narrowing. -/
theorem narrows_trans {a b c : Surface} (hab : Narrows a b) (hbc : Narrows b c) :
    Narrows a c := by
  intro n hn
  obtain ⟨p, hp, hnp⟩ := hab n hn
  obtain ⟨q, hq, hpq⟩ := hbc p hp
  exact ⟨q, hq, entryNarrows_trans hnp hpq⟩

inductive Consent
  | state
  | delta
  deriving DecidableEq, Repr

structure Step where
  fromS : Surface
  toS : Surface
  consent : Consent

/-- The verifier's acceptance predicate for one step (spec §6a consent rule): a step is
    accepted iff it narrows, or it carries delta-bound consent. -/
def stepAccepted (s : Step) : Prop :=
  Narrows s.toS s.fromS ∨ s.consent = Consent.delta

/-- A chain is accepted iff every step is accepted. -/
def chainAccepted : List Step → Prop
  | [] => True
  | s :: rest => stepAccepted s ∧ chainAccepted rest

/-- A chain is linked iff each step's target is the next step's source. -/
def linked : List Step → Prop
  | [] => True
  | [_] => True
  | a :: b :: rest => a.toS = b.fromS ∧ linked (b :: rest)

/-- Leg 3 — DeltaBoundBroadening: in an accepted chain, any step that is NOT a narrowing
    carries delta-bound consent. The blind approver is forced to ledger the broadening. -/
theorem delta_bound_broadening (chain : List Step) (h : chainAccepted chain) :
    ∀ s ∈ chain, ¬ Narrows s.toS s.fromS → s.consent = Consent.delta := by
  induction chain with
  | nil => intro s hs; cases hs
  | cons a rest ih =>
    intro s hs hnot
    rw [List.mem_cons] at hs
    rcases hs with rfl | hmem
    · rcases h.1 with hn | hd
      · exact absurd hn hnot
      · exact hd
    · exact ih h.2 s hmem hnot

/-- Leg 2 — NoDriftLaundering: if every step of a linked chain narrows, the endpoints
    narrow directly. A direct broadening therefore cannot be composed from claimed
    narrowings. Proved by induction over the linked chain. -/
theorem no_drift_laundering :
    ∀ (chain : List Step), linked chain →
      (∀ s ∈ chain, Narrows s.toS s.fromS) →
      ∀ hne : chain ≠ [],
        Narrows (chain.getLast hne).toS (chain.head hne).fromS := by
  intro chain
  induction chain with
  | nil => intro _ _ hne; exact absurd rfl hne
  | cons a rest ih =>
    intro hlink hall _
    cases rest with
    | nil =>
      -- single step: endpoints are exactly this step, which narrows.
      simpa using hall a (List.mem_cons_self a [])
    | cons b tl =>
      -- a.toS = b.fromS (linked); compose a's narrowing with the tail's direct narrowing.
      have hAB : a.toS = b.fromS := hlink.1
      have htailLinked : linked (b :: tl) := hlink.2
      have htailAll : ∀ s ∈ (b :: tl), Narrows s.toS s.fromS :=
        fun s hs => hall s (List.mem_cons_of_mem a hs)
      have hStep : Narrows a.toS a.fromS := hall a (List.mem_cons_self a _)
      have hTail := ih htailLinked htailAll (by simp)
      -- getLast/head bookkeeping for the cons.
      have hlast : ((a :: b :: tl).getLast (by simp)) = ((b :: tl).getLast (by simp)) := by
        simp [List.getLast_cons]
      have hhead : ((a :: b :: tl).head (by simp)) = a := rfl
      rw [hlast, hhead]
      -- hTail : Narrows (getLast).toS (b.fromS); hStep : Narrows a.toS a.fromS; a.toS = b.fromS.
      have : Narrows ((b :: tl).getLast (by simp)).toS a.toS := by rw [hAB]; exact hTail
      exact narrows_trans this hStep

structure Receipt where
  name : Nat
  schemaDigest : Nat
  auth : AuthorityClass
  sinksUsed : List Nat

/-- The gate accepts a receipt against a surface iff some committed entry matches its
    identity and schema and does not escalate authority or expand sinks. -/
def gateAccepts (m : Surface) (r : Receipt) : Prop :=
  ∃ e ∈ m, e.name = r.name ∧ e.schemaDigest = r.schemaDigest ∧
    r.auth.rank ≤ e.auth.rank ∧ ∀ s ∈ r.sinksUsed, s ∈ e.sinks

/-- Leg 1 — NoSilentToolSwap: acceptance implies the recorded dispatch surface (identity +
    schema) matches a committed manifest entry. No silent substitution. -/
theorem no_silent_tool_swap (m : Surface) (r : Receipt) (h : gateAccepts m r) :
    ∃ e ∈ m, e.name = r.name ∧ e.schemaDigest = r.schemaDigest := by
  obtain ⟨e, he, hn, hs, _, _⟩ := h
  exact ⟨e, he, hn, hs⟩

/-- The Monotone Consent Law (umbrella): an accepted chain ledgers every broadening as
    delta-bound consent — a surface may narrow silently but may broaden only under
    delta-bound consent. -/
theorem monotone_consent (chain : List Step) (h : chainAccepted chain) :
    ∀ s ∈ chain, ¬ Narrows s.toS s.fromS → s.consent = Consent.delta :=
  delta_bound_broadening chain h

end Simurgh.Stage4O
