# Stage 4A-lite — Minimal Capability Kernel (design / spec)

**Date:** 2026-06-25
**Status:** Approved for implementation planning
**Track:** LLM-Shield / VCA evidence architecture
**Predecessor evidence:** Stage 1-LIVE authority gate, frozen at commit `37f2de0`
(`v2.9.0-stage-1-live-authority-gate`)

---

## Thesis (the one sentence)

> The frozen live authority-gate result is produced by a gate now proven
> equivalent to a minimal Capability Kernel, and that kernel's authorization
> decisions are sealed as offline-reproducible VCA evidence — no live model was
> re-run.

Stage 4A-lite is an **evidence-architecture** stage, not a gateway-feature stage.
It turns the two existing hard-coded gate families (egress, destructive mutation)
into one minimal Capability Kernel, proves the refactor changes no behaviour, and
seals the kernel's authorization decisions as signed, offline-verifiable evidence.
It makes **no** new behavioural claim and adds **no** new action families.

## Scope decision (recorded)

**Chosen scope: A — pure abstraction + evidence.** Rejected for this stage:
- **B** (typed intent-sources to fix the `user_task_8` over-block) — deferred so
  that "kernel abstraction works" and "capability precision improves utility"
  stay separate, independently-attributable rungs.
- **C** (financial/code/secret families) — deferred; without live AgentDojo
  signal those would be unit-test-only claims, too weak for this rung.

The kernel *interface* is designed to make B and C pure policy/data additions
later, but neither is implemented now.

## Architecture fork (recorded)

**Chosen:** adapter-side Python kernel + Node VCA signing, **no `src/llmShield`
change**. This preserves the policy-drift discipline held since Stage 3E and
matches the Stage 3M/3X evidence-stage pattern (metadata-only run bundle →
canonical-JSON Ed25519 signature → two-tier verifier → tamper tests → private key
never committed). The real-gateway (`src/llmShield`) capability-kernel feature is
explicitly left for a later stage once the abstraction is stable.

---

## Components

### 1. `capability_kernel.py` (new, pure, dependency-free)

Location: `tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/capability_kernel.py`

Core data model:

- **`Action`** — a typed proposed effect:
  `{ family, verb, target_kind, target }` where
  - `family ∈ { "egress", "destructive_mutation" }` (only these two exist now),
  - `verb` e.g. `send | share | invite | delete | cancel`,
  - `target_kind ∈ { "email" | "file" | "calendar" | "unknown" }`,
  - `target` is the raw destination/identifier (used only to compute a hash and a
    grounding check; never persisted raw).
- **`Capability` / `Policy`** — maps a `family` to a capability check against an
  authorization context (today: the trusted user-task text). Exactly two policy
  instances exist:
  - `egress` → destination must be **grounded** in the trusted task
    (address or local-part token appears in task text);
  - `destructive_mutation` → blocked unless the trusted task expresses
    **destructive intent** (delete/cancel/remove/… regex).
- **`AuthorityDecision`** — `{ verdict, reason, would_execute=false, ... }` with
  `verdict ∈ { "allow" | "block" | "requires_confirmation" }`. (Only `allow` and
  `block` are produced by the two current policies; `requires_confirmation` is in
  the type for forward-compatibility but is not emitted in 4A-lite.)

Core function: `authorise(action: Action, context) -> AuthorityDecision`.

The kernel makes **no** I/O, no model calls, no network. It is the single source
of authorization truth for the adapter-side gates.

### 2. `live_defence.py` — `gate_tool_call` becomes a thin shim

`gate_tool_call(function, args, trusted_text, *, gate_mutation=False)` keeps its
exact current signature and return contract (`(decision, family, detail)`), but
its body becomes: build the typed `Action`(s) from `(function, args)`, call
`authorise`, and translate the `AuthorityDecision` back to the legacy tuple. The
live pipeline (`build_gated_tools_executor`, `build_defended_pipeline`) is
**behaviourally untouched**. No `src/llmShield` change.

For differential testing, the pre-refactor gate logic must be preserved as a
test-only legacy function or fixture before replacement, so equivalence is
measured against the actual previous behaviour rather than a reconstructed
approximation.

### 3. Node attestation (`tools/simurgh-attestation/`)

- `sign-stage4a-authority.mjs` — canonical-JSON (RFC 8785-style, same helper used
  by prior stages) Ed25519 signature over the run bundle, using a **fresh
  dedicated Stage 4A key** (never reuse 3M/3X/any prior key).
- `verify-stage4a-authority.mjs` — two-tier verifier (portable signature check +
  `--reproduce` deep check). Rejects: tampered decision rows, edited metrics,
  wrong key, and digest mismatch against the frozen 1-LIVE evidence.

---

## The three evidence legs

### Leg 1 — Refactor-equivalence (earns "no behaviour change")

An exhaustive **differential test** asserts, for every egress and
destructive-mutation branch of the existing policy surface:

```
old gate_tool_call(function, args, trusted, gate_mutation)
  ==
new shim-over-kernel(function, args, trusted, gate_mutation)
```

The corpus covers every branch: grounded/ungrounded egress across all
`EGRESS_DEST_ARGS` tools and arg shapes (str, comma/semicolon string, list,
nested list, None); local-part vs full-address grounding; destructive mutation
with and without destructive intent in the task; `gate_mutation` on and off;
non-gated tools (read/search) always allowed. This is the *only* basis on which
the frozen live result is carried forward.

### Leg 2 — Model-free authority-decision corpus (the signed VCA artifact)

A metadata-only action corpus is reconstructed from **AgentDojo's own ground
truth** — user-task legitimate actions and injection-task attacker goals (both
fixed, public, no model required). The kernel is run over this corpus and emits a
full `simurgh.authority_decision.v1` record per action. This is reproducible
offline **forever** (no pod, no key). It is labelled, in every artifact and in
RESULTS.md, as a **model-free authority-decision corpus, not a live trace.**

### Leg 3 — Digest-bound inheritance (no replay claim)

The live `9/140 → 0/140` authority-gate result is cited and **digest-bound** to
the frozen 1-LIVE evidence at commit `37f2de0`. Wording discipline (verbatim
requirement):

> The live authority-gate result is inherited only through differential
> equivalence to the gate that produced the frozen evidence, not through replay
> of the live model or reconstruction of live per-action traces.

---

## Authority-decision record shape (`simurgh.authority_decision.v1`)

```json
{
  "schema": "simurgh.authority_decision.v1",
  "run_id": "stage-4a-lite-...",
  "case_id": "...",
  "turn_id": "...",
  "tool_name": "...",
  "action": {
    "family": "egress | destructive_mutation",
    "verb": "send | share | invite | delete | cancel",
    "target_kind": "email | file | calendar | unknown",
    "target_hash": "sha256:..."
  },
  "capability_checked": {
    "capability_id": "task_grounded_authority.v1",
    "grounding_source": "trusted_user_task",
    "policy_version": "stage4a-lite.authority-policy.v1"
  },
  "decision": {
    "verdict": "allow | block | requires_confirmation",
    "reason": "ungrounded_destination | destructive_mutation_not_authorised | task_grounded",
    "would_execute": false
  },
  "privacy": {
    "raw_prompt_recorded": false,
    "raw_tool_args_recorded": false,
    "raw_destination_recorded": false
  }
}
```

Targets and file paths are hashed (`sha256:...`). No raw addresses, file names, or
tool args are persisted. The bird keeps receipts, not gossip. Target hashes are
metadata-minimisation identifiers, not a secrecy guarantee against dictionary
reconstruction of known public targets.

---

## File layout

```
tools/agentdojo-simurgh-adapter/simurgh_agentdojo_adapter/
  capability_kernel.py                      (new — pure kernel)
  live_defence.py                           (gate_tool_call → thin shim)
tools/agentdojo-simurgh-adapter/tests/
  test_capability_kernel_equivalence.py     (new — exhaustive differential)
  test_capability_kernel.py                 (new — kernel unit tests)
tools/simurgh-attestation/
  sign-stage4a-authority.mjs                (new — fresh 4A Ed25519 key)
  verify-stage4a-authority.mjs              (new — two-tier verifier)
docs/research/llm-shield/evidence/stage-4a-lite/
  authority-decisions.json                  (per-action records, model-free corpus)
  authority-decision-summary.json           (aggregate by family/verdict)
  authority-vca-bundle.json                 (the signed bundle)
  authority-vca-bundle.sig                  (Ed25519 signature)
  public-key.json                           (4A public key)
  manifest.json                             (digest binding to 37f2de0 + provenance)
  RESULTS.md                                (honest writeup + non-claims)
```

The Stage 4A **private key is never committed.**

---

## Acceptance criteria (all must hold)

1. Exhaustive differential old-vs-new gate tests pass.
2. `src/llmShield` diff is empty.
3. Signed model-free authority-decision corpus artifact + two-tier verifier exist.
4. Verifier **rejects**: tampered decision rows, edited metrics, wrong key, and
   digest mismatch against frozen 1-LIVE evidence.
5. Manifest digest-binds the frozen 1-LIVE authority result at commit `37f2de0`.
6. RESULTS.md states explicitly that the live trajectory was **outcome-recorded,
   not per-action recorded**, and that the pod/model was **not re-run**.
7. Non-claims include **"not a live per-action replay,"** not jailbreak immunity,
   and that the taxonomy excludes non-destructive mutation / financial / code.
8. Stage 4A private key is never committed.
9. Headline equivalence is preserved: the live `9/140 → 0/140` (inside the
   declared taxonomy) is inherited *through differential equivalence only*.
10. `authority_decision_summary.requires_confirmation_count == 0` — no
    confirmation-flow evidence is claimed in this stage (the verdict exists in the
    type for forward-compatibility but is never emitted in 4A-lite).

## Explicit non-goals for this stage

- No new action families (egress + destructive_mutation only).
- No `user_task_8` over-block fix.
- No `src/llmShield` change / no production gateway capability-kernel claim.
- No live model re-run; no live per-action replay claim.

## Forward-compatibility (designed for, not built now)

- **B (next):** replace blunt task-string grounding with typed intent-sources
  (`explicit_user_request | current_meeting_participants | selected_contact_group`)
  as a new `grounding_source` policy — recovers `user_task_8` without touching
  kernel mechanics.
- **C (later):** add `financial | code | secret` families as new `Policy`
  instances + records; ideally with live signal before any containment claim.

## Non-claims (carried into RESULTS.md and the paper)

- Not jailbreak immunity; not injection prevention.
- Not a live per-action replay; the signed per-action evidence is over a
  deterministic model-free corpus.
- The live result is inherited only through differential equivalence to the gate
  that produced the frozen evidence, not through replay of the live model or
  reconstruction of live per-action traces.
- Taxonomy excludes non-destructive mutation, financial, and code actions.
