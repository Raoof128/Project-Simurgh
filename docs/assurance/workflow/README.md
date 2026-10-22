# Persisted approval workflows across application restart

This experiment persists a **native SDK approval checkpoint**, kills the application process,
and restores that checkpoint in another process. It extends the earlier executor-only restart
experiments. OpenAI Agents SDK **0.23.1** uses `RunState`; LangGraph **1.2.15** uses the official
SQLite checkpointer **3.1.2**. Both call the unchanged real Redis **8.10.2** connector.

The [report](evidence/report.json) has **24 named cases: 12 scenarios × two runtimes**.
These are authored fixtures with scripted proposals, not model-generated attacks or independent
statistical trials. No API key is required.

## Recovery contract

1. Initialize exact action authority and a local workflow ledger. Run the native approval flow;
   require one interruption and zero tool callbacks.
2. Persist the native checkpoint bytes, digest, length, workflow ID and application-format/SDK version marker.
   Commit the ledger before reporting ready. The parent sends SIGKILL and checks exit `-9`.
3. A different process checks the version and checkpoint integrity **before deserialization**.
   Persist the approve/reject decision, then restore the native checkpoint and resume it.
4. Immediately before execution, check the exact action, current revision and revocation flag.
   Policy changes and resumes share a POSIX lock, so cooperating local callers have an explicit
   authorization order. The original Redis connector remains the final exact-authority boundary.
5. If the application dies after the Redis effect and connector receipt, but before workflow
   completion, restore the original approval checkpoint and reuse the saved decision. The callback
   runs again; Redis reconciliation returns the existing record without another write.
6. A completed workflow retry returns cached status with no new tool result or native resumption.
   Successful cached completion still requires current effect read-back; missing effects return unknown.

LangGraph resumes a copy of its immutable approval checkpoint using the original thread ID. OpenAI
rebuilds the same agent/tool configuration and restores its saved RunState. Recovery deliberately
replays from this approval boundary, including work after it. It does not restore the latest possible
intermediate checkpoint or guarantee exactly-once execution for arbitrary tools. A cached rejected
or denied decision is historical terminal status; changing policy does not reopen that workflow.

## Case inventory

| Scenario, repeated for each runtime | Required observation                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Approved restart                    | Fresh native resumption creates one record; later completion is cached                         |
| Rejected restart                    | Native rejection and cached rejection; zero callbacks and effects                              |
| Revoked while paused                | Resumed callback denies before service execution                                               |
| Revision changed while paused       | Old action revision denies before service execution                                            |
| Checkpoint tampered                 | Integrity check refuses before native deserialization                                          |
| Checkpoint missing                  | Restoration refuses; zero callbacks and effects                                                |
| Version mismatch                    | Restoration refuses incompatible marker                                                        |
| Crash after effect                  | Actual application SIGKILL; saved decision remains; next callback observes one existing record |
| Four concurrent resumes             | Four distinct application workers, one native resumption and one callback                      |
| Completed record deleted            | Cached retry returns unknown, with no new record                                               |
| Conflicting repeat decision         | Persisted approval cannot be replaced by rejection                                             |
| Checkpoint from another workflow    | Changed native checkpoint refuses against the target's saved digest                            |

The first killed process has no effects in all 24 rows. Observation comes from real Redis read-back
and the key count in each disposable database; callback counts come from the committed application
ledger. These are different measurements. Replaying a callback does not imply a duplicate effect.

## Reproduce

Use Linux, Python 3.12 and Node 24. Keep the earlier SDK environment separate. From the repository root:

```bash
python3.12 -m venv /tmp/simurgh-assurance-workflow-venv
/tmp/simurgh-assurance-workflow-venv/bin/python -m pip install --require-hashes --only-binary=:all: -r tools/assurance-sdk/requirements.lock -r tools/assurance-workflow/requirements.lock
/tmp/simurgh-assurance-workflow-venv/bin/python -m pip check
bash tools/assurance-redis/install-redis.sh /tmp/simurgh-workflow-redis
export SIMURGH_REDIS_SERVER=/tmp/simurgh-workflow-redis/redis-server
export PYTHONPATH=tools/assurance-workflow:tools/assurance-redis:tools/assurance-durable:tools/assurance-sdk
export PYTHONDONTWRITEBYTECODE=1
/tmp/simurgh-assurance-workflow-venv/bin/python -m unittest discover -s tools/assurance-workflow/tests -v
/tmp/simurgh-assurance-workflow-venv/bin/python -m simurgh_workflow.study run --out /tmp/simurgh-workflow/report.json
/tmp/simurgh-assurance-workflow-venv/bin/python -m simurgh_workflow.study verify /tmp/simurgh-workflow/report.json
/tmp/simurgh-assurance-workflow-venv/bin/python -m simurgh_workflow.study verify docs/assurance/workflow/evidence/report.json
```

The extension lock constrains existing packages to the earlier lock's versions. Installation
requires network access; execution uses only disposable local Unix sockets. Workers receive no
credential environment. A Python Internet-socket/DNS guard is additional test isolation, not a
native-code or OS sandbox. Reports require fresh output paths and verification re-executes every
case, including process crashes; allow several minutes. No empty or partial inventory passes.

## Trust and limits

Checkpoints and policy belong to one trusted local operator. Stored hashes detect the tested
corruption/substitution; they are neither authentication nor encryption. A host attacker who can
replace the ledger can replace its digest or policy. Raw native snapshots remain sensitive
application data and are not published in the report. Only synthetic fixture data is used.

Revocation is a trusted local flag with serialized ordering. It neither authenticates a human nor
rolls back an already committed effect. Whole-store rollback, multiple hosts, failover, power loss,
network filesystems, arbitrary checkpoint migration, external approvals, multi-agent workflows and
paid/live-model behavior are outside this experiment. Initialization and every intermediate crash
window are not exhaustively tested. A SIGKILL test does not validate hardware persistence.

The original file and Redis source/report artifacts stay frozen. The earlier Redis pending-intent
crash/race follow-up remains open: this phase kills after connector completion, not between its
intent and receipt commits. Same-code replay and a second local reviewer are not external
operator reproduction or independently authored evaluation.

## Next evidence

A named `external_workflow_reproduction` record should capture an outside operator's setup,
versions, failures and complete report comparison. A `multi_step_workflow_crash_matrix` should
add more than one approval/effect boundary before broadening the workflow claim. Authenticated
approval identity and measured integration overhead remain necessary for deployment decisions.

Subjective scorecard: reproducibility **8/10** (raise with external replay), workflow recovery
**7/10** (raise with the multi-step crash matrix), operational realism **5/10** (raise with an
authenticated remote approval fixture), novelty **2/10** (established mechanisms, new project
failure evidence). These are engineering judgments, not vendor acceptance scores.

See [validation](VALIDATION.md), [sources](SOURCES.md), and the
[design contract](../../superpowers/specs/2026-10-15-assurance-workflow-design.md).
