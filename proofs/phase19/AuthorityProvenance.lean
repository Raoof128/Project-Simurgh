-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 19 — authority provenance: a transition-system model of the composed gate's admission.
-- Self-contained: core Lean 4 only, no mathlib.
-- SCOPE (exact): the model has a host state (registered action ids, held, terminal, paused,
--   budget, blocking fact) and two input kinds. Agent inputs carry arbitrary bytes (the
--   agent-writable channels) and can only propose or resume; trusted inputs (update, stop,
--   restart) change authority. The theorems say: an admitted proposal names a registered action
--   (L1), an agent step never changes the authority fields and never clears the terminal latch
--   (L2), agent bytes never change the admission verdict (the noninterference statement behind
--   the write-anywhere lane), and every action admitted along any agent-only trace is registered.
--   The model is tied to the Python successor only by the differential test
--   tools/assurance-provenance/tests/test_lean_differential.py, which enumerates states and
--   compares this file's `admits` with the running gate. Without that test this file models
--   nothing in the repository. No theorem claims the Python is correct, the host uncompromised,
--   or the channel census complete.

namespace Simurgh.Phase19

structure State where
  registered : List Nat
  held : Bool
  terminal : Bool
  paused : Bool
  budget : Nat
  blockingFact : Bool
  deriving DecidableEq, Repr

/-- Agent-authored input. The `List Nat` is whatever the agent wrote: notes, memory, transcript. -/
inductive AgentInput where
  | propose (action : Nat) (bytes : List Nat)
  | resume (note : List Nat)
  deriving DecidableEq, Repr

/-- Trusted-host input: only these change authority. -/
inductive TrustedInput where
  | update (registered : List Nat) (budget : Nat)
  | stop
  | restart
  deriving DecidableEq, Repr

/-- Admission: the frozen `Session.dispatch` and `BoundSession.dispatch` chain, abstracted. -/
def admits (s : State) (a : Nat) : Bool :=
  !s.held && !s.terminal && !s.paused && !s.blockingFact && decide (0 < s.budget)
    && s.registered.elem a

/-- One agent step: the state after it, and the admitted action if any. -/
def stepAgent (s : State) : AgentInput → State × Option Nat
  | .propose a _ =>
      if admits s a then ({ s with budget := s.budget - 1 }, some a) else (s, none)
  | .resume _ => (s, none)

/-- One trusted step. `stop` latches `terminal`; `restart` clears `paused` only if not terminal. -/
def stepTrusted (s : State) : TrustedInput → State
  | .update r b => { s with registered := r, budget := b }
  | .stop => { s with terminal := true, paused := true }
  | .restart => if s.terminal then s else { s with paused := false }

/-- Run a list of agent inputs, collecting admitted actions. -/
def runAgent : State → List AgentInput → State × List Nat
  | s, [] => (s, [])
  | s, i :: is =>
      let (s', out) := stepAgent s i
      let (s'', outs) := runAgent s' is
      (s'', (match out with | some a => [a] | none => []) ++ outs)

-- ---------------------------------------------------------------------------
-- Theorem 1 — admitsImpliesRegistered (L1): an admitted action is a registered one.
-- ---------------------------------------------------------------------------
theorem admitsImpliesRegistered (s : State) (a : Nat) (h : admits s a = true) :
    a ∈ s.registered := by
  unfold admits at h
  simp only [Bool.and_eq_true] at h
  exact List.mem_of_elem_eq_true h.2

-- ---------------------------------------------------------------------------
-- Theorem 2 — agentStepPreservesAuthority (L2): no agent input changes the registered set, the
-- held latch, the terminal latch, the paused flag or the blocking fact. Only the budget moves,
-- and only downward.
-- ---------------------------------------------------------------------------
theorem agentStepPreservesAuthority (s : State) (i : AgentInput) :
    (stepAgent s i).1.registered = s.registered
    ∧ (stepAgent s i).1.held = s.held
    ∧ (stepAgent s i).1.terminal = s.terminal
    ∧ (stepAgent s i).1.paused = s.paused
    ∧ (stepAgent s i).1.blockingFact = s.blockingFact
    ∧ (stepAgent s i).1.budget ≤ s.budget := by
  cases i with
  | propose a bytes =>
    unfold stepAgent
    by_cases h : admits s a = true
    · simp [h]
    · simp [h]
  | resume note => simp [stepAgent]

-- ---------------------------------------------------------------------------
-- Theorem 3 — agentBytesIrrelevant (the write-anywhere statement): the bytes an agent writes
-- never change the step. Stated for both input kinds.
-- ---------------------------------------------------------------------------
theorem agentBytesIrrelevant (s : State) (a : Nat) (b₁ b₂ : List Nat) :
    stepAgent s (.propose a b₁) = stepAgent s (.propose a b₂) := by
  simp [stepAgent]

theorem resumeBytesIrrelevant (s : State) (n₁ n₂ : List Nat) :
    stepAgent s (.resume n₁) = stepAgent s (.resume n₂) := by
  simp [stepAgent]

-- ---------------------------------------------------------------------------
-- Theorem 4 — admittedInImage: along any agent-only trace, every admitted action is registered
-- in the starting state. The registered set is invariant under agent steps (Theorem 2), so the
-- image is the starting image.
-- ---------------------------------------------------------------------------
theorem stepAgentRegistered (s : State) (i : AgentInput) :
    (stepAgent s i).1.registered = s.registered :=
  (agentStepPreservesAuthority s i).1

theorem admittedInImage (s : State) (is : List AgentInput) :
    ∀ a, a ∈ (runAgent s is).2 → a ∈ s.registered := by
  induction is generalizing s with
  | nil => intro a h; simp [runAgent] at h
  | cons i is ih =>
    intro a h
    unfold runAgent at h
    cases hi : stepAgent s i with
    | mk s' out =>
      rw [hi] at h
      simp only [List.mem_append] at h
      have hreg : s'.registered = s.registered := by
        have := stepAgentRegistered s i
        rw [hi] at this
        exact this
      rcases h with h | h
      · cases i with
        | propose b bytes =>
          unfold stepAgent at hi
          by_cases hadm : admits s b = true
          · simp [hadm] at hi
            rcases hi with ⟨_, hout⟩
            rw [← hout] at h
            simp at h
            rw [h]
            exact admitsImpliesRegistered s b hadm
          · simp [hadm] at hi
            rcases hi with ⟨_, hout⟩
            rw [← hout] at h
            simp at h
        | resume note =>
          simp [stepAgent] at hi
          rcases hi with ⟨_, hout⟩
          rw [← hout] at h
          simp at h
      · rw [← hreg]
        exact ih s' a h

end Simurgh.Phase19
