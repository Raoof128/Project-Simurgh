# Reviewer guide

**Reviewed: 19 October 2026.** Begin with a falsifiable question: does the local authorization
boundary prevent new unauthorized effects while retaining useful work, and can the recorded
outcomes be checked against receiver state?

## A short review

1. Read the [README](../README.md), [transfer results](research/transfer-phase-17/RESULTS.md)
   and [role-correction results](research/provider-role-phase-17b/RESULTS.md).
   Check the Llama utility/containment tradeoff, Luna's zero baseline and the unresolved active refusal.
2. Run the [credential-free replay](../README.md#replay-the-evidence) from a full-history checkout.
   Check expected archive roots through a trusted channel. Replay verifies supplied records under
   their declared source and trust model; it does not prove independent capture provenance.
3. Use the [dashboard or CLI](../tools/simurgh-explorer/README.md) to inspect all **288 transfer-study branches**,
   separated by model. `--study phase10` selects the earlier 144-outcome dataset. Source verification
   remains separate. See the [21 October repair report](readiness-2026-10-21/RESULTS.md).
4. Inspect [latest smoke validation](research/smoke-validation-2026-10-19/RESULTS.md), including
   original failures, repaired runs, exact source revisions and the strict browser-parity failure.
5. Challenge the [integration boundaries](INTEGRATIONS.md), [security](../SECURITY.md),
   [privacy](../PRIVACY.md) and [remaining work](../ROADMAP.md). Use the
   [independent operator handoff](research/CONTINUATION_HANDOFF_2026-10-19.md) for reproduction.

## Current evidence and how to interpret it

| Question                                                   | Evidence                                                                                                    | What it establishes                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does composition help on the latest captured proposals?    | [Transfer comparison](research/transfer-phase-17/RESULTS.md)                                                | Llama 17/24 → 0/24 restricted new-effect trials, 23/24 active completions retained; Luna 24/24 active and zero restricted effects in both useful controls   |
| Does the live Responses workflow complete authorized work? | [Separate role correction](research/provider-role-phase-17b/RESULTS.md)                                     | 2/3 authorized completions and 5/5 restricted declines; one authorized refusal remains                                                                      |
| Can retained state be checked?                             | [Runbook](research/transfer-phase-17/RUNBOOK.md) and [validation](research/transfer-phase-17/VALIDATION.md) | Source-bound local replay, storage checks and deliberate evidence mutations; not independent custody                                                        |
| What passed most recently?                                 | [Full smoke report](research/smoke-validation-2026-10-19/RESULTS.md)                                        | 142 base steps, 32 E2E steps, 5,171 root tests and supplemental suites at recorded revisions; excludes opt-in provider campaigns and blocked browser parity |
| Was Phase 8 reviewed?                                      | [19 October review](research/PHASE_8_REVIEW_2026-10-19.md)                                                  | Completed scoped local manual review, 24 tests and 46-row replay; earlier interrupted-review wording is historical                                          |
| What does the explorer verify?                             | [Explorer guide](../tools/simurgh-explorer/README.md)                                                       | Shared presentation/query semantics; imported bundles remain `not_verified_by_explorer`                                                                     |

The initial 13-job hosted result at `4afe9538`, the native result at `fbe06eca`, and the newer
native run at `2cf8ad69` are different receipts. The latest Linux implementation tested is
`ebf2a752`. Documentation changes do not make those results current-head executions.

## Study-by-study reading order

Each row points to an independently scoped study. Counts must not be added into a combined
benchmark or reused as another study's denominator.

| Stage or phase                  | Record                                                                                                                                                                                                 | Reading boundary                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Initial OpenAI instrument       | [Evaluation](openai/EVALUATION.md), [readiness](openai/READINESS_REPORT.md), [claim audit](openai/CLAIM_AUDIT.md)                                                                                      | Deterministic single-call synthetic demonstration; later live-model studies are separate                        |
| Real effects and SDKs           | [Lab](assurance/README.md), [SDK](assurance/sdk/README.md)                                                                                                                                             | 51 lab rows and 102 SDK matrix rows; same authored fixture, not independent evaluation                          |
| Durable effects and connectors  | [Durable](assurance/durable/README.md), [Redis](assurance/redis/README.md), [workflow](assurance/workflow/README.md)                                                                                   | 26/19/24 named cases respectively; limited local restart and reconciliation contracts                           |
| Incident-derived containment    | [Scope](assurance/scope/README.md), [egress](assurance/egress/README.md), [isolation](assurance/isolation/README.md)                                                                                   | 54/36/57 rows; retained relay/mailbox/content-release failures, not prevention of real incidents                |
| Initial model/interface results | [Meta pilot](assurance/meta/README.md), [Meta study](assurance/meta-study/README.md), [Luna comparison](assurance/openai-comparison/README.md), [native Luna](assurance/openai-native/README.md)       | Preserve failed interfaces and zero-baseline limits; native workflow records 69/72 completions                  |
| Synthetic safety and HF study   | [Safety](assurance/safety-study/README.md), [incident](assurance/hf-incident/README.md), [composed containment](assurance/hf-containment/README.md), [native successor](assurance/hf-native/README.md) | Scripted boundary tests and model-driven outcomes are separate; synthetic cases are not an external benchmark   |
| Phase 1–2                       | [Hardening](research/hardening-phase-1/README.md), [connector](research/connector-phase-2/README.md)                                                                                                   | Retired legacy entry points and owned-service composition; historical internals remain preserved                |
| Phase 3–4                       | [Local model study](research/model-phase-3/README.md), [reproduction](research/reproduction-phase-4/RESULTS.md)                                                                                        | 540 branches; 90/90 benign, 59/90 attacked completion; 763 retained replay snapshots                            |
| Phase 5–6                       | [Recovery](research/recovery-phase-5/RESULTS.md), [signals](research/signals-phase-6/RESULTS.md)                                                                                                       | 39 recovery rows plus three in-flight drills; 44 signal rows; no live provider-alert validation                 |
| Phase 7–8                       | [Context](research/context-phase-7/RESULTS.md), [credentials](research/credentials-phase-8/RESULTS.md)                                                                                                 | 36/46 rows and 108/92 snapshots; bounded host-owned authority and synthetic lifecycle tests                     |
| Phase 9–10                      | [Composition](research/composition-phase-9/RESULTS.md), [local Llama](research/model-composition-phase-10/RESULTS.md)                                                                                  | 40 scripted rows; separate 144-branch model study with active 22/24 and restricted effects 16/24 → 0/24         |
| Phase 11–12                     | [Handoff](research/handoff-phase-11/README.md), [presentation](research/presentation-phase-12/README.md)                                                                                               | Historical Phase 10 packaging and gap statements                                                                |
| Phase 13–14                     | [Reliability](research/reliability-phase-13/RESULTS.md), [reduced export](research/export-phase-14/RESULTS.md)                                                                                         | 60 local fixtures and all 144 Phase 10 outcomes; reduced data does not prove anonymity                          |
| Phase 15–16                     | [Validation](research/validation-phase-15/RESULTS.md), [maintenance](research/maintenance-phase-16/RESULTS.md)                                                                                         | Earlier exact-environment failures and repairs; do not substitute their browser receipt for today's blocked run |
| Phase 17 and correction         | [Transfer](research/transfer-phase-17/RESULTS.md), [correction](research/provider-role-phase-17b/RESULTS.md)                                                                                           | Latest two-model, live-role and 120-fixture reliability results                                                 |
| Local continuation              | [Phase 8 review](research/PHASE_8_REVIEW_2026-10-19.md), [explorer](../tools/simurgh-explorer/README.md), [smoke](research/smoke-validation-2026-10-19/RESULTS.md)                                     | Merged branch follow-up; local phase numbers overlap the provider track, so cite full paths                     |

The older HTML verifiers under `tools/simurgh-attestation/` have different, sometimes partial,
verification contracts. Source review found blocked inline entry points, missing upload flows and
unsafe HTML rendering in specific pages. Use the stage's authoritative CLI for verification and
consult [the per-page findings](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m34--archived-browser-pages-are-not-interchangeable-verifiers)
before opening historical pages. The separate [Stage 4M evidence page cannot parse](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m54--the-archived-stage-4m-browser-verifier-cannot-parse)
because its module repeats a lexical declaration; its generated-byte parity claim does not
establish a functioning browser verifier. These pages are separate from the maintained evidence explorer;
that explorer displays imported data and does not authenticate it.

The legacy academic and pilot pages directly under `public/` also retain obsolete helper paths,
misleading status/privacy copy and a verdict-rendering mismatch. See
[their specific corrections](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m35--legacy-public-page-claims-and-current-routes).
Use the maintained explorer for the current dashboard demonstration; the historical pages are
not a current participant-study or working exam-interface handoff.

Historical research briefs also require the [claim corrections](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m40--historical-briefs-require-bounded-claims-and-complete-verification-inputs):
distinct keys are not independent approval, a signature does not prove execution truth, and
completeness is bounded by declared participants and instrumented boundaries. The preserved
Stage 3R adapter has an [empty-refusal fallback mismatch](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m43--historical-provider-fallback-contract-does-not-match-all-response-shapes);
the current mounted legacy live route remains retired with HTTP 410.

The archived Stage 5P independent bundle also needs the [standalone-verifier corrections](documentation-audit-2026-10-19/MANUAL_REVIEW.md#m58--stage-5ps-standalone-bundle-checks-less-than-its-guide-promises):
its passing result does not enforce manifest presence, the full pair census or checkpoint-signature
authentication. Preserve these limits when interpreting its historical reproduction receipt.

## Historical and supporting material

| Collection                                                                                              | How to read it                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Documentation guide](../DOCUMENTATION.md) and [audit ledger](documentation-audit-2026-10-19/README.md) | Current routes, per-file scope, corrections and unresolved review limits                                |
| [Research history](../RESEARCH_HISTORY.md), [device roadmap](../DEVICE_ROADMAP.md)                      | Exact archived entry points; old scores and temporal labels are historical                              |
| `docs/research/llm-shield/`, `docs/superpowers/`                                                        | Stage-specific frozen specs, plans, closeouts, evidence and authority; no global readiness claim        |
| `docs/stages/`, [research programme](RESEARCH_PROGRAMME.md), `papers/`                                  | Device-track history and manuscript snapshots; publication does not establish peer review or acceptance |
| [Agent log](../AGENT.md), [change log](../CHANGELOG.md)                                                 | Append-only activity records; old follow-ups can be superseded by later evidence                        |
| [Wiki](../wiki/index.md)                                                                                | Index/log scaffold; no populated claims or decisions collection                                         |

Use [CONTRIBUTING.md](../CONTRIBUTING.md) for changes. Use the
[primary-source map](documentation-audit-2026-10-19/SOURCES.md) for standards and vendor guidance.
Neither a passing test count, a signature, a source citation nor this documentation audit certifies
scientific novelty, human deliberation, production security or regulatory compliance.
