# Durable local effects experiment

This phase tests whether a precommitted authorization survives executor restart and whether
retries can recover a file effect without writing it twice. It adds an immutable SQLite
authority/receipt ledger and an idempotent local file sink. Existing lab and SDK artifacts
remain unchanged.

The [saved report](evidence/report.json) contains **26 named cases**, including four injected
process crashes, two eight-worker races and executor restarts through both pinned SDKs.
The result is a bounded local recovery contract. It does not establish atomicity between a
database and an arbitrary external API, distributed exactly-once execution or power-loss safety.

## Reproduce

Use Linux, Python 3.12 and the [existing SDK environment](../sdk/README.md#reproduce).
The durability implementation adds no third-party dependency. From the repository root:

```bash
export PYTHONPATH=tools/assurance-durable:tools/assurance-sdk
export PYTHONDONTWRITEBYTECODE=1
/tmp/simurgh-assurance-sdk-venv/bin/python -m unittest discover -s tools/assurance-durable/tests -v
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_durable.study run --out /tmp/simurgh-durable/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_durable.study verify /tmp/simurgh-durable/report.json
/tmp/simurgh-assurance-sdk-venv/bin/python -m simurgh_durable.study verify docs/assurance/durable/evidence/report.json
```

Use a fresh output path. Reports cannot be overwritten. Verification reruns every named case
and compares the complete result and source manifest. Tests and the report bind the new code,
consumed SDK sources and lock, and original evidence. This establishes shared-code replay,
not independent authentication of a historical run. No secret, API service or paid model is used.

## Observed results — 15 October 2026

| Probe                                                     | Observed outcome                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Volatile replay control, two fresh workers                | Two actual file effects; process-local consumed state is lost                                        |
| Durable retry, two fresh workers                          | One effect and one receipt; second completion is cached                                              |
| Eight workers, same action                                | One creator, one effect, one receipt                                                                 |
| Eight workers, two distinct approved actions              | Two creators, two effects, two receipts                                                              |
| Changed retry after crash                                 | Denied; subsequent exact retry recovers the original effect                                          |
| Authority replacement                                     | Refused; attempted later grant remains unauthorized                                                  |
| Eight individual action-field changes and malformed shape | Denied before effects                                                                                |
| Missing/corrupt receipted effect or database              | Explicit execution error and unavailable observation; no replacement effect                          |
| Held SQLite write lock                                    | Timeout with no effect or receipt                                                                    |
| OpenAI Agents SDK 0.23.1 and LangGraph 1.2.15             | Each performs two native approval/resume runs through fresh executor processes; one persisted effect |

The volatile control is purpose-built and intentionally uses process-local replay state. It
is not a vulnerability result for either SDK. Cases are authored deterministic fixtures,
not independent samples or attack-success estimates.

| Worker killed at boundary | Effects before retry | Receipts before retry | Fresh retry disposition | Effects / receipts after retry |
| ------------------------- | -------------------: | --------------------: | ----------------------- | ------------------------------ |
| Before publication        |                    0 |                     0 | Created                 | 1 / 1                          |
| After publication         |                    1 |                     0 | Recovered               | 1 / 1                          |
| Before receipt commit     |                    1 |                     0 | Recovered               | 1 / 1                          |
| After receipt commit      |                    1 |                     1 | Replayed                | 1 / 1                          |

Each crash must exit with SIGKILL (`-9`); startup errors cannot count as injected crashes.
The harness reads disk and receipts before starting a new worker. Concurrent workers all
signal readiness before any action is released, and the harness checks distinct process IDs.
Scheduling order and process IDs are omitted from the deterministic report.

## Why recovery works here

Initialization stores exact approved arguments once. SQLite `BEGIN IMMEDIATE` serializes
cooperating workers across checking, publication and receipt commit. A stable effect name
derives from the action ID within this immutable store. Publication writes/fsyncs a staging
file, exclusively links it into the effect directory, then fsyncs that directory. A retry
checks the expected file bytes; it never overwrites them.

A crash may leave a published file without a committed receipt. Matching bytes allow a
fresh worker to record the missing receipt without creating another file. An existing
receipt whose file is absent or changed produces an error. The implementation deliberately
refuses to reconstruct lost database authority or silently execute a missing receipted effect.

`status: executed` means the action is completed, including a cached completion. Read
`disposition` (`created`, `recovered`, `replayed`) and `effectCreated` to distinguish an actual
new write. Denial and storage error remain different outcomes. Snapshot reads persisted files
and checks receipts; it does not accept the executor's returned event as evidence of disk state.

## Boundaries and next work

The ledger and effect publication are **not one atomic transaction**. Recovery works because
this sink has a stable identity, exclusive publication and verifiable bytes. This must not be
generalized to email, payments or another connector without that service's idempotency and
reconciliation contract. Temporary staging files left by SIGKILL are not counted as effects;
the disposable study directory removes them after inspection.

The store, filesystem, workers and operator are trusted and local. Whole-store rollback,
hostile same-user modification, network filesystems, multiple hosts, hardware/power failure,
authenticated human approval, revocation and independent custody remain outside the result.
SQLite/fsync durability assumptions are documented by their upstream authors; process-kill
tests do not verify the storage stack under power loss. No latency or throughput was measured.

SDK cases restart the **executor** and start fresh SDK runs. They do not restore an entire
interrupted SDK workflow after an application crash. That separate capability remains open.
The earlier [standalone LangGraph validation limitation](../sdk/VALIDATION.md) is unchanged.

Follow-up: the [Redis connector extension](../redis/README.md) now tests a real conditional-write
service and ambiguous-response recovery. Independently authored cases and an outside reproduction
remain open. A power-loss fixture
and durable end-to-end SDK workflow recovery would strengthen the local contract further.

Subjective closeout scorecard: reproducibility **8/10** (raise with external replay), local
recovery evidence **6/10** (raise with power-loss and end-to-end workflow tests), connector
realism **3/10** (raise with a real service), novelty **2/10** (established mechanisms, new
project evidence). These are engineering judgments, not measured vendor acceptance scores.

See [source notes](SOURCES.md), [validation](VALIDATION.md), and the
[contract](../../superpowers/specs/2026-10-15-assurance-durable-design.md).
