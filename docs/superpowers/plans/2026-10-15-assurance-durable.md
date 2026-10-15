# Durable effects execution plan

Spec: [Local recovery contract](../specs/2026-10-15-assurance-durable-design.md).
Base: `7f0e9a7e0afbec1aede9f384cdb1e33f26bee36e`. Existing isolated cloud checkout;
owner authorization includes implementation, commit and push. No merge, deployment or paid run.

1. Write failing store tests, then implement immutable initialization, strict action schema,
   SQLite writer serialization, idempotent file publication, receipt recovery and disk snapshot.
   Keep all code in `tools/assurance-durable/simurgh_durable/`; no old source edits.
2. Add a bounded subprocess worker and process tests. Exercise four SIGKILL boundaries,
   eight-worker contention, restart retry, tampered/missing files and lock/storage failures.
   Observe states before/after retry; require signal exit codes and fresh process IDs.
3. Build a deterministic study and replay verifier with tests first. Include a volatile
   restart control and both unchanged SDK adapters using the durable worker boundary.
   Hash every new source/test plus consumed original modules and dependency lock.
4. Publish results, source notes and limitations under `docs/assurance/durable/`. Wire tests
   and report replay into scoped CI using the existing SDK environment. Update entry points.
   Re-derive the existing mutable workflow census `current` set when adding a CI step, as its
   standing lifecycle requires; preserve the immutable `baseline` and classifier behavior.
5. Fresh whole-change review, regression fixes for material findings, full npm/Python tests,
   old report verification, dependency/source/format checks. Append Raouf entries to both
   change logs, commit/push and confirm remote SHA and clean working tree.

Review focus: crash before/after publication and commit; no file overwrite; one authority
across restarts; conflict vs cached completion; stale receipt/file mismatch; process startup
failures misclassified as kills; simultaneous real processes; lock timeout; missing database
silently recreated; source-manifest closure; no universal exactly-once or power-loss claim.
