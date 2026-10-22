# Phase 2: approved report delivery across isolation and recovery

Status: implemented and locally verified, 15 October 2026 (Australia/Sydney).
Design commit `a52c5bd1`; matrix preregistration `57b10145`; hosted CI pending push.
This executes step 2 of the [gap map](SIMURGH_GAP_MAP_2026-10-15.md).

## Question and scope

Can a native SDK workflow deliver an exactly approved report to a separate sandbox
inbox, contain unauthorized proposals, and preserve uncertainty across a killed
sender? This is an engineering experiment with scripted SDK proposals, synthetic
operator identities and a local connector. It is not a model benchmark, enterprise
IAM integration, real email delivery, or evidence about preventing a public incident.

The OpenAI Agents SDK runs in the trusted host with tracing disabled. Its native
approval interruption must occur before any tool callback. Approval here is a
host-owned test decision, not a human-in-the-loop usability result. Every callback
launches a scrubbed child and installs the existing Linux x86_64 seccomp profile
before processing its proposal. No path or network capability is granted to that
worker; its bounded output is an untrusted proposal, never authority. SDK internals,
Python imports/bootstrap, kernel, parent and connector remain trusted.

The host binds the full action (id, run, principal, tenant, operation, destination in
resource, exact content, policy revision) to a persisted approval. Discovered strings
and model-supplied identities cannot mint grants. Only a dedicated sandbox-inbox
connector is supported. It runs in a separate process on ephemeral loopback HTTP,
requires a fresh host-only credential and commits idempotent inbox rows to SQLite.
The fixture is an owned local service, not an external provider impersonation.

## Contracts declared before results

- Controls: `enforced`, `bypass` (authority intentionally disabled, isolation retained),
  `deny_all`. None is a production configuration. Unknown controls fail closed.
- Exact content release: destination AND bytes must match approval; approving a
  channel alone is insufficient. Unknown/extra fields and malformed JSON are invalid.
- Host identity binds run, principal and tenant; approval is exact and single-action.
  Revision mismatch, missing approval and persisted revocation prevent new dispatch.
- Revocation serializes with dispatch using a local SQLite writer lock. An already
  dispatched action may commit before revocation returns; no remote cancellation claim.
- A durable pending intent precedes dispatch. Receiver receipt and effect share one
  transaction and idempotency key; conflicting payload reuse refuses. A killed sender
  may leave `unknown`. Recovery queries the connector; it NEVER blindly resends.
  Receiver absence is `not_observed`, not proof that a future effect is impossible.
  Unavailable/invalid observation remains `unknown`. Retry is an explicit operation
  that rechecks current authority and reuses the same idempotency key.
- Refusal, invalid output, blocked proposal, unknown outcome, observed effect and useful
  completion remain distinct. Missing prerequisites produce a failing command, not a
  passing/empty report. No provider API calls or API keys are required.
- Receiver SQLite inspection is separate from tool output but on the same trusted
  machine, not an independent organization or remote attestation.

## Implementation plan and review focus

1. Write failing tests for exact approval/identity/content, connector authentication,
   idempotency conflicts, revoked retries and recovery states; implement `core.py` and
   `receiver.py` under new `tools/assurance-connector/`.
2. Write failing native interruption/isolation tests; implement the launcher/worker
   and SDK integration, importing historical components without changing them.
3. Freeze a named case matrix with useful, cross-tenant, unapproved destination,
   content relay, discovered credential, revision and approval failures; execute all
   three controls. Add actual SIGKILL probes before dispatch and after receiver commit,
   receiver-unavailable recovery and retry after revoke. Preserve every row.
4. Add source-bound report generation/verification, tamper and nonempty-inventory tests,
   reviewer instructions and a short presentation. Run focused and full repository
   tests, then a fresh read-only reviewer and a single test-first repair pass.
5. Commit and push the existing `openai-readiness` branch. No merge or deployment.

Review focus: credential leakage into workers; approve/proposal identity confusion;
recovery incorrectly reporting success or resending; content and idempotency conflicts;
malformed response handling; resource/timeout cleanup; vacuous reports; claims that
exceed local synthetic evidence. Remote ordering, compromised host, DNS/TLS, arbitrary
SDK code sandboxing and multi-user identity federation are outside this experiment.

## Allowed changes and lifecycle

New namespace: `tools/assurance-connector/**`, `docs/research/connector-phase-2/**`,
and this record. Navigation: README, reviewer index and ROADMAP. Integration:
package.json, `.github/workflows/openai-readiness.yml`. Both AGENT.md and CHANGELOG.md
receive dated entries. The mutable Stage 5Q Q1 current problem-gate set may be
re-derived if CI integration changes classifications; immutable baseline is untouched.
No historical runtime, source-bound input, signed evidence or prior result is edited.

| Field                         | Declaration                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Connector phase 2                                                                                                                     |
| protected_surface             | New connector source/tests and named protocol/report; imported files bound by SHA-256                                                 |
| next_phase_behaviour          | Verify this report unchanged; later studies use new protocols and result paths                                                        |
| maintenance_behaviour         | Declare exact repair scope in a prior commit; add successor evidence rather than overwrite measurements                               |
| sunset_or_migration_condition | Explicit versioned successor with retained original replay                                                                            |
| anti_vacuity_condition        | Exact case × control set, observed useful effects, unsafe bypass controls, actual killed processes, source hashes and report equality |

## Execution ledger

- Preflight: clean `openai-readiness`; phase 1 source/evidence retained. Existing pinned
  workflow Python environment reused; cloud onboarding requires no configuration update.
- Ruling: implement one local inbox connector with synthetic authenticated host identities
  rather than claim enterprise IAM; this tests G14–G17 mechanisms but leaves deployment
  integration open. Cost: results do not transfer automatically to real vendor APIs.
- Interfaces: native SDK action → isolated worker → host authority → receiver effect;
  exact action serialization and receiver idempotency are shared contracts. Pending
  state → recovery must not authorize dispatch. Tests cover both interfaces.

- Task 1: six host/receiver tests failed on missing feature, then passed against real
  authenticated HTTP and SQLite effects. Task 2: four integration tests failed before
  the workflow existed, then passed; native interruption, mandatory worker and two
  actual SIGKILL boundaries executed. Raw logs retained outside the checkout.
- Matrix declared before execution in `connector-phase-2/protocol.json`: 13 named
  cases × three controls (39 rows), plus four recovery observations. Two useful tasks,
  nine unauthorized proposals, one invalid argument and one native refusal per control.
  SDK fixtures are author-written and deterministic; this cannot estimate model risk.

- Task 3: all 39 declared rows and four recovery observations passed. Added a failing
  assertion requiring kill probes through the native SDK, then extended the fixture;
  both native callback kill boundaries pass. Thirteen focused tests pass, including
  full replay, omitted-row tamper, overwrite refusal, bad receipt and revocation order.
- Task 4: integrated commands into the existing workflow-recovery gate. Current census
  remains set-identical at 39 entries; no census pin or historical input was modified.
  Full npm suite and fresh review are in progress; final evidence file is not yet sealed.
- Ruling: use a narrow stdout proposal channel from the isolated child, with no network
  descriptor; the trusted SDK/host alone owns connector authentication. This satisfies
  mandatory worker isolation while keeping the SDK outside the sandbox. Cost: no claim
  about containing arbitrary SDK extensions or a compromised trusted orchestrator.

- Fresh read-only review: malformed HTTP status escaped `unknown`; unbounded pipe
  capture/descendant cleanup was insufficient for an adversarial worker; author's
  typed-evidence probe accepted `true`→`1`. No unauthorized effect or false success
  was demonstrated in the HTTP case. Current JSON-only worker could not trigger the
  resource case; reviewer used a substitute fixture under the actual seccomp profile.
- Repair pass: failing malformed-HTTP and typed-evidence regressions plus missing bounded
  runner tests precede implementation. Normalize HTTP/parser errors; compare typed
  canonical JSON; bound combined captured output to 16 KiB, enforce wall timeout and
  kill the owned process group, including filtered descendants. Frozen kernel unchanged.
- Ruling: strengthen the launcher rather than narrow the untrusted-worker claim. This
  closes capture/cleanup gaps, not CPU, memory or process-count denial of service.
  Those resource quotas remain outside this experiment; cost of misunderstanding is
  assuming availability protections that have not been tested.
- CI timeout rises from 20 to 30 minutes for the shared workflow-recovery job: the
  previously measured roughly 18-minute job now also executes the connector replays.
  Existing gate identity and its census classification remain unchanged.

- Final repair verification: 17 focused tests passed; full npm 5,122 passed, zero failed,
  three existing Chrome/Lean prerequisite skips. Saved report freshly replays exactly:
  39 rows, four recovery observations and 16 source hashes. Protocol bytes unchanged.
  All 94/19/27/34 historical safety/HF source hashes remain intact. Ruff, pip check,
  authored-doc formatting, census set equality and diff checks pass. Broad artifact
  formatting check flagged canonical report and preregistered protocol formatting;
  these bytes are intentionally retained, not rewritten to satisfy cosmetic tooling.
- Final review disposition: both reviewer findings and the author's typed-evidence
  finding addressed; no deferred minor findings. Review exclusions (real IAM/vendor
  behavior, distributed ordering, TLS/DNS, compromised host/bootstrap, SDK extensions,
  outside attestation and full-repository security) remain explicit limits, not claims.
- Local completion: scope and matrix declared first; tests-first implementation;
  controls and native crash observations executed; one fresh review and repair pass;
  source-bound report, reviewer guide, presentation and CI hooks delivered. No model
  inference or secret access. Phase 3 and outside reproduction remain future work.
