# Redis connector execution plan

Base: dcde77651bca739701a5c8727d21a1d6c1c52d58. Follow the adjacent Redis design contract.
Use the existing checkout and prior commit/push authorization; preserve every old source/report.

1. Verify/build Redis 8.10.2 from the published source hash. Save a reproducible installer.
2. Write failing protocol/service and connector tests. Implement bounded RESP transport,
   disposable Unix-socket/AOF service, lost-response proxy and persistent intent/receipt recovery.
3. Test real process contention, service kill/restart, false-retry utility loss and both SDKs.
   Publish a deterministic named-case report with complete source manifest and replay verification.
4. Add current source notes, results, limits and scoped CI. Re-derive only the existing mutable
   current workflow census if necessary; preserve its immutable baseline.
5. Fresh independent review; test-first fixes for material findings, full relevant suites and
   old artifact replay. Append both Raouf logs, commit, push and verify remote SHA/clean tree.

Review focus: exactly where intent commits, false certainty after send failure, GET vs SET during
reconciliation, changed key bytes, lost responses proven after acceptance, pending-state races,
server restart persistence vs power-loss claims, process cleanup and source/version verification.

## Execution record

All five implementation/validation steps completed; commit/push closeout follows these checks.
Connector, process/guard and study tests were observed failing before their implementation and
passing afterwards. Final 14 tests and 19-case source-bound replay pass. The pinned source installer
was executed, and a new hash-locked Python environment independently replayed the saved report.
Prior suites and reports pass; full npm is 5,119 passed / 5,122 total with three prerequisite skips.

Ruling: preserve the existing isolated checkout and standing commit/push authorization; do not
repeat design or publication approval menus. The setup task's code-preservation restriction does
not override the user's explicit implementation request. Preserve all earlier implementation and
report bytes; only the standing mutable workflow census current set is re-derived under its
existing lifecycle. The new step adds one missing-universe-query entry; baseline 19 stays frozen.

Fresh review found no Critical, Important or Minor defects. A combined pending-executor-crash and
concurrent-recovery fixture remains a documented evidence follow-up, outside the official 19 cases.
See the validation record and Raouf entries for exact verification and limits. Cloud draft saved;
publication is not claimed.
