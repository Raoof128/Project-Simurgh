# Incident scope implementation plan

1. Verify primary incident sources and publish an attributed gap map with implementation boundaries.
2. Write failing tests for exact task authority, durable stopping and child-service observations.
3. Implement a standard-library broker, local HTTP fixtures and complete matrix replay verifier.
4. Generate source-bound evidence; document useful-work costs and the service-side relay limitation.
5. Add scoped CI, verify earlier evidence is unchanged and run relevant regression checks.
6. Obtain one fresh final review, fix material findings, append both logs, commit and push.

The user has authorized implementation and push. This plan requires no paid API or environment
settings change. Prior skills were loaded earlier in the session; their provider is currently empty.

## Execution record

The implementation uses Python standard-library SQLite/HTTP/Unix sockets and no new runtime
dependency. Tests began red with the package absent; a test fixture filename collision was corrected
after the first implementation run. The initial 22-test suite passes, including four-process budget
contention and actual SIGKILL followed by a newly spawned restorer. All 54 report rows replay.
The retained approved-service relay failure motivates network-layer enforcement as the next step.

Full npm passes with 5,119 passed and three prerequisite skips. Earlier tool/report bytes and the
census baseline remain unchanged. New CI contributes one `unclassifiable_step` identity to the
standing mutable current set, 29 → 30.

One fresh reviewer found one Important stop-persistence gap: non-success responses were committed
as active before stop recording. Ruling: fix. Regressions first reproduced failed stop writes after
404/rejected redirects and before dispatch. Pending now spans admission and response classification
until a durable decision. Final suite: 24 passed; complete report replay passes after updating only
this phase's source binding. All 54 outcomes stay unchanged. No second review claim. Commit/push
closeout follows verification; network-layer enforcement remains separate future work.
