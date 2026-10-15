# Durable local effects contract

The owner authorized the next phase: replay protection across process crashes, retries and
concurrent execution. Preserve the original lab and SDK implementation/evidence bytes. The
credential requirement is separate: registering a secure field does not store its value, and
this experiment needs no credential or paid model call.

## Mechanism and alternatives

Use Python 3.12's SQLite library and a POSIX local filesystem. A new `tools/assurance-durable/`
package stores immutable authority and execution receipts in `state.sqlite3` and synthetic
write effects in `effects/`. Separate processes reopen the same store. `BEGIN IMMEDIATE`
serializes cooperating executors; full synchronous commits retain receipts. Each grant binds
all eight original action fields. An action ID has one stable SHA-256-derived effect path.
Publication uses a fully written/fsynced temporary file and an exclusive hard link, followed
by directory fsync. Existing matching bytes are reused, never overwritten.

A ledger-only transaction with effects inside SQLite would give a simpler atomic guarantee
but would not exercise a separate file effect. A distributed outbox/connector system needs a
real service's idempotency contract and is outside this local phase. The selected design
exposes the file/receipt crash window rather than pretending it is one atomic transaction.

After a crash before publication, retry may create the effect. After publication but before
receipt commit, retry reads matching effect bytes and records a recovered receipt. After
commit, retry returns the cached completion and verifies the effect still exists. Missing or
conflicting files with an existing receipt are errors, never repaired by executing again.
An absent/corrupt/uninitialized database must not recreate authority. Initialization refuses
to reuse a nonempty store. Authority replacement is unavailable after initialization.

The returned `status: executed` means completed, including cached/recovered completion;
`disposition` and `effectCreated` distinguish new writes from retries. Rejected arguments
yield denied. Storage faults fail closed with explicit errors. Snapshot reads disk bytes,
not execution return values; it provides no proof against a malicious host.

## Experiment and anti-vacuity

Test a benign write, changed content/principal/tenant/resource/revision/run/id, malformed data,
late authority replacement, duplicate retry after process exit, and independent concurrent
workers sharing a store. Kill workers using SIGKILL at named boundaries: before publication,
after publication, before receipt commit and after receipt commit. Require the exact negative
signal exit code, inspect files and receipts before retry, then run a new process and inspect
them again. A failed import is not a crash injection. Race eight processes behind a shared
start gate and assert one effect and one receipt, with exactly one creator. Include corrupt
and missing effects, unavailable/corrupt database, and database-lock timeout.

Run an illustrative volatile replay baseline that really creates two effects after restart;
it is a purpose-built control, not an SDK benchmark. Exercise both unchanged SDK adapters
with callbacks to separate durable workers, then repeat with fresh workers. Preserve native
approval/observation flows; this tests executor restart, not serialized SDK workflow recovery.
Save a deterministic report with named rows, actual effect/receipt counts and source hashes.
Verification reruns every case and compares the complete parsed report; omitted cases, extra
claims, source drift and altered outcomes must fail. No timing/throughput claim.

## Bounds and prior art

SQLite transactions, idempotency keys and outbox recovery are established mechanisms. The
contribution is a falsifiable local contract with crash-window evidence in this project.
Workers, database and sink share a trusted operator and local filesystem. No hostile same-user
writer, rollback of the whole store, power loss/hardware fault, network filesystem, multiple
hosts, independent witness, authenticated identity, revocation or non-idempotent remote
connector is covered. Unlinked temporary files left by SIGKILL are not committed effects;
temporary store cleanup removes them after inspection. Never infer universal exactly-once
execution from one persisted file. File and receipt publication are explicitly not atomic.

An external framework integrator can reproduce this local fault contract; actual service-side
idempotency and independent operation still block production adoption. Subjective targets:
reproducibility 8/10, local recovery evidence 6/10, connector realism 3/10, novelty 2/10.
Higher scores require power-loss validation, a real idempotent connector and external replay.

## Gate lifecycle

| Field                         | Declaration                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive durable local effects v1                                                                                                     |
| protected_surface             | tools/assurance-durable/**, docs/assurance/durable/**, scoped CI and entry-point links                                                |
| next_phase_behaviour          | Continue verifying this local contract; new connectors receive separate evidence                                                      |
| maintenance_behaviour         | Regression first; reviewed source changes require a new source-bound report                                                           |
| sunset_or_migration_condition | Versioned successor with explicit migration and retained historical result                                                            |
| anti_vacuity_condition        | Exact process-kill exits, nonzero restart/race cases, real disk reads, one creator, complete fresh report replay and tamper rejection |
