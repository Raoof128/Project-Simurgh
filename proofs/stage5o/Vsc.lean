-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5O (VSC) symbolic laws — Sections 7, 8, 9 and the §10 allocation.
--
-- Core Lean 4 only, no mathlib. All theorems fully proved: zero proof holes, zero user axioms (the CI
-- guard greps this tree, so none is named here even in prose).
--
-- SCOPE, stated before the theorems so it cannot be read as more than it is: this is a SYMBOLIC model
-- of the pure-core first-failure spine, of the disclosure-budget arithmetic, and of the exact rational
-- comparison. Each domain-separated hash is treated as a deterministic function, so what is proved is
-- verifier CONFORMANCE — never collision or preimage resistance, never that the probability model is
-- calibrated, and never anything about real Bitcoin proof-of-work.
--
-- The spine below is GENERATED from the frozen SECTION{7,8,9}_FIRST_FAILURE_ORDER arrays and the §10
-- allocation, so the codes here are the codes the verifiers actually emit: 420-456.
namespace Simurgh.Stage5O

/-- Outcome of each pure-core check (true = passed): the symbolic facts the three verifiers decide. -/
structure Facts where
  s7NoncanonicalOrOversize : Bool  -- 420
  s7ArtifactShape : Bool  -- 421
  s7Bytes32TokenGrammar : Bool  -- 422
  s7SchemaPinMismatch : Bool  -- 423
  s7CheckpointNotVerifierDerived : Bool  -- 424
  s7ChainInvalid : Bool  -- 425
  s7InsufficientDescendants : Bool  -- 426
  s7PrecommitmentBindingMismatch : Bool  -- 427
  s7IndexDerivation : Bool  -- 428
  s7RootIncomplete : Bool  -- 429
  s7SeedBinding : Bool  -- 430
  s8OpeningPackageOversize : Bool  -- 431
  s8Noncanonical : Bool  -- 432
  s8ResourceLimit : Bool  -- 433
  s8OpeningShape : Bool  -- 434
  s8Bytes32TokenGrammar : Bool  -- 435
  s8DisclosurePolicyBinding : Bool  -- 436
  s8IndicesMismatch : Bool  -- 437
  s8CaseLinkInvalid : Bool  -- 438
  s8MerkleInclusionInvalid : Bool  -- 439
  s8PresentedHistoryInvalid : Bool  -- 440
  s8BudgetExhausted : Bool  -- 441
  s9PolicyPackageTransportOversize : Bool  -- 442
  s9Noncanonical : Bool  -- 443
  s9PolicyPackageCanonicalOversize : Bool  -- 444
  s9ProbabilityClaimShape : Bool  -- 445
  s9RationalGrammar : Bool  -- 446
  s9DenominatorNotPositive : Bool  -- 447
  s9RationalNotLowestTerms : Bool  -- 448
  s9PolicyBindingMismatch : Bool  -- 449
  s9ParameterDomainViolation : Bool  -- 450
  s9EvaluationBoundExceeded : Bool  -- 451
  s9ClaimTypeMismatch : Bool  -- 452
  s9PairRatioActivationMismatch : Bool  -- 453
  s9DetectionClaimValueMismatch : Bool  -- 454
  s9PairRatioValueMismatch : Bool  -- 455
  s9DetectionFloorUnmet : Bool  -- 456

/-- The frozen first-failure spine. The first failing entry's code is the verdict. -/
def checks (f : Facts) : List (Bool × Nat) :=
  [(f.s7NoncanonicalOrOversize, 420), (f.s7ArtifactShape, 421), (f.s7Bytes32TokenGrammar, 422),
   (f.s7SchemaPinMismatch, 423), (f.s7CheckpointNotVerifierDerived, 424), (f.s7ChainInvalid, 425),
   (f.s7InsufficientDescendants, 426), (f.s7PrecommitmentBindingMismatch, 427), (f.s7IndexDerivation, 428),
   (f.s7RootIncomplete, 429), (f.s7SeedBinding, 430), (f.s8OpeningPackageOversize, 431),
   (f.s8Noncanonical, 432), (f.s8ResourceLimit, 433), (f.s8OpeningShape, 434),
   (f.s8Bytes32TokenGrammar, 435), (f.s8DisclosurePolicyBinding, 436), (f.s8IndicesMismatch, 437),
   (f.s8CaseLinkInvalid, 438), (f.s8MerkleInclusionInvalid, 439), (f.s8PresentedHistoryInvalid, 440),
   (f.s8BudgetExhausted, 441), (f.s9PolicyPackageTransportOversize, 442), (f.s9Noncanonical, 443),
   (f.s9PolicyPackageCanonicalOversize, 444), (f.s9ProbabilityClaimShape, 445), (f.s9RationalGrammar, 446),
   (f.s9DenominatorNotPositive, 447), (f.s9RationalNotLowestTerms, 448), (f.s9PolicyBindingMismatch, 449),
   (f.s9ParameterDomainViolation, 450), (f.s9EvaluationBoundExceeded, 451), (f.s9ClaimTypeMismatch, 452),
   (f.s9PairRatioActivationMismatch, 453), (f.s9DetectionClaimValueMismatch, 454), (f.s9PairRatioValueMismatch, 455),
   (f.s9DetectionFloorUnmet, 456)]

/-- First failing code, else 0. Structural recursion (cleaner induction than a nested `if`). -/
def firstFail : List (Bool × Nat) → Nat
  | [] => 0
  | (ok, code) :: rest => if ok = true then firstFail rest else code

def verdict (f : Facts) : Nat := firstFail (checks f)

/-! ### General lemmas about the spine. -/

/-- Every verdict is 0 or one of the listed codes. -/
theorem firstFail_zero_or_mem (l : List (Bool × Nat)) :
    firstFail l = 0 ∨ firstFail l ∈ l.map Prod.snd := by
  induction l with
  | nil => left; rfl
  | cons hd tl ih =>
    obtain ⟨ok, code⟩ := hd
    simp only [firstFail, List.map_cons]
    by_cases h : ok = true
    · rw [if_pos h]
      cases ih with
      | inl hz => left; exact hz
      | inr hm => right; exact List.mem_cons_of_mem _ hm
    · rw [if_neg h]; right; exact List.mem_cons_self _ _

/-- If 0 is not among the codes, a 0 verdict forces every check to have passed. -/
theorem firstFail_zero_all_true :
    ∀ (l : List (Bool × Nat)), (0 ∉ l.map Prod.snd) → firstFail l = 0 → ∀ p ∈ l, p.1 = true := by
  intro l
  induction l with
  | nil => intro _ _ p hp; cases hp
  | cons hd tl ih =>
    intro hz hff p hp
    obtain ⟨ok, code⟩ := hd
    simp only [firstFail] at hff
    by_cases h : ok = true
    · rw [if_pos h] at hff
      rcases List.mem_cons.mp hp with heq | hmem
      · subst heq; exact h
      · refine ih (fun hmem0 => hz ?_) hff p hmem
        simp only [List.map_cons]; exact List.mem_cons_of_mem _ hmem0
    · rw [if_neg h] at hff
      exact absurd (show (0 : Nat) ∈ List.map Prod.snd ((ok, code) :: tl) by
        simp only [List.map_cons]; rw [← hff]; exact List.mem_cons_self _ _) hz

/-- **No rejection is ever 0.** 0 is OK, and it is not one of the Stage 5O codes (420..456). -/
theorem zero_not_code (f : Facts) : (0 : Nat) ∉ (checks f).map Prod.snd := by
  simp only [checks, List.map_cons, List.map_nil]; decide

/-- Green ⇒ every check passed (the key extraction lemma). -/
theorem green_all_ok (f : Facts) (h : verdict f = 0) : ∀ p ∈ checks f, p.1 = true :=
  firstFail_zero_all_true (checks f) (zero_not_code f) h

/-! ### coreTotality — the verdict is always 0 or a code in the §10 band 420..456. -/
theorem coreTotality (f : Facts) : verdict f = 0 ∨ (420 ≤ verdict f ∧ verdict f ≤ 456) := by
  rcases firstFail_zero_or_mem (checks f) with h | h
  · left; exact h
  · right
    simp only [verdict, checks, List.map_cons, List.map_nil, List.mem_cons, List.not_mem_nil,
      or_false] at h ⊢
    rcases h with h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h <;> omega

/-! ### prefixSatisfaction — a witness for a check satisfies every check before it.

    This is the §7.2 property the whole `S7/S8/S9` matrix discipline rests on: a row that first-fails
    at some check must have PASSED every earlier one, so a fixture cannot quietly test an easier rule
    than it claims to. Stated structurally: a non-zero verdict splits the spine into a fully-passing
    prefix, the failing entry whose code is the verdict, and an unexamined suffix. -/
theorem prefixSatisfaction (l : List (Bool × Nat)) (h : firstFail l ≠ 0) :
    ∃ pre suf c, l = pre ++ (false, c) :: suf ∧ (∀ p ∈ pre, p.1 = true) ∧ firstFail l = c := by
  induction l with
  | nil => exact absurd rfl h
  | cons hd tl ih =>
    obtain ⟨ok, code⟩ := hd
    by_cases hok : ok = true
    · subst hok
      simp only [firstFail, if_pos rfl] at h ⊢
      obtain ⟨pre, suf, c, hsplit, hall, hff⟩ := ih h
      refine ⟨(true, code) :: pre, suf, c, ?_, ?_, hff⟩
      · simp [hsplit]
      · intro p hp
        rcases List.mem_cons.mp hp with heq | hmem
        · subst heq; rfl
        · exact hall p hmem
    · have hfalse : ok = false := by cases ok <;> simp at hok ⊢
      subst hfalse
      refine ⟨[], tl, code, rfl, ?_, ?_⟩
      · intro p hp; cases hp
      · simp [firstFail]

/-- The Stage 5O instance: a rejecting verdict is the code of a genuinely failing check, and every
    check before it passed. -/
theorem prefixSatisfaction_stage5o (f : Facts) (h : verdict f ≠ 0) :
    ∃ pre suf c, checks f = pre ++ (false, c) :: suf ∧ (∀ p ∈ pre, p.1 = true) ∧ verdict f = c :=
  prefixSatisfaction (checks f) h

/-! ### Section 9 — the dual-form product identity ("dual-form selection changes cost, never meaning").

    `fallingProd a n = a(a-1)...(a-n+1)`, the falling product of `n` terms from `a`. The verifier may
    evaluate the binomial ratio as `Q_k` (k terms) or as `Q_J` (J terms) and picks whichever is
    shorter; the theorem is that the two agree, so the choice is a RESOURCE decision and never a
    semantic one. The §9 census checks this over a generated grid; here it is proved for all inputs. -/
def fallingProd (a : Nat) : Nat → Nat
  | 0 => 1
  | n + 1 => (a - n) * fallingProd a n

/-- Splitting a falling product: `n` terms from `N` is `a` terms from `N` times `b` terms from `N-a`. -/
theorem fallingProd_add (N a b : Nat) :
    fallingProd N (a + b) = fallingProd N a * fallingProd (N - a) b := by
  induction b with
  | zero => simp [fallingProd]
  | succ n ih =>
    have hsub : N - (a + n) = N - a - n := by omega
    show (N - (a + n)) * fallingProd N (a + n)
        = fallingProd N a * ((N - a - n) * fallingProd (N - a) n)
    rw [ih, hsub]
    simp [Nat.mul_left_comm, Nat.mul_comm, Nat.mul_assoc]

/-- **The dual-form identity.** Cross-multiplied, `Q_k` and `Q_J` are the same rational. -/
theorem dualFormIdentity (N J k : Nat) :
    fallingProd (N - J) k * fallingProd N J = fallingProd (N - k) J * fallingProd N k := by
  have h1 := fallingProd_add N J k
  have h2 := fallingProd_add N k J
  rw [Nat.add_comm J k, h2] at h1
  calc fallingProd (N - J) k * fallingProd N J
      = fallingProd N J * fallingProd (N - J) k := Nat.mul_comm _ _
    _ = fallingProd N k * fallingProd (N - k) J := h1.symm
    _ = fallingProd (N - k) J * fallingProd N k := Nat.mul_comm _ _

/-! ### Section 9 — the floor is decided by exact cross multiplication ("No Rounded Verdict").

    `p_n/p_d >= m_n/m_d` is decided as `p_n * m_d >= m_n * p_d`: integers only, no division, no float. -/
def floorAccept (pn pd mn md : Nat) : Bool := decide (mn * pd ≤ pn * md)

/-- **The floor is inclusive at equality**: a probability exactly equal to the bound is accepted. -/
theorem floor_inclusive (pn pd : Nat) : floorAccept pn pd pn pd = true := by
  simp [floorAccept, Nat.mul_comm]

/-- A strictly larger probability over the same denominator is still accepted (monotone in the
    numerator), so meeting the bound is never punished by exceeding it. -/
theorem floor_monotone (pn pd mn q : Nat) (h : floorAccept pn pd mn pd = true) :
    floorAccept (pn + q) pd mn pd = true := by
  simp only [floorAccept, decide_eq_true_eq] at h ⊢
  have : pn * pd ≤ (pn + q) * pd := Nat.mul_le_mul_right pd (Nat.le_add_right pn q)
  omega

/-! ### Section 8 — "No Unbudgeted Unzip".

    Disclosure is accounted over the UNIQUE indices of the presented history. `insertNew` adds an
    index only when it is new, so reopening an already-disclosed index costs nothing. -/
def insertNew (xs : List Nat) (x : Nat) : List Nat := if x ∈ xs then xs else x :: xs

def union (prior : List Nat) : List Nat → List Nat
  | [] => prior
  | x :: rest => union (insertNew prior x) rest

/-- **Reopening is free.** Uniting a prior disclosure with indices it already contains does not
    change it at all — so a reopen cannot consume budget. -/
theorem reopen_free (prior cur : List Nat) (h : ∀ x ∈ cur, x ∈ prior) :
    union prior cur = prior := by
  induction cur generalizing prior with
  | nil => rfl
  | cons x rest ih =>
    have hx : x ∈ prior := h x (List.mem_cons_self _ _)
    simp only [union, insertNew, if_pos hx]
    exact ih prior (fun y hy => h y (List.mem_cons_of_mem _ hy))

/-- The union never shrinks the prior disclosure: budget accounting is monotone, so a producer
    cannot lower its consumed budget by presenting more history. -/
theorem union_length_ge (prior cur : List Nat) : prior.length ≤ (union prior cur).length := by
  induction cur generalizing prior with
  | nil => exact Nat.le_refl _
  | cons x rest ih =>
    refine Nat.le_trans ?_ (ih (insertNew prior x))
    by_cases hx : x ∈ prior
    · simp only [insertNew, if_pos hx]; exact Nat.le_refl _
    · simp only [insertNew, if_neg hx, List.length_cons]
      omega

/-- **No Unbudgeted Unzip.** The verifier accepts only when the united disclosure fits the
    precommitted budget; combined with `union_length_ge`, consumption is monotone and bounded. -/
def budgetAccept (prior cur : List Nat) (B : Nat) : Bool := decide ((union prior cur).length ≤ B)

theorem no_unbudgeted_unzip (prior cur : List Nat) (B : Nat)
    (h : budgetAccept prior cur B = true) : (union prior cur).length ≤ B := by
  simpa [budgetAccept] using h

/-- Accepting a union implies the prior disclosure was itself within budget: an accepted opening can
    never sit on top of an already-overspent history. -/
theorem accepted_prior_within_budget (prior cur : List Nat) (B : Nat)
    (h : budgetAccept prior cur B = true) : prior.length ≤ B :=
  Nat.le_trans (union_length_ge prior cur) (no_unbudgeted_unzip prior cur B h)

end Simurgh.Stage5O
