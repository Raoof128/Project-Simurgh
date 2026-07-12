-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5J symbolic rating-contest laws (VRC spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. 11 theorems, zero `sorry`:
--  T1 obligationSound, T2 contestComplete, T3 overrideQuantified, T4 firstFailure{Unique,Sound},
--  T5 reviewerStatementBinding, T6 chainUniqueHead, T7 nonComparableExcluded,
--  T8 supersessionAuthority, T9 tierMonotone, T10 noSilentOverridePath, T11 noCorrectnessBit.
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5J

/-! ## T4 — first-failure over a frozen (code, predicate) list, per tier -/

def firstFailure : List (Nat × Bool) → Option Nat
  | [] => none
  | (c, p) :: rest =>
    match p with
    | true => firstFailure rest
    | false => some c

/-- T4 (uniqueness) — `firstFailure` is a function, hence deterministic on a fixed list. -/
theorem firstFailureUnique (l : List (Nat × Bool)) (a b : Nat)
    (ha : firstFailure l = some a) (hb : firstFailure l = some b) : a = b := by
  rw [ha] at hb; exact (Option.some.injEq a b).mp hb

/-- T4 (soundness) — if `firstFailure` reports code `c`, every earlier predicate held. -/
theorem firstFailureSound :
    ∀ (l : List (Nat × Bool)) (c : Nat), firstFailure l = some c →
      ∃ pre suf, l = pre ++ (c, false) :: suf ∧ ∀ q ∈ pre, q.2 = true := by
  intro l
  induction l with
  | nil => intro c h; simp [firstFailure] at h
  | cons hd tl ih =>
    intro c h
    obtain ⟨hc, hp⟩ := hd
    cases hp with
    | true =>
      simp only [firstFailure] at h
      obtain ⟨pre, suf, hl, hpre⟩ := ih c h
      refine ⟨(hc, true) :: pre, suf, ?_, ?_⟩
      · simp [hl]
      · intro q hq
        cases hq with
        | head => rfl
        | tail _ hmem => exact hpre q hmem
    | false =>
      simp only [firstFailure, Option.some.injEq] at h
      subst h
      exact ⟨[], tl, rfl, by intro q hq; cases hq⟩

/-! ## T1 — obligation-equality soundness (both sides) -/

def obligOk (activeR requiredR activeP requiredP : List Nat) : Bool :=
  decide (activeR = requiredR) && decide (activeP = requiredP)

/-- T1 — `OK` implies the active reviewer pairs equal the required set AND the active producer
    sections equal the committed universe. -/
theorem obligationSound (aR rR aP rP : List Nat) (h : obligOk aR rR aP rP = true) :
    aR = rR ∧ aP = rP := by
  unfold obligOk at h
  rw [Bool.and_eq_true] at h
  exact ⟨of_decide_eq_true h.1, of_decide_eq_true h.2⟩

/-! ## T2 — contest-event completeness (stored = recomputed over full history) -/

def contestOk (stored recomputed : List Nat) : Bool := decide (stored = recomputed)

/-- T2 — `OK` implies the stored contest events equal those recomputed from both rating histories. -/
theorem contestComplete (s r : List Nat) (h : contestOk s r = true) : s = r :=
  of_decide_eq_true h

/-! ## T3 — no-silent-favourable-override, quantified over every historical event -/

def allAnswered (events : List Nat) (answered : Nat → Bool) : Bool := events.all answered

/-- T3 — `OK` implies every recomputed historical contest event carries a valid bound response. -/
theorem overrideQuantified (events : List Nat) (answered : Nat → Bool)
    (h : allAnswered events answered = true) : ∀ e ∈ events, answered e = true := by
  intro e he
  unfold allAnswered at h
  exact (List.all_eq_true.mp h) e he

/-! ## T5 — reviewer-statement binding: concurrence XOR rebuttal, each signed -/

def stmtOk (hasConc hasReb concSig rebSig : Bool) : Bool :=
  (!(hasConc && hasReb)) && (!hasConc || concSig) && (!hasReb || rebSig)

/-- T5 — the two terminal states are mutually exclusive, and each present statement is signed. -/
theorem reviewerStatementBinding (hc hr cs rs : Bool) (h : stmtOk hc hr cs rs = true) :
    (hc && hr) = false ∧ (hc = true → cs = true) ∧ (hr = true → rs = true) := by
  unfold stmtOk at h
  cases hc <;> cases hr <;> cases cs <;> cases rs <;> simp_all

/-! ## T6 — rating-chain topology: a valid chain has exactly one active head -/

def topoOk (headCount : Nat) : Bool := decide (headCount = 1)

/-- T6 — a topologically valid rating chain has a unique active head. -/
theorem chainUniqueHead (n : Nat) (h : topoOk n = true) : n = 1 :=
  of_decide_eq_true h

/-! ## T7 — non-comparable exclusion from the comparable-pair denominator -/

def inDenominator (comparable : Bool) : Bool := comparable

/-- T7 — a non-comparable pair is never counted in the comparable-pair denominator. -/
theorem nonComparableExcluded (c : Bool) (h : c = false) : inDenominator c = false := by
  unfold inDenominator; exact h

/-! ## T8 — supersession authority over ALL historical entries (fossil attack) -/

def allSigned (entries : List Nat) (signed : Nat → Bool) : Bool := entries.all signed

/-- T8 — `OK` implies every historical entry (head or superseded) is signed by its bound role. -/
theorem supersessionAuthority (entries : List Nat) (signed : Nat → Bool)
    (h : allSigned entries signed = true) : ∀ e ∈ entries, signed e = true := by
  intro e he
  unfold allSigned at h
  exact (List.all_eq_true.mp h) e he

/-! ## T9 — tier monotonicity: audit accepts ⟹ public accepts -/

def publicOk (pub : Bool) : Bool := pub
def auditOk (pub proj : Bool) : Bool := pub && proj

/-- T9 — the audit tier is the public tier plus the projection recompute, so audit ⟹ public. -/
theorem tierMonotone (pub proj : Bool) (h : auditOk pub proj = true) : publicOk pub = true := by
  unfold auditOk at h; unfold publicOk
  exact (Bool.and_eq_true pub proj).mp h |>.1

/-! ## T10 — the Override Trilemma: no silent favourable-override path -/

def overrideOk (favourable answered : Bool) : Bool := (!favourable) || answered

/-- T10 — for a comparable pair, `OK` and a favourable producer override force a recorded, bound,
    answered contest event. There is no fourth (silent) branch. -/
theorem noSilentOverridePath (favourable answered : Bool) (h : overrideOk favourable answered = true) :
    favourable = true → answered = true := by
  intro hf
  unfold overrideOk at h
  rw [hf] at h
  simpa using h

/-! ## T11 — no correctness bit: the verdict cannot assert who was right -/

-- The verdict is a pure function of obligation-completeness, contest-preservation, and signature
-- validity. It takes a correctness argument only to prove it is IGNORED.
def verdict (oblig contest sigs _correctness : Bool) : Bool := oblig && contest && sigs

/-- T11 — the verdict is independent of any correctness predicate: two runs that disagree only on the
    correctness bit produce the same verdict. The state space has no correct/incorrect value. -/
theorem noCorrectnessBit (o c s a b : Bool) : verdict o c s a = verdict o c s b := by
  rfl

end Simurgh.Stage5J
