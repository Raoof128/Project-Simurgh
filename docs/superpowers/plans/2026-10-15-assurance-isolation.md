# Descriptor isolation plan and ledger

Spec: `docs/superpowers/specs/2026-10-15-assurance-isolation.md`. Base `0f50b72f`.
Use existing checkout/branch; standing commit/push authorization. No paid calls or environment edits.
Read root AGENT.md/CHANGELOG.md, gate invariants and previous egress evidence before edits.

1. Write subprocess kernel tests first. Add descriptor validation/sanitation and explicit x86_64
   seccomp profile. Expected: useful approved FD I/O survives, path/socket/IPC syscalls deny, children
   inherit restriction, setup failure never executes a task.
2. Write real-effects harness tests first. Add trusted provisioning and outside observers, exact-scope
   broker integration, useful/attack/negative controls. Expected: baseline delivery, filtered absence,
   retained authorized-channel misuse and deny-all utility loss.
3. Write report tests first. Add exact source-bound matrix/replay CLI, sources and reproducible docs,
   CI and current census update. Expected: missing/duplicate/tampered results refuse.
4. Run new suite/replay, prior egress suite/replay, full npm and formatting. One fresh whole-phase
   review; material fixes RED→GREEN; append both logs and commit/push.

Interfaces: profile accepts trusted role→FD mapping and exact peer tuple; worker consumes preloaded
case configuration; parent observes file/collector/signal effects. Broker transport invokes the
worker after exact request admission and maps its result to status. No changes to frozen Broker.
The report binds all own Python sources and imported scope broker sources.

Ruling: use preopened descriptor capabilities after Landlock ENOSYS and unavailable namespaces —
executable without relaxing platform controls; cost is no dynamic paths/reconnects or general app
compatibility. Skill helper resources remain unavailable; this tracked ledger carries execution.

Review focus: descriptor substitution/reuse, syscall ABI/argument checks, file-backed mapping,
reporting channels, setup readiness, IPC alternatives, fork/exec, outside-observer races and failures,
baseline usefulness, provenance and overbroad isolation/selective-network claims.

## Execution record

Tasks 1–3 complete. Kernel, live-effects and report tests each began red before implementation.
The 24-test suite now passes. The complete 57-row report was generated: twelve attack baselines
and three utility baselines deliver; capability mode blocks all twelve attacks and retains all
three useful tasks; two descriptor hygiene cases and two approved-content failures remain explicit.
The malformed worker-result regression failed before moving result publication after validation.

Ruling: exercise raw fork rather than widening the profile to glibc's clone wrapper — the allowed
raw syscall inherits restrictions; cost is documented incompatibility with Python's os.fork wrapper.
A pre-existing platform filter remains in both running controls. No Landlock/namespace enforcement
or independent outside operator result is claimed.

Own report and prior egress suite/report are being replayed. Ruff passes; source/entry/CI formatting
passes. The current gate census changes 31 → 32, exactly one new unclassifiable step; baseline19 is
unchanged. All eight earlier source/report families remain byte-preserved. Full npm is running.
One fresh whole-phase review follows; any material finding needs a failing regression before repair.

Task 4 verification before review: own 57-row replay and previous egress 20 tests/36 rows pass.
Full npm 5,119 passed, zero failed, three Chrome/Lean prerequisite skips. CLI overwrite, omitted
matrix and duplicate JSON keys refuse. Scoped formatting, Ruff and exact current census pass.
All eight earlier source/report families and census baseline compare unchanged. Both Raouf logs
now include this phase; final review disposition remains pending.

Final review: one Important worker-envelope finding, one Minor protocol-check limitation. No kernel
escape identified within the explicitly trusted-bootstrap scope. Reviewer reproduced 24 tests,
57 rows and all four retained response hashes. Ruling: fix envelope validation as Important because
public single-case CLI could otherwise publish malformed results as a valid experiment; cost if
left is unsupported evidence outside the complete-matrix gate. Seven malformed envelopes and
boolean errno acceptance failed before the fix. Added one shared strict envelope validator and
unique-key parser. Final: fixed malformed worker envelopes — CLI/type regressions RED→GREEN,
full new suite 26/26. Source-bound report refresh retains every observed row. No re-review.

Final: minor (deferred): socket family/type/peer are validated, but SO_PROTOCOL is not queried;
current trusted provisioning creates TCP. Alternative IP stream protocols were not measured.
The README explicitly bounds this. Outside bootstrap consumers need a stricter protocol contract.

Final verification after the fix: 26/26 new tests; all 57 refreshed rows replay and match the
pre-review observations; full npm rerun 5,119 passed/0 failed/3 skipped. Ruff, scoped Prettier,
current census and diff checks pass. Existing checkout retained; commit/push uses standing user
authorization rather than another integration menu. No merge or deployment.
