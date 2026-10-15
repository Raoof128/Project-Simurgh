# Hardening successor: reviewer guide

This package implements the first phase of the [gap map](../SIMURGH_GAP_MAP_2026-10-15.md).
It combines narrow application-boundary changes with separately versioned replacements for
known fixture weaknesses. It is ready for review as a local research implementation, not a
production agent security platform. The [design and ledger](../HARDENING_PHASE_1.md) describe
the exact scope; the [presentation script](PRESENTATION.md) keeps the claims bounded.

The [verification record](verification.json) reports 5,122 passing npm tests with three
prerequisite skips, 17 successor tests and 15 replayed demonstration checks. Seven server
tests are included in the npm total. These counts describe different checks and must not
be added into a research success rate. Hosted status is revision-specific and recorded
separately from local verification.

## Run the demonstration

Use the repository root, Python 3.12 and Node.js 24 on Linux. This demonstration needs
neither model weights nor API keys; its network activity is disposable loopback only.

```bash
npm ci
npm run test:hardening
node --test tests/unit/securityHardening.test.js
npm run assurance:hardened -- --out /tmp/simurgh-hardening-new.json
npm run assurance:hardened -- --verify /tmp/simurgh-hardening-new.json
npm run assurance:hardened -- --verify docs/research/hardening-phase-1/report.json
```

Choose a new output path. The writer refuses existing files; verification reruns the
checks and compares the complete result, source hashes and case inventory. These are
software regression checks with synthetic effects, not independent trials or a new
model safety percentage. The verifier shares the implementation and host with the
demonstration. An operator capable of altering both code and records can forge them.

The examples write an outbox record and delete an explicitly authorized temporary draft;
they send no email and delete no user files. The gateway uses synthetic tokens and a
temporary SQLite database. Its network framing comes from the historical fixture; the
successor changes only task configuration and the authorization/effect transaction.

## Findings disposition

| Gap     | Current disposition                                                                                                                                                                      | What remains                                                                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01/G02 | Successor exact-action authority rejects destination substitution, extra recipient fields, wrong deletion targets, unknown tools and missing grants; useful local effects still complete | Historical AgentDojo adapter remains unchanged and unsafe for these uses. The new authority must be constructed by a trusted host; it is not a natural-language intent classifier or production connector. |
| G03     | Mounted gateway session creation uses instructor authorization outside explicit demo mode; existing session-token/path checks protect execution                                          | Single-operator authorization, not per-human tenancy or organizational IAM. Demo mode intentionally keeps mock access public.                                                                              |
| G04     | Mounted legacy live gateway returns 410 before its old router, even with live configuration enabled                                                                                      | The old quota/retry code is not repaired or certified. There is no replacement live-provider service in this phase. The distinct opt-in OpenAI research CLI is unaffected.                                 |
| G05     | Legacy affinity ingestion, simulator and read routes return 410 before reaching the old collector/storage/projections                                                                    | Old native helper remains historical; prior exports are not erased. This does not validate native device privacy or change the modern daemon-proof pipeline.                                               |
| G06     | Separately named strict wrapper stops on failed diff/parity/Lean and reports missing Lean as incomplete                                                                                  | Shell control flow is tested with disposable command fixtures. This phase does not rerun all historical Stage 5L proofs or regenerate signed evidence.                                                     |
| G07     | Strict JSON/numeric prevalidation rejects duplicate keys, non-finite constants, exponent overflow and invalid timing types; published finite captures remain accepted                    | Numeric prevalidation supplements the historical source/journal/token verifiers. It cannot authenticate inference or model provenance.                                                                     |
| G08     | Missing, unknown and broad implicit task modes are rejected before database/socket creation                                                                                              | Only the explicitly named report and handoff modes are implemented.                                                                                                                                        |
| G09     | SQLite write lock precedes grant lookup; event and report/handoff effect commit together; revocation serializes on the same database                                                     | Applies to these local SQLite effects. No cancellation of prior effects, remote transaction, power-loss claim or general exactly-once guarantee.                                                           |

The old gap-audit probe still reproduces historical behavior. That is expected: its
baseline and published results are preserved. Use this successor's tests to evaluate
the new behavior instead of editing the old probe to produce a better result.

## Compatibility changes

Non-demo clients must create gateway sessions with the configured instructor bearer
token, then use the returned session bearer for that session's mock/recorded requests.
This is the existing operator identity, not a new secret configuration. Do not use a
query-string token. Demo mode is explicitly non-production.

Legacy live gateway requests and affinity clients receive HTTP 410 with stable error
codes `legacy_live_gateway_retired` and `legacy_affinity_retired`. Updating authentication
does not restore those paths. Frozen historical smokes that expect these retired
endpoints must run at their original revisions; do not describe their old behavior as
current support. `npm start` remains the historical application entry point with these
new boundary restrictions; the presentation demonstration has its own npm command.

The strict Stage 5L wrapper is invoked with
`bash scripts/reproduce-llm-shield-stage5l-strict.sh --disposable-checkout` **only in a
disposable checkout**. The explicit flag acknowledges that its generator can change
that checkout's evidence. It is not automatic filesystem isolation. Missing Lean exits
77; missing acknowledgement exits 64; a required failing command exits nonzero. No
success is claimed merely because a prerequisite was skipped.

## Next evidence required

The main remaining work is G10–G27: reliable native model interfaces, held-out adaptive
tasks, one authenticated end-to-end connector, broader recovery/monitoring, fair baselines
and independent operator reproduction. This phase does not improve the earlier 4/8
native Llama validity result or raise historical coverage percentages. A larger model
or more scripted cases alone cannot resolve these gaps.
