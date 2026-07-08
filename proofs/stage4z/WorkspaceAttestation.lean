-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Stage 4Z symbolic workspace-attestation laws (4Z spec §4). Core Lean 4 only, no mathlib.
-- SCOPE: symbolic models only. Four theorems are substantive (matrixTotal, flagAgreement,
-- lexiconMonotone, conflictSound); two are invariant-locks (gridConservation,
-- publicSubsetAudit). Motto: AnthropicSafe First, then ReviewerSafe.
namespace Simurgh.Stage4Z

/-- A lexicon token carries an id and its nano-scaled readout score (Nat model of the
    decimal-string score_nano, compared as a magnitude). -/
structure Tok where
  tokenId : Nat
  score : Nat
  deriving DecidableEq

/-- Sum of per-prompt token counts (structural recursion). -/
def sumTokens : List Nat → Nat
  | [] => 0
  | n :: ns => n + sumTokens ns

/-- The total grid size over the declaration: (Σ token positions) × (number of layers). The
    position rule is TOTAL, so every position of every prompt is present. -/
def gridSize (promptTokens : List Nat) (nLayers : Nat) : Nat :=
  sumTokens promptTokens * nLayers

/-- Theorem 1 — gridConservation (invariant-lock): the grid is the total product of the
    precommitted declaration's positions and layers. No Silent Cell: a dropped position or
    layer would change this size. -/
theorem gridConservation (promptTokens : List Nat) (nLayers : Nat) :
    gridSize promptTokens nLayers = sumTokens promptTokens * nLayers := rfl

/-- The score matrix: every cell maps to the full lexicon (no top-K truncation). -/
def matrixCells (cells : List Unit) (lex : List Tok) : List (List Tok) :=
  cells.map (fun _ => lex)

/-- Theorem 2 — matrixTotal (substantive): EVERY cell's score row has exactly the lexicon's
    length — No Silent Token. A row missing a token could not arise from this construction. -/
theorem matrixTotal (cells : List Unit) (lex : List Tok) :
    ∀ row ∈ matrixCells cells lex, row.length = lex.length := by
  intro row hrow
  unfold matrixCells at hrow
  rw [List.mem_map] at hrow
  obtain ⟨_, _, hEq⟩ := hrow
  rw [← hEq]

/-- The θ-only flag rule of record: a token flags iff its score meets the threshold. -/
def flagged (theta : Nat) (t : Tok) : Bool := decide (theta ≤ t.score)

/-- Theorem 3 — flagAgreement (substantive): the boolean flag equals the θ threshold relation.
    The published flags are exactly the rule applied to the published matrix. -/
theorem flagAgreement (theta : Nat) (t : Tok) :
    flagged theta t = true ↔ theta ≤ t.score := by
  unfold flagged
  exact decide_eq_true_iff

/-- The flag set over a lexicon (θ-filter; NO truncation — this is what makes monotonicity
    provable). -/
def flags (theta : Nat) (lex : List Tok) : List Tok :=
  lex.filter (fun t => decide (theta ≤ t.score))

/-- Theorem 4 — lexiconMonotone (substantive): adding watch-tokens NEVER removes an existing
    flag. Provable ONLY because the flag rule is θ-only (no top-K) — under truncation a new
    high-scoring token could displace an old one and this would be false. -/
theorem lexiconMonotone (theta : Nat) (lex extra : List Tok) (t : Tok)
    (h : t ∈ flags theta lex) : t ∈ flags theta (lex ++ extra) := by
  unfold flags at h ⊢
  rw [List.mem_filter] at h ⊢
  exact ⟨List.mem_append.mpr (Or.inl h.1), h.2⟩

/-- The dual-signal conflict check: the monitor's claimed flag count vs the recomputed total. -/
def conflictFires (claimed recomputed : Nat) : Bool := decide (claimed ≠ recomputed)

/-- Theorem 5 — conflictSound (substantive): whenever the claim differs from the recomputed
    total, the conflict check fires (197 cannot be silently skipped). -/
theorem conflictSound (claimed recomputed : Nat) (h : claimed ≠ recomputed) :
    conflictFires claimed recomputed = true := by
  unfold conflictFires
  simp [h]

/-- The public and audit first-failure code sets. -/
def publicCodes : List Nat := [190, 191, 192, 193, 194, 196, 197]
def auditCodes : List Nat := [190, 191, 192, 193, 194, 195, 196, 197]

/-- Theorem 6 — publicSubsetAudit (invariant-lock): every public check code is an audit check
    code (public ⊆ audit), so a public PASS can never contradict the audit scope. -/
theorem publicSubsetAudit : ∀ c ∈ publicCodes, c ∈ auditCodes := by decide

end Simurgh.Stage4Z
