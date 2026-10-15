# Redis connector recovery contract

The next authorized phase replaces the home-built file sink with a real, pinned Redis 8.10.2
server. A record written by `SET key value NX` is the consequential operation. Redis documents
that NX sets only absent keys. No expiry is configured. Recovery compares exact stored bytes;
idempotency is scoped to one persistent key in this isolated database.

The Redis source archive is verified against the Redis project's published SHA-256 before
compilation. Each experiment starts a disposable server using only a Unix socket (TCP disabled),
append-only persistence and `appendfsync always`. This is an actual service/protocol integration,
not an external operator, hosted Redis evaluation, distributed exactly-once guarantee or power-loss
test. Use the existing pinned SDK Python environment; no API key or paid model call is required.

## Decisions and authority

Reuse the previous durability package's immutable SQLite authority, schema validation and
transaction lock without editing its bytes. The new connector records a durable intent before
contacting Redis, separately from the completion receipt. Each action ID gets one stable key.
The intent prevents a changed or missing sink record from being silently retried after ambiguity.
If a receipt exists, missing/conflicting Redis data is an error. If only an intent exists, exact
Redis data recovers completion; absence remains unknown and refuses automatic re-execution.
For a fresh request, persist the intent then perform conditional SET and read back. A failed or
lost response leaves a pending intent; explicit reconciliation uses GET only. A pre-send failure
can therefore sacrifice utility (pending with absent key) rather than assert that no effect
occurred. The control test must expose this cost. No heuristic retries turn unknown into success.

Each request checks authority before contacting the service. A bounded POSIX process lock
serializes cooperating clients across the separate intent and completion transactions; SQLite
protects the ledger and Redis NX protects publication. A killed process releases its lock;
the committed pending intent survives. Exact matching data can finalize a receipt;
absence returns unknown. No expiry, eviction or failover is enabled; deletion and conflicting
bytes are fault probes. Do not equate a cached completed result with a new effect.

## Measurements

The harness proxy reads the real Redis response after SET, records that response, then closes
the client connection without forwarding it. The client must report unknown; direct Redis GET
must show the effect; a new client must recover a receipt without another SET. Contrast a
pre-send disconnect, which leaves no effect and remains pending/unknown. Include native success,
repeat requests, denied bindings, conflicting data, missing data after completion, service outage,
eight-process duplicate contention and server SIGKILL/restart using the same append-only data.
An intentionally retrying non-idempotent list-push control creates duplicate list elements.
This is an illustrative Redis operation control, not a vendor vulnerability comparison.

Both existing SDK adapters must execute their normal native approval/resume flows with this
connector. All source and previous artifacts stay frozen; new tests and source-bound replay
live in `tools/assurance-redis/` and `docs/assurance/redis/`. Reports identify actual observations,
pending states, receipts and mutation outcomes; no latency or statistical-rate claim.

## Gate lifecycle

| Field                         | Declaration                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive Redis local connector v1                                                                                                                                                               |
| protected_surface             | tools/assurance-redis/**, docs/assurance/redis/** and scoped CI/entry links                                                                                                                     |
| next_phase_behaviour          | Verify only this pinned local Redis contract; other connectors need separate evidence                                                                                                           |
| maintenance_behaviour         | Regression tests first; source changes require refreshed evidence; prior sources frozen                                                                                                         |
| sunset_or_migration_condition | Versioned connector successor with explicit state migration and retained old evidence                                                                                                           |
| anti_vacuity_condition        | Actual Redis binary/version, proven response loss after command acceptance, distinct workers, non-idempotent duplicate control, explicit unknowns, exact named-case replay and tamper rejection |

Remaining bounds: trusted same-host operator, no authenticated human approval, multi-host fencing,
expiry/revocation policy, hostile server, power loss, remote production endpoint or external witness.
Subjective targets: reproducibility 8/10, connector realism 5/10, recovery evidence 6/10, novelty 2/10.
Raise these with independently operated Redis, failover/storage-loss trials and a second connector.
