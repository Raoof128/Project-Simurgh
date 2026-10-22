# Research roadmap

**Status reviewed: 21 October 2026.** The active track is host-controlled agent authorization
with replayable evidence. This roadmap separates completed local work from experiments that
still need new inputs. It is not a delivery-date or production-readiness commitment.

## Completed and inspectable

| Work                              | Evidence                                                                                                                                                  | Important limit                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Two-model lifecycle comparison    | [Phase 17 results](docs/research/transfer-phase-17/RESULTS.md): 288 branches; Llama restricted effects 17/24 → 0/24 while active completion remains 23/24 | Internally authored known families; Luna already has a zero-effect baseline                       |
| Corrected live Responses workflow | [Role correction](docs/research/provider-role-phase-17b/RESULTS.md): 2/3 authorized completions, 5/5 restricted declines                                  | One active refusal remains; the original eight declines are retained                              |
| Paced local reliability           | [Phase 17 validation](docs/research/transfer-phase-17/VALIDATION.md): 120 fixtures, 1,200 snapshots                                                       | Fixed policy time and isolated services; not a production load test                               |
| Local credential-lifecycle review | [Phase 8 follow-up](docs/research/PHASE_8_REVIEW_2026-10-19.md): completed scoped local review and replay                                                 | Trusted host assumptions; not an outside security assessment                                      |
| Human dashboard and agent CLI     | [Explorer](tools/simurgh-explorer/README.md): shared queries, imports/exports, failure and unknown inspection                                             | 288 transfer branches plus selectable historical view; no archive verification or live web search |
| Base, E2E and supplemental checks | [Full smoke validation](docs/research/smoke-validation-2026-10-19/RESULTS.md): 142/142 base steps, 32/32 E2E steps, 580 E2E tests                         | Exact implementation and environment recorded; strict browser parity remains blocked              |
| Native platform checks            | [Latest native receipt](docs/research/smoke-validation-2026-10-19/RESULTS.md): 10 macOS tests, 11 Windows tests and fixture build                         | No interactive desktop capture or managed deployment validation                                   |

The [integration matrix](docs/INTEGRATIONS.md) identifies the implemented surface, runtime and
unsupported extension for each component. The [reviewer guide](docs/REVIEWER_INDEX.md) routes
readers through both current and earlier evidence without mixing study denominators.

[21 October repairs](docs/readiness-2026-10-21/RESULTS.md) add Stage 4M public bindings,
current-study browsing and fail-closed harness checks. The new live diagnostic stopped on HTTP 401;
provider administration returned 403. The original active refusal remains unresolved.

## Next evidence, in priority order

| Priority | Deliverable                                 | Acceptance evidence                                                                                                 | Required input                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1        | Independent replay of current evidence      | Separate operator receipt with pinned source/root, all command exits, disagreements and retained logs               | Owner-arranged classmate; [handoff](docs/research/CONTINUATION_HANDOFF_2026-10-19.md) |
| 2        | Browser and accessibility validation        | Real browser rendering, keyboard/focus/zoom/contrast checks; strict parity exit 0 with `three_runtime_parity: true` | Host whose browser policy permits local fixtures; do not bypass managed policy        |
| 3        | Externally authored transfer cases          | Freeze cases and scoring before capture; retain all attempts and utility/containment controls                       | Independent case custodian, selected model families and bounded authorized budget     |
| 4        | Owned provider identity and alert lifecycle | Authenticated alert fetch, rotation/revocation/session tests and independently checked receiver effects             | Owned provider test project and lifecycle permissions; no secrets in documentation    |
| 5        | Representative operational reliability      | Defined topology, load/duration, wall-clock leases, queues, recovery and incident ownership                         | Representative owned service and measurable acceptance targets                        |
| 6        | Real-trace data handling review             | Field-level purpose, access, retention/deletion and disclosure review                                               | Authorized data owners and reviewer consent                                           |

These are distinct acceptance conditions. Passing a same-code replay cannot establish original
independent custody; obtaining a second key cannot establish a second operator. Already admitted
work and prior unknown-acknowledgement effects cannot be represented as prevented actions.

## Earlier milestones and frozen limits

The [15 October gap map](docs/research/SIMURGH_GAP_MAP_2026-10-15.md),
[16 October needs review](docs/research/OPENAI_NEEDS_2026-10-16.md) and
[explorer gap register](docs/research/explorer-phase-18/RESEARCH.md) are dated research snapshots.
Their “next,” “open” and “unrun” labels must be read at those revisions. The
[documentation errata](docs/documentation-audit-2026-10-19/ERRATA.md) maps superseded statements
to subsequent evidence. Earlier model captures, incident simulations and recovery experiments
retain their own controls and denominators.

Historical attestation research through `v2.54.1` remains available in
[RESEARCH_HISTORY.md](RESEARCH_HISTORY.md). Stage 5Q coverage remains 1,438/23,332 (6.2%);
Stage 5R adds zero discharged cells; Stage 5S witness independence remains unproven. New agent
experiments do not change these measurements. The original device roadmap is preserved exactly
in [DEVICE_ROADMAP.md](DEVICE_ROADMAP.md); application package version `0.4.18` is a separate line.

The [grant proposal](docs/openai/PROPOSAL.txt) remains an owner-review draft. Existing live results
are evidence available to a future application, not approval of its budget, eligibility or submission.
Use the [current primary-source map](docs/documentation-audit-2026-10-19/SOURCES.md) for applicable
2026 guidance. Standards alignment requires evidence for each requirement; no universal compliance,
external endorsement or funding outcome is asserted.
