# Real Redis connector recovery

This extension tests a real Redis **8.10.2** process with a disposable Unix socket and
append-only persistence (`appendfsync always`). Its [report](evidence/report.json) contains
**19 named cases**. OpenAI Agents SDK 0.23.1 and LangGraph 1.2.15 use the same connector through
fresh executor processes. Proposals are scripted; no model API or credential is needed.

## What happened

| Case family                                             | Observed result                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Ordinary retry                                          | One conditional record write, then cached completion after read-back                                                        |
| Success reply lost                                      | Proxy reads Redis `OK`, drops the reply; caller returns unknown; subsequent GET recovers one effect and commits its receipt |
| Disconnect before send                                  | Zero effects; pending intent remains unknown on GET-only retry, exposing lost useful work                                   |
| Eight changed authorization fields and malformed action | Denied, with zero intents and zero Redis keys                                                                               |
| Changed or deleted completed record                     | Unknown; conflicting bytes are not overwritten and a missing record is not recreated                                        |
| Redis SIGKILL and AOF restart                           | Unavailable while stopped; original record survives restart and retry returns cached completion                             |
| Eight start-gated executor processes                    | Eight completions, one creator, one record and one receipt                                                                  |
| Deliberately non-idempotent RPUSH control               | Dropped successful reply followed by blind retry produces two list entries                                                  |
| Two native SDK integrations                             | Each runtime pauses/resumes twice with distinct executor processes and one resulting record                                 |

The RPUSH control demonstrates the failure mechanism. A list append and a conditional record
write have different semantics; their counts are not a comparative attack-success rate or a
vendor vulnerability result. Nineteen cases are an authored inventory, not independent trials.

## Reproduce

Use Linux, a C compiler, make, curl, Python 3.12 and the hash-locked
[SDK environment](../sdk/README.md#reproduce). From the repository root:

```bash
bash tools/assurance-redis/install-redis.sh /tmp/simurgh-redis-bin
export SIMURGH_REDIS_SERVER=/tmp/simurgh-redis-bin/redis-server
export PYTHONPATH=tools/assurance-redis:tools/assurance-durable:tools/assurance-sdk
export PYTHONDONTWRITEBYTECODE=1
/tmp/simurgh-assurance-sdk-venv/bin/python -m unittest discover -s tools/assurance-redis/tests -v
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_redis.study run --out /tmp/simurgh-redis/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_redis.study verify /tmp/simurgh-redis/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_redis.study verify docs/assurance/redis/evidence/report.json
```

The installer verifies the published archive SHA-256 before building. Runtime checks require
version 8.10.2; they trust the selected local binary and do not attest its provenance. Installation
uses the network; study execution uses local sockets only. Each case starts its own server
with TCP disabled and removes its temporary directory. The Python guard blocks Internet socket
connections and DNS; it is not an OS or native-code sandbox. Output paths must be new.
Verification checks source hashes and re-executes the complete study, comparing every report field.

## Contract and limits

A trusted operator precommits exact authority in SQLite. The connector commits an intent before
sending `SET stable_key exact_action_json NX`. Cooperating local processes share a POSIX file lock.
An existing intent or receipt only permits `GET` reconciliation. Exact bytes permit completion;
absence or conflict remains unknown. A receipt is committed after matching read-back. Redis and
SQLite are separate transactions. Redis SET NX and idempotency are established mechanisms.

The record is a real service mutation with synthetic content. It does not represent an email,
payment, remote HTTP service or enterprise deployment. The selected service uses no expiry or
eviction; the ledger, stable namespace and service storage must survive. No hostile same-user
modification, rollback, failover, multi-host locking, network filesystem, hardware failure or
power-loss safety was tested. AOF process-restart evidence does not validate those assumptions.
Read-back establishes current state at observation time; it cannot enumerate transient writes or
unrelated operations. The study additionally counts keys in its isolated database.

A pending intent with an absent record stays unknown even when the fixture knows no write happened.
This conservative policy sacrifices retry availability. No automatic reset or reissue is provided.
SDK cases restart executors and launch fresh native runs; they do not restore a complete interrupted
SDK workflow. Human approval identity, revocation, independent witness custody and overhead remain
unmeasured. No distributed exactly-once, production-readiness or novelty claim follows.

## Next evidence

Freeze an externally authored case set and obtain an outside reproduction record. For implementation,
the [persisted workflow extension](../workflow/README.md) now restores a bounded native approval
workflow across application restart, including authorization changes while paused. It is separate
from this immutable connector report. Remote connector semantics,
authenticated approval identity and measured integration cost remain additional gaps.

Subjective closeout scorecard: reproducibility **8/10** (external replay still needed), connector
realism **5/10** (real local service, synthetic effect), recovery **6/10** (no power-loss or full
workflow recovery), novelty **2/10** (known mechanisms with project-specific evidence). These are
engineering judgments, not measured acceptance scores.

See [sources](SOURCES.md), [validation](VALIDATION.md), and the
[design contract](../../superpowers/specs/2026-10-15-assurance-redis-design.md).
