-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 5N symbolic VTC-Delay laws (spec §4 + A2/A4). Core Lean 4 only, no mathlib. All theorems fully
-- proved (no `sorry`, no user axioms). SCOPE: symbolic model of the pure-core first-failure spine and the
-- integer elapsed arithmetic — NOT real crypto. Each domain-separated hash is treated as a deterministic
-- function; this proves verifier CONFORMANCE, not collision/preimage resistance or physical elapsed time.
namespace Simurgh.Stage5N

/-- Outcome of each pure-core check (true = passed). Booleans are the symbolic facts the core decides over. -/
structure Facts where
  noForbiddenKeys : Bool  -- 396 half: no adequacy/overclaim key (I-C)
  envOk : Bool            -- 396 structural
  finalSigOk : Bool       -- 397
  inputOk : Bool          -- 398
  policyDigestOk : Bool   -- 399
  policyAcceptedOk : Bool -- 400
  freshOk : Bool          -- 401
  startBindOk : Bool      -- 402
  startSigOk : Bool       -- 403
  startSubjectOk : Bool   -- 404
  startTokenOk : Bool     -- 405
  startAnchorOk : Bool    -- 406
  iterationOk : Bool      -- 407
  implOk : Bool           -- 408
  seedOk : Bool           -- 409
  checkpointOk : Bool     -- 410
  terminalOk : Bool       -- 411
  decisionOk : Bool       -- 412
  outputOk : Bool         -- 413
  endSubjectOk : Bool     -- 414
  endAnchorOk : Bool      -- 415
  uncertaintyOk : Bool    -- 416
  elapsedOk : Bool        -- 417
  interpOk : Bool         -- 418

/-- Frozen first-failure spine as an ordered check list; the first failing entry's code is the verdict. -/
def checks (f : Facts) : List (Bool × Nat) :=
  [((f.noForbiddenKeys && f.envOk), 396), (f.finalSigOk, 397), (f.inputOk, 398),
   (f.policyDigestOk, 399), (f.policyAcceptedOk, 400), (f.freshOk, 401),
   (f.startBindOk, 402), (f.startSigOk, 403), (f.startSubjectOk, 404),
   (f.startTokenOk, 405), (f.startAnchorOk, 406), (f.iterationOk, 407),
   (f.implOk, 408), (f.seedOk, 409), (f.checkpointOk, 410), (f.terminalOk, 411),
   (f.decisionOk, 412), (f.outputOk, 413), (f.endSubjectOk, 414), (f.endAnchorOk, 415),
   (f.uncertaintyOk, 416), (f.elapsedOk, 417), (f.interpOk, 418)]

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

/-- 0 is not one of the 5N codes (396..418) — proved over the CLOSED code list (no free vars). -/
theorem zero_not_code (f : Facts) : (0 : Nat) ∉ (checks f).map Prod.snd := by
  simp only [checks, List.map_cons, List.map_nil]; decide

/-- Green ⇒ every check passed (the key extraction lemma). -/
theorem green_all_ok (f : Facts) (h : verdict f = 0) : ∀ p ∈ checks f, p.1 = true :=
  firstFail_zero_all_true (checks f) (zero_not_code f) h

/-! ### 3 — coreTotality: the verdict is always 0 or a code in 396..418. -/
theorem coreTotality (f : Facts) : verdict f = 0 ∨ (396 ≤ verdict f ∧ verdict f ≤ 418) := by
  rcases firstFail_zero_or_mem (checks f) with h | h
  · left; exact h
  · right
    simp only [verdict, checks, List.map_cons, List.map_nil, List.mem_cons, List.not_mem_nil,
      or_false] at h ⊢
    rcases h with h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h|h <;> omega

/-! ### 4 — noGreenWithoutChildAnchors: green ⇒ both endpoint children verified. -/
theorem noGreenWithoutChildAnchors (f : Facts) (h : verdict f = 0) :
    f.startAnchorOk = true ∧ f.endAnchorOk = true := by
  have hall := green_all_ok f h
  exact ⟨hall (f.startAnchorOk, 406) (by simp [checks]), hall (f.endAnchorOk, 415) (by simp [checks])⟩

/-! ### 1 — descendantConformance: green ⇒ terminal + output commitment hold. -/
theorem descendantConformance (f : Facts) (h : verdict f = 0) :
    f.terminalOk = true ∧ f.outputOk = true := by
  have hall := green_all_ok f h
  exact ⟨hall (f.terminalOk, 411) (by simp [checks]), hall (f.outputOk, 413) (by simp [checks])⟩

/-! ### 6 — startTokenDependencyConformance: green ⇒ the whole chain + output binding hold. This is a
    CONFORMANCE statement (the accepted terminal is produced by the declared recurrence and D_out binds the
    start token); it does NOT claim physical postdating, preimage resistance, or elapsed execution time. -/
theorem startTokenDependencyConformance (f : Facts) (h : verdict f = 0) :
    f.seedOk = true ∧ f.checkpointOk = true ∧ f.terminalOk = true ∧ f.outputOk = true := by
  have hall := green_all_ok f h
  exact ⟨hall (f.seedOk, 409) (by simp [checks]), hall (f.checkpointOk, 410) (by simp [checks]),
         hall (f.terminalOk, 411) (by simp [checks]), hall (f.outputOk, 413) (by simp [checks])⟩

/-! ### 7 — overclaimUnassertable (I-C): green ⇒ no forbidden adequacy/overclaim key present. -/
theorem overclaimUnassertable (f : Facts) (h : verdict f = 0) : f.noForbiddenKeys = true := by
  have hall := green_all_ok f h
  have hp := hall ((f.noForbiddenKeys && f.envOk), 396) (by simp [checks])
  cases hb : f.noForbiddenKeys with
  | true => rfl
  | false => rw [hb] at hp; simp at hp

/-! ### 5 — issuerReplay401: prefix passes ∧ freshness reused ⇒ verdict 401. -/
theorem issuerReplay401 (f : Facts)
    (h1 : (f.noForbiddenKeys && f.envOk) = true) (h2 : f.finalSigOk = true) (h3 : f.inputOk = true)
    (h4 : f.policyDigestOk = true) (h5 : f.policyAcceptedOk = true) (hr : f.freshOk = false) :
    verdict f = 401 := by
  simp [verdict, checks, firstFail, h1, h2, h3, h4, h5, hr]

/-! ### 1b — wrongTerminal411: checks 396..410 pass ∧ terminal fails ⇒ verdict 411. -/
theorem wrongTerminal411 (f : Facts)
    (h1 : (f.noForbiddenKeys && f.envOk) = true) (h2 : f.finalSigOk = true) (h3 : f.inputOk = true)
    (h4 : f.policyDigestOk = true) (h5 : f.policyAcceptedOk = true) (h6 : f.freshOk = true)
    (h7 : f.startBindOk = true) (h8 : f.startSigOk = true) (h9 : f.startSubjectOk = true)
    (h10 : f.startTokenOk = true) (h11 : f.startAnchorOk = true) (h12 : f.iterationOk = true)
    (h13 : f.implOk = true) (h14 : f.seedOk = true) (h15 : f.checkpointOk = true)
    (ht : f.terminalOk = false) : verdict f = 411 := by
  simp [verdict, checks, firstFail, h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13,
    h14, h15, ht]

/-! ### 2 — conservative elapsed soundness (Int ms), conditional on the committed uncertainty bounds, plus
    monotonicity. Pure integer arithmetic; `omega` discharges both. -/
def elapsedLowerBound (endT endU startT startU : Int) : Int := (endT - endU) - (startT + startU)

/-- Given the committed ± uncertainty bounds hold of the true clocks, a passing conservative lower bound
    implies the true elapsed interval meets the floor. (Assumes the bounds, per §4 non-claim on TSA clocks.) -/
theorem elapsedSoundness (actualStart actualEnd startT endT startU endU minMs : Int)
    (hs2 : actualStart - startT ≤ startU) (he1 : -endU ≤ actualEnd - endT)
    (hge : elapsedLowerBound endT endU startT startU ≥ minMs) :
    actualEnd - actualStart ≥ minMs := by
  unfold elapsedLowerBound at hge; omega

/-- Increasing either committed uncertainty bound can never increase the conservative lower bound. -/
theorem uncertaintyMonotone (endT startT startU startU' endU endU' : Int)
    (h1 : startU ≤ startU') (h2 : endU ≤ endU') :
    elapsedLowerBound endT endU' startT startU' ≤ elapsedLowerBound endT endU startT startU := by
  unfold elapsedLowerBound; omega

end Simurgh.Stage5N
