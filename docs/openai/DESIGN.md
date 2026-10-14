# OpenAI reviewer workflow design

Date: 15 October 2026 (Australia/Sydney). Status: implementation brief derived from the
owner's supplied readiness request, not a new frozen research stage.

## Question and scope

Can an agent's proposed tool action cross an explicit capability boundary when task-adjacent
untrusted text asks it to do so, and can a reviewer independently recompute the bounded outcome?
Success requires an observable forbidden effect in a deliberately vulnerable control, useful
allowed effects under enforcement, and denial of forbidden effects under enforcement. Execution
errors and model refusals must remain distinct from successful containment.

The existing repository contains thousands of research, fixture, and evidence files. This change
adds a small reviewer workflow and a scoped claim/security audit; it does not certify every file
or every released claim. The separate primary prompt named in the supplied text was not provided.

## Chosen implementation

Add `tools/openai-readiness/` and `tests/unit/openaiReadiness/`. A fixed synthetic corpus separates
trusted task policy and approval records from the prompt and untrusted retrieved content. Both
offline fixtures and the opt-in Responses API produce the same proposed `{name, arguments}`
action. A trusted local registry derives the historical Simurgh gate's tool class; the model
cannot select its own class. The new boundary additionally checks exact arguments, resource and
approval scope before executing controlled local effects. No arbitrary shell or network tool is
available. A consequence oracle examines the sandbox's actual effects separately from the gate
decision. This is an instrument experiment, not a measured OpenAI model evaluation.

The alternative of extending the historical gateway would entangle this experiment with live
budget and legacy authentication behavior. A documentation-only package would lack a falsifiable
demonstration. The isolated runner makes the new claim and its limits reviewable while preserving
the released work. It is a direct Responses API integration, not an Agents SDK integration.

## Artifacts and verification

The offline report binds the scenario corpus, implementation bytes, decisions, effects and
recomputed metrics. A fresh Ed25519 signature provides tamper evidence for that envelope. An
embedded public key establishes internal consistency only; independently pinned identity is a
separate trust decision. The private key must never be written into the report. Reproduction
compares the deterministic payload, not randomized signatures. Verification must reject missing,
duplicated, reordered or unknown cases and changed payloads instead of trusting reported totals.

## Live boundary

Live calls require an explicit CLI opt-in, an owner-selected model and an API key. One bounded
Responses API request proposes one tool call; `store:false`, finite output and timeout limits,
no redirects and no automatic retries constrain the request. Raw secrets and provider error
bodies are never logged. Hosted Evals is not a dependency. No live call, paid experiment or
external submission is authorized by this implementation task. Live evidence is not equivalent
to replaying a model, and a local approval fixture is not evidence of human deliberation.

## Implementation and validation sequence

1. Verify official API and grant sources; inventory repository constraints and claim anchors.
2. Add tests for the boundary, adapter, controls, artifact integrity and CLI failure behavior,
   then implement the smallest isolated workflow that satisfies them.
3. Preserve the old README and device roadmap verbatim; update reviewer entry points, package
   description and security scope; write proposal, claim audit and owner submission checklist.
4. Independently review the new code, run the offline workflow twice, verify/tamper-check its
   artifacts, and run the repository unit suite. Record exact outcomes and unrun checks.

## Gate lifecycle

- **active_phase:** development and review of this additive OpenAI readiness workflow.
- **protected_surface:** the new corpus, boundary, adapter, report verifier and their tests;
  published signed evidence and historical frozen stage specifications remain untouched.
- **next_phase_behaviour:** additional cases or semantics require a new corpus/schema version
  and an explicit new baseline; old results keep their original bounded interpretation.
- **maintenance_behaviour:** verify actual case identities, contents and source digests, not a
  hard-coded aggregate test count; report current tests and failures honestly.
- **sunset_or_migration_condition:** a replacement benchmark must document how its authority,
  effect oracle and artifact schema differ before claiming continuity.
- **anti_vacuity_condition:** empty/missing cases, no observed effect in the vulnerable control,
  no allowed effect under enforcement, execution errors, or failed verification cannot pass.

## Owner review boundary

The relocated historical README retains its original bytes. The existing documentation
allowlist in `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` admits only that exact
archive, guarded by its original SHA-256; the raw-code detection regex and other assertions
remain unchanged. This is documentation relocation compatibility, not a repaired historical
verifier or a changed research result. The initial full test run demonstrated the relocation
failure before this bounded test-maintenance change.

All changes remain local for owner review. No push, merge, publication, submission, license
change, eligibility certification or resource expenditure is part of this change. The grant
application uses proposed budget scenarios and milestones rather than invented commitments.
