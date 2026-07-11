-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5I symbolic panel-coverage laws (VPC spec §3.4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only, not real crypto. Theorems: rungMonotone (L1), firstFailureUnique (T7),
-- firstFailureSound (T7), gapEmptyIffCovered (T6), noSilentFilter (T3), noForbiddenAdequacy (T11),
-- noPhantomUnion (T2), coverageSoundness (T1), producerBindingStable (T5).
-- Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage5I

/-! ## L1 — the separation-rung lattice is a strict ordinal order -/

inductive Rung where
  | belowFloor
  | distinctKeyOnly
  | challengeBound
  | externallyAnchored
deriving DecidableEq

def rungIndex : Rung → Nat
  | .belowFloor => 0
  | .distinctKeyOnly => 1
  | .challengeBound => 2
  | .externallyAnchored => 3

/-- L1 — rung index is injective (distinct rungs never collide): the lattice is strictly ordered. -/
theorem rungMonotone : ∀ a b : Rung, rungIndex a = rungIndex b → a = b := by
  intro a b h; cases a <;> cases b <;> simp_all [rungIndex]

/-! ## T7 — first-failure over a frozen predicate list is unique and sound -/

/-- First code whose predicate is `false`, else `none`. `checks` is a frozen (code, pred) list. -/
def firstFailure : List (Nat × Bool) → Option Nat
  | [] => none
  | (c, p) :: rest =>
    match p with
    | true => firstFailure rest
    | false => some c

/-- T7 (uniqueness) — `firstFailure` is a function, hence deterministic on a fixed list. -/
theorem firstFailureUnique (l : List (Nat × Bool)) (a b : Nat)
    (ha : firstFailure l = some a) (hb : firstFailure l = some b) : a = b := by
  rw [ha] at hb; exact (Option.some.injEq a b).mp hb

/-- T7 (soundness) — if `firstFailure` reports code `c`, every earlier predicate held. -/
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
        | tail _ hq' => exact hpre q hq'
    | false =>
      simp only [firstFailure] at h
      have hcc : hc = c := (Option.some.injEq hc c).mp h
      subst hcc
      exact ⟨[], tl, rfl, by intro q hq; cases hq⟩

/-! ## T6 — coverage equality decomposition -/

/-- The uncovered gap of `S` under a membership predicate `covered`. -/
def gap (covered : Nat → Bool) (S : List Nat) : List Nat := S.filter (fun s => !covered s)

/-- T6 — the gap is empty iff every section is covered. -/
theorem gapEmptyIffCovered (covered : Nat → Bool) (S : List Nat) :
    gap covered S = [] ↔ ∀ s ∈ S, covered s = true := by
  simp only [gap, List.filter_eq_nil_iff, Bool.not_eq_true']
  constructor
  · intro h s hs; have := h s hs; simpa using this
  · intro h s hs; simp [h s hs]

/-! ## T3 — no silent filtering: when every candidate passes, eligible = candidate -/

/-- T3 — if predicate `p` holds on every candidate, filtering keeps them all (R_eligible = R_candidate). -/
theorem noSilentFilter {α} (p : α → Bool) :
    ∀ (cand : List α), (∀ x ∈ cand, p x = true) → cand.filter p = cand := by
  intro cand h
  induction cand with
  | nil => rfl
  | cons a as ih =>
    simp only [List.filter_cons, h a (List.mem_cons_self a as), if_pos]
    rw [ih (fun x hx => h x (List.mem_cons_of_mem a hx))]

/-! ## T11 — the adequacy gate rejects exactly the frozen vocabulary (bounded, not semantic) -/

/-- Scan an annotation key list for any forbidden key. -/
def hasForbidden (forbidden : List Nat) (keys : List Nat) : Bool :=
  keys.any (fun k => forbidden.contains k)

/-- T11 — verify-clean (`hasForbidden = false`) iff no annotation key is in the frozen vocabulary.
    HONEST BOUND: a bounded vocabulary over a bounded surface, NOT a semantic-absence proof. -/
theorem noForbiddenAdequacy (forbidden keys : List Nat) :
    hasForbidden forbidden keys = false ↔ ∀ k ∈ keys, forbidden.contains k = false := by
  simp [hasForbidden, List.any_eq_false]

/-! ## T2 — no phantom review: grant-bounded receipts stay within their grant -/

/-- T2 — if every receipt is a subset of its grant, membership in a receipt implies membership in the
    corresponding grant (No Phantom Review, per reviewer). -/
theorem noPhantomUnion {α} (C G : α → List Nat)
    (bound : ∀ r x, x ∈ C r → x ∈ G r) : ∀ r x, x ∈ C r → x ∈ G r := bound

/-! ## T1 — coverage soundness (accepted ⇒ equality holds) -/

/-- T1 — an accepted verdict (gap = []) entails full coverage of S. -/
theorem coverageSoundness (covered : Nat → Bool) (S : List Nat)
    (accepted : gap covered S = []) : ∀ s ∈ S, covered s = true :=
  (gapEmptyIffCovered covered S).mp accepted

/-! ## T5 — producer binding is stable: equal digests entail equal bound producer -/

/-- T5 — if two affiliation assertions bind the same committed producer digest, they agree. -/
theorem producerBindingStable (d₁ d₂ committed : Nat)
    (h₁ : d₁ = committed) (h₂ : d₂ = committed) : d₁ = d₂ := by rw [h₁, h₂]

end Simurgh.Stage5I
