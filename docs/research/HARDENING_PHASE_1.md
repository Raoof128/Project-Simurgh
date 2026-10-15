# Hardening phase 1: presentation-safe research entry points

Scope approved by the request to proceed on the 15 October gap map. Baseline:
`bdb737fd932ef44b2730337cbb1f5acf06cbc994`. This is implementation of the first
recommended phase, not completion of all 27 items or external validation.

## Design and boundaries

1. At the mutable `server.js` conductor, require existing instructor authentication
   for historical gateway session creation outside explicit demo mode. Retire the
   mounted live-provider gateway before entering its frozen router, regardless of live
   environment flags. Existing mock/recorded research remains available. The separate
   explicitly opted-in OpenAI research CLI is unaffected. This removes the exposed
   billable path; it does not repair historical quota accounting or make a new live API.
2. Retire all legacy `/api/affinity` endpoints with HTTP 410 before ingestion/read-back.
   The old native helper remains historical and unsupported. Do not claim native privacy
   remediation or modify device binaries without their platform validation.
3. Add `tools/assurance-hardening/` as a separately versioned successor: immutable,
   structured exact-action authority for synthetic send/delete actions; strict finite
   capture prevalidation; explicit HF task configuration; and a SQLite write transaction
   spanning grant lookup, event and report/handoff effect. Trusted host configuration
   creates authority; model text never does. Revoke and dispatch serialize on the same
   database. Effects authorized before a revoke may commit before it; once revocation
   commits, later transactions cannot create an effect. This covers SQLite effects only.
4. Add `scripts/reproduce-llm-shield-stage5l-strict.sh`, preserving the historical wrapper.
   Required checks must fail the process; missing Lean is an incomplete run, not ALL PASS.
   Run destructive regeneration only in a disposable checkout. Test shell behavior in
   disposable fixtures, not against signed evidence in the working checkout.
5. Ship a key-free demonstration and a presentation guide with the exact distinction
   between fixed successor behavior, retired legacy exposure and remaining work.

## Declared change surface

| Path                                                                             | Operation  | Purpose                                                                     |
| -------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `server.js`                                                                      | modify     | G03–G05 containment at the mounted application boundary                     |
| `tests/unit/securityHardening.test.js`                                           | modify     | Real local HTTP regressions and positive controls                           |
| `tools/assurance-hardening/**`                                                   | add        | G01/G02/G07–G09 successor and tests; no edits in frozen HF namespaces       |
| `scripts/reproduce-llm-shield-stage5l-strict.sh`                                 | add        | G06 separately identified strict wrapper                                    |
| `package.json`                                                                   | modify     | Explicit hardening demo and test commands; existing start command retained  |
| `.github/workflows/openai-readiness.yml`                                         | modify     | Add successor checks to existing relevant job; scope triggers to new inputs |
| `docs/research/HARDENING_PHASE_1.md`, `docs/research/hardening-phase-1/**`       | add/modify | Plan, execution ledger, findings disposition and presentation evidence      |
| `README.md`, `docs/REVIEWER_INDEX.md`, `ROADMAP.md`, `SECURITY.md`, `PRIVACY.md` | modify     | Current entry points and compatibility/claim boundaries                     |
| `AGENT.md`, `CHANGELOG.md`                                                       | modify     | Dated implementation and verification logs                                  |

All existing captures, protocols, source-bound HF/safety inputs, signed manifests,
historical gateway/helper implementations and original Stage 5L wrapper remain untouched.
No new model capture, secret access, external probing, deployment or outreach is required.

## Verification and lifecycle

Tests precede implementation and must fail for the missing behavior, then pass with
legitimate controls. Run real local HTTP checks, successor authority/parser tests,
cross-connection/process transaction checks and injected shell failures. Verify finite
published captures still pass prevalidation and preserve protocol input hashes. Run the
full npm suite, scoped Python suite, formatting, lint and relevant hosted CI.

The added checks extend the existing readiness job, not a new stage census identity:

- `active_phase`: current hardening successor development and maintenance.
- `protected_surface`: declared successor, strict wrapper and server boundary paths.
- `next_phase_behaviour`: run only on relevant paths or explicit workflow dispatch.
- `maintenance_behaviour`: scoped successor changes with regression tests and dated logs.
- `sunset_or_migration_condition`: replace only with an explicit successor and documented
  retained compatibility checks; historical evidence remains separately verified.
- `anti_vacuity_condition`: require concrete denied-effect and successful-useful controls;
  missing tests, failed subprocesses or unavailable required prerequisites cannot pass.

## Execution ledger

- Task 4 local verification complete: 5,122 npm passes, zero failures, three prerequisite
  skips; 17 successor, seven HTTP and 13+2 inherited focused checks pass. Fifteen saved
  regression-demo checks replay exactly. Source hashes and historical census baseline
  remain intact. Hosted CI will be checked against the pushed implementation revision.

- Final review: a fresh read-only reviewer identified an Express repeated-slash auth
  bypass and a mutable direct-call request authorization/effect mismatch. Both were
  reproduced by failing regressions, then fixed in one pass: authorize at the normalized
  mount-relative route; snapshot request strings before validating and executing.
  The latter was an in-process caller issue, not demonstrated remote JSON escalation.
- Task 3 complete: key-free demonstration, exact replay/tamper/overwrite checks, current
  endpoint migration guidance and five-minute technical presentation script added.

- Task 1 complete: scope committed at `f86f7723` before implementation. A fresh
  read-only boundary investigation confirmed successor namespaces and server containment.
- Task 2: three HTTP regressions failed against the original server, then passed with
  the boundary changes and authorized mock/session-mismatch controls. Eleven successor
  tests failed for missing modules before implementation; all passed after implementation.
  Wrapper/demo tests likewise failed before their files existed, then passed.
- Ruling: the existing workflow census parser groups unnamed steps with the preceding
  named step. Adding the HTTP test changed one classification from `unclassifiable_step`
  to `missing_committed_universe_query`, causing the first full suite's one failure.
  Re-derive only `current` in `docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json`
  under its pre-existing maintenance contract; retain all 39 identities and immutable
  19-entry baseline. Cost: the known coarse parser limitation remains; no gate is removed
  and no evidence of broader coverage is claimed.

- Preflight: source-bound HF code/tests require a new namespace. The server conductor is
  mutable; old raw process collectors and live quota code are not being certified.
- Ruling: retire the legacy billable and affinity paths rather than patch frozen research
  internals. Cost: clients of those paths receive 410 and must migrate; present this as
  containment/retirement, not full functional remediation.
- Ruling: reuse the current `openai-readiness` feature branch, whose existing work is
  committed and pushed; preserve baseline `bdb737fd` rather than create a competing branch.
- External skill reference pages for artifact storage and writing-good-tests were
  unavailable through the skill reader. No workbench scan/closure is claimed; temporary
  diagnostics stay in the workspace research directory and retained artifacts are explicit.
