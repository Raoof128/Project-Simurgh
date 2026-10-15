# Persisted workflow implementation plan

Base: 27aca221d27335527c25b357c01b2c78c2a903e1. Implement the adjacent design contract in the
existing isolated checkout. The user authorizes proceeding and prior commit/push authority remains.
Do not revisit environment configuration or read an API key. Preserve all prior source/reports.

1. Pin the official SQLite checkpointer extension against the existing SDK dependency lock in
   tools/assurance-workflow/requirements.in and requirements.lock. Install in a separate venv.
2. Write failing tests for application ledger, immutable checkpoint validation, serialized decisions,
   live revision/revocation, native approval pause and fresh-process restoration. Implement the
   minimal ledger and two native adapters. Reuse unchanged Redis connector and source-verified server.
3. Add process harness tests for pause SIGKILL, post-effect SIGKILL and concurrent resumes. Implement
   bounded subprocess orchestration. Observe failure before implementation and pass after it.
4. Add exact 24-row study, source manifest, strict full replay, tamper tests and exclusive CLI outputs.
   Generate the report after final source formatting. Write source notes, results and limitations.
5. Add scoped CI, update current entry points and rederive only mutable workflow census current if
   the new named step changes it. Run full npm, existing relevant Python tests and all prior reports.
6. One fresh final reviewer; resolve material findings test-first. Verify final diff, append both
   Raouf logs, commit/push and compare remote/local SHA. Do not merge, publish or deploy.

Ruling: the user's repeated next-phase instruction and higher-priority autonomy directive authorize
routine design/implementation choices without another approval menu. Record this concrete contract
before implementation. No secret or environment settings work is required.

Review focus: checkpoint integrity before deserialization; native workflow rather than executor-only
restart; decision persistence before resume; live authorization and lock ordering; post-effect replay;
completed retry read-back; real SIGKILL evidence; process cleanup; pin/source closure; bounded claims.

## Execution decisions

The dependency extension installed three additions only: aiosqlite 0.22.1, SQLite checkpointer
3.1.2 and sqlite-vec 0.1.9. Every earlier installed package version was checked unchanged.
The initial native/ledger suite passed 7 tests; process recovery expanded it to 10. The first
complete 13-test suite passed, including complete 24-case replay and tamper refusal.

The cached response now carries no fresh tool result; its regression failed before the correction
and passed afterwards. Fresh review found no Critical/Important defect and one Minor orphaned
native checkpoint directory after SIGKILL. Ruling: fix that cleanup issue in this single pass
because disposable fault fixtures must not accumulate native snapshots outside their parent root.
The regression failed before moving native working copies under the workflow directory, then
passed including post-crash recovery and parent cleanup. A transport-unknown test also confirms
that no terminal completion replaces a pending attempt. Final suite and report verification follow.

CI uses a separate 20-minute workflow-recovery job: the complete fixture repeatedly starts real
application processes and services. This is a CI resource budget, not a latency benchmark or SLO.
The workflow census adds exactly one missing_committed_universe_query identity; only the standing
mutable current set moves 28 → 29. Baseline 19 and every earlier source/report stay unchanged.

Final verification: all 15 tests passed after the review fix; saved 24-case report independently
replayed against the corrected source. CLI refusal checks, all five prior reports, previous Python
suites, full npm, Ruff, formatting, census and frozen-surface checks pass. See validation/logs for
counts and skipped prerequisites. Commit/push closeout follows; incident research is a new phase.
