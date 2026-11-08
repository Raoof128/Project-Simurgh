-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Phase 19 — authority provenance: a transition-system model of the composed gate's admission.
-- Self-contained: core Lean 4 only, no mathlib.
-- SCOPE (exact): the model has a host state (registered action ids, a host-issued one-shot
--   approval for at most one action, held, terminal, paused, budget, blocking fact) and two
--   input kinds. Agent inputs carry arbitrary bytes (the agent-writable channels) and can only
--   propose or resume; trusted inputs (update, stop, restart, approve) change authority. The
--   theorems say: an admitted proposal names a registered action or the one the host approved
--   (L1), an agent step never changes the authority fields, never clears the terminal latch and
--   never raises an approval (L2), agent bytes never change the admission verdict (the
--   noninterference statement behind the write-anywhere lane), and every action admitted along
--   any agent-only trace was registered or approved in the starting state.
--   P19-REPAIR03 (8 Nov 2026): the approval input was added because the Python gate admits a
--   token-approved ungranted action; before it, "admitted implies registered" contradicted the
--   running gate. The model is tied to the Python successor only by the differential
--   tools/assurance-provenance/leanstates.py, which enumerates states (including approved ones)
--   and compares this file's `admits` with the running gate. Without that differential this file
--   models nothing in the repository. No theorem claims the Python is correct, the host
--   uncompromised, or the channel census complete.

namespace Simurgh.Phase19

structure State where
  registered : List Nat
  approved : Option Nat
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

/-- Trusted-host input: only these change authority. `approve` is the host-issued one-shot token. -/
inductive TrustedInput where
  | update (registered : List Nat) (budget : Nat)
  | stop
  | restart
  | approve (action : Nat)
  deriving DecidableEq, Repr

/-- The authority an action can draw on: a registration, or the host's approval for exactly it. -/
def authorised (s : State) (a : Nat) : Bool :=
  s.registered.elem a || decide (s.approved = some a)

/-- Admission: the frozen `Session.dispatch` and `BoundSession.dispatch` chain, abstracted, with
the Phase 19b approved path (`dispatch_approved`) as the second disjunct of `authorised`. -/
def admits (s : State) (a : Nat) : Bool :=
  !s.held && !s.terminal && !s.paused && !s.blockingFact && decide (0 < s.budget)
    && authorised s a

/-- After an admission, an approval for exactly that action is spent. -/
def spend (s : State) (a : Nat) : Option Nat :=
  if s.approved = some a then none else s.approved

/-- One agent step: the state after it, and the admitted action if any. -/
def stepAgent (s : State) : AgentInput → State × Option Nat
  | .propose a _ =>
      if admits s a then
        ({ s with budget := s.budget - 1, approved := spend s a }, some a)
      else (s, none)
  | .resume _ => (s, none)

/-- One trusted step. `stop` latches `terminal`; `restart` clears `paused` only if not terminal. -/
def stepTrusted (s : State) : TrustedInput → State
  | .update r b => { s with registered := r, budget := b }
  | .stop => { s with terminal := true, paused := true }
  | .restart => if s.terminal then s else { s with paused := false }
  | .approve a => { s with approved := some a }

/-- Run a list of agent inputs, collecting admitted actions. -/
def runAgent : State → List AgentInput → State × List Nat
  | s, [] => (s, [])
  | s, i :: is =>
      let (s', out) := stepAgent s i
      let (s'', outs) := runAgent s' is
      (s'', (match out with | some a => [a] | none => []) ++ outs)

-- ---------------------------------------------------------------------------
-- Theorem 1 — admitsImpliesAuthorised (L1): an admitted action is registered or host-approved.
-- ---------------------------------------------------------------------------
theorem authorisedCases (s : State) (a : Nat) (h : authorised s a = true) :
    a ∈ s.registered ∨ s.approved = some a := by
  unfold authorised at h
  simp only [Bool.or_eq_true, decide_eq_true_eq] at h
  rcases h with h | h
  · exact Or.inl (List.mem_of_elem_eq_true h)
  · exact Or.inr h

theorem admitsImpliesAuthorised (s : State) (a : Nat) (h : admits s a = true) :
    a ∈ s.registered ∨ s.approved = some a := by
  unfold admits at h
  simp only [Bool.and_eq_true] at h
  exact authorisedCases s a h.2

/-- The registered-only corollary that the pre-repair file stated as its L1. -/
theorem admitsImpliesRegistered (s : State) (a : Nat) (hn : s.approved = none)
    (h : admits s a = true) : a ∈ s.registered := by
  rcases admitsImpliesAuthorised s a h with h | h
  · exact h
  · rw [hn] at h; cases h

-- ---------------------------------------------------------------------------
-- Theorem 2 — agentStepPreservesAuthority (L2): no agent input changes the registered set, the
-- held latch, the terminal latch, the paused flag or the blocking fact. The budget only moves
-- downward, and an approval is only ever spent, never raised.
-- ---------------------------------------------------------------------------
theorem spendNeverRaises (s : State) (a : Nat) :
    spend s a = s.approved ∨ spend s a = none := by
  unfold spend
  by_cases h : s.approved = some a
  · simp [h]
  · simp [h]

theorem agentStepPreservesAuthority (s : State) (i : AgentInput) :
    (stepAgent s i).1.registered = s.registered
    ∧ (stepAgent s i).1.held = s.held
    ∧ (stepAgent s i).1.terminal = s.terminal
    ∧ (stepAgent s i).1.paused = s.paused
    ∧ (stepAgent s i).1.blockingFact = s.blockingFact
    ∧ (stepAgent s i).1.budget ≤ s.budget
    ∧ ((stepAgent s i).1.approved = s.approved ∨ (stepAgent s i).1.approved = none) := by
  cases i with
  | propose a bytes =>
    unfold stepAgent
    by_cases h : admits s a = true
    · simp [h]
      exact spendNeverRaises s a
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
-- Theorem 4 — admittedInImage: along any agent-only trace, every admitted action was registered
-- or approved in the starting state. The registered set is invariant under agent steps and the
-- approval can only be spent (Theorem 2), so the image is the starting image.
-- ---------------------------------------------------------------------------
theorem stepAgentRegistered (s : State) (i : AgentInput) :
    (stepAgent s i).1.registered = s.registered :=
  (agentStepPreservesAuthority s i).1

theorem stepAgentApproved (s : State) (i : AgentInput) :
    (stepAgent s i).1.approved = s.approved ∨ (stepAgent s i).1.approved = none :=
  (agentStepPreservesAuthority s i).2.2.2.2.2.2

/-- Authority of a later state is contained in the starting state's authority. -/
def within (s₀ s : State) : Prop :=
  s.registered = s₀.registered ∧ (s.approved = s₀.approved ∨ s.approved = none)

theorem withinStep (s₀ s : State) (i : AgentInput) (h : within s₀ s) :
    within s₀ (stepAgent s i).1 := by
  rcases h with ⟨hr, ha⟩
  refine ⟨?_, ?_⟩
  · rw [stepAgentRegistered]; exact hr
  · rcases stepAgentApproved s i with h | h
    · rw [h]; exact ha
    · exact Or.inr h

theorem admittedWithin (s₀ s : State) (a : Nat) (h : within s₀ s) (hadm : admits s a = true) :
    a ∈ s₀.registered ∨ s₀.approved = some a := by
  rcases h with ⟨hr, ha⟩
  rcases admitsImpliesAuthorised s a hadm with hreg | happ
  · rw [hr] at hreg; exact Or.inl hreg
  · rcases ha with ha | ha
    · rw [ha] at happ; exact Or.inr happ
    · rw [ha] at happ; cases happ

theorem admittedInImageFrom (s₀ : State) (is : List AgentInput) :
    ∀ s, within s₀ s → ∀ a, a ∈ (runAgent s is).2 → a ∈ s₀.registered ∨ s₀.approved = some a := by
  induction is with
  | nil => intro s _ a h; simp [runAgent] at h
  | cons i is ih =>
    intro s hw a h
    unfold runAgent at h
    cases hi : stepAgent s i with
    | mk s' out =>
      rw [hi] at h
      simp only [List.mem_append] at h
      have hw' : within s₀ s' := by
        have := withinStep s₀ s i hw
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
            exact admittedWithin s₀ s b hw hadm
          · simp [hadm] at hi
            rcases hi with ⟨_, hout⟩
            rw [← hout] at h
            simp at h
        | resume note =>
          simp [stepAgent] at hi
          rcases hi with ⟨_, hout⟩
          rw [← hout] at h
          simp at h
      · exact ih s' hw' a h

theorem admittedInImage (s : State) (is : List AgentInput) :
    ∀ a, a ∈ (runAgent s is).2 → a ∈ s.registered ∨ s.approved = some a :=
  admittedInImageFrom s is s ⟨rfl, Or.inl rfl⟩ 

end Simurgh.Phase19
