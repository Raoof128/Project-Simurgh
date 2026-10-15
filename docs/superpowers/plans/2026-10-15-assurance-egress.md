# Kernel egress plan and execution ledger

Spec: `docs/superpowers/specs/2026-10-15-assurance-egress.md`. Base: `accfec27`.
Authorization: user said proceed; standing commit/push authorization persists. No paid calls,
privileged platform changes or environment configuration changes are needed.

Preflight: read root AGENT.md and CHANGELOG.md; retain signed/frozen records, separate new evidence,
declare six gate lifecycle fields, pin exact identities rather than counts, and report skips/unknowns.
Recent phases added file observation, native SDK approvals, Redis reconciliation, persisted workflow
recovery and task scope. Their sources/reports remain unchanged.

1. Kernel profile: test real socket denial first, implement x86_64 seccomp allowlist and setup checks.
   Expected: useful local operations survive; raw socket/connect/import calls fail; unsupported setup
   refuses before readiness. Files: `tools/assurance-egress/simurgh_egress/kernel.py`, kernel tests.
2. Worker/harness: tests first for approved service relay and external observations. Add trusted
   descriptor sanitation, loopback observers, service worker and exact-scope broker adapter.
   Expected: baseline delivers; profile blocks; normal requests remain useful; file channel remains.
3. Study: test complete matrix and tamper refusals, implement source-bound run/verify CLI, publish
   report, source register, reproduction instructions and honest limits; add own CI/entry links.
4. Verify new suite, unchanged scope suite/report, full npm, prior byte preservation and formatting.
   One fresh whole-phase review; regressions before material fixes; append both logs, commit/push.

Shared interfaces: kernel setup consumes an inherited listener FD and returns only after enforcement;
worker consumes a case and observer configuration; harness reads parent-owned observation logs;
study consumes deterministic outcomes without volatile addresses/PIDs. The previous Broker transport
contract is `{status, location}`; map service status without changing the frozen broker.

Ruling: use ingress-only seccomp rather than namespaces here — namespace mapping is unavailable,
and kernel socket restrictions can test the specific onward-request gap. Cost: no selective outbound
access or namespace isolation claim. Cloud skills loaded for runtime inspection only; user's earlier
instruction to avoid environment configuration remains in force. Skill helper references are not
readable through the provider; this tracked plan serves as the execution ledger.

Review focus: alternate syscall ABI, inherited descriptors, filter-install/readiness ordering,
fork/exec, implicit send destinations, observer race/failure, report omission/tampering and exact
claim boundaries. Do not substitute a worker's self-report for an observed service delivery.

## Execution record

Tasks 1–3 complete: real kernel tests began red before the package existed; the service relay test
also failed before implementation. The completed 19-test suite passes. Source-bound artifact has
36 rows: all eight network baselines deliver, filtered rows block, both utility controls succeed,
descriptor hygiene applies to both running controls, and the mailbox negative result remains.
The validator refuses absent baseline delivery instead of interpreting an unusable host as safety.

Task 4 verification: new artifact replay, previous 24 scope tests and 54-row report pass; all seven
previous source/report families and frozen census baseline compare unchanged. Full npm 5,119 passed,
zero failed, three prerequisite skips. Ruff, formatting, CLI refusal, census and diff checks pass.
Current census 30 → 31, one `unclassifiable_step`. One fresh final reviewer is checking the complete
phase. Existing branch and checkout are retained.

Final review: one Important observer defect, no Critical or other material finding. A stalled
accepted connection could time out as if the listener were idle and hide queued traffic. Ruling:
fix — false-empty observation violates the experiment contract; cost if left: unsupported absence
claims. A stalled-first/full-second regression failed before correction. Narrowed idle timeout
handling to accept/recvfrom polling; active I/O errors now invalidate the observation. Full suite
now 20 tests; own report source hashes refreshed with all 36 outcomes unchanged. No second review.
Commit/push closeout follows the verification commands; no deployment or environment edit.
