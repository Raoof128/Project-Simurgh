# Fail-closed reproduction runner authority

Finding R04, related to M104–M106: a verdict mismatch must never exit successfully when the
observed raw code is zero. A failed process with a zero report is likewise inconsistent.
This bounded repair uses existing raw 29 for harness inconsistency, retaining the published
raw-code-to-shell mapping. Existing captures and verifier codes remain unchanged.

| Exact path                                | Operation | Purpose                                                                  |
| ----------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `scripts/reproduce-llm-shield-stage4k.sh` | modify    | R04 reject failed process with successful report                         |
| `scripts/reproduce-llm-shield-stage4l.sh` | modify    | R04 reject unexpectedly successful negative matrix member                |
| `scripts/reproduce-llm-shield-stage4m.sh` | modify    | R04 reject unexpectedly successful negative matrix/tamper member         |
| `tests/unit/reproduceMismatch.test.js`    | add       | R04 execute real mismatch branches with injected process/report behavior |

Active phase: readiness repair. Protected surface: the exact paths above. Next phase: retain
fail-closed behavior without expanding stage scope. Maintenance: prior exact-path authorization.
Migration: replace only with a demonstrably equivalent harness contract. Anti-vacuity: inject
unexpected successful reports, assert nonzero process status and absence of final success markers;
ordinary reproduction must still pass. No new global blocking gate is introduced.
