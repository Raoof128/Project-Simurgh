# Persisted SDK approval workflow recovery

The authorized next phase closes a project evidence gap: previous SDK examples restart only
executors. This experiment kills the application after a native approval checkpoint is persisted,
then restores that checkpoint in a fresh process using the same workflow identity. It uses
OpenAI Agents SDK 0.23.1 RunState serialization and LangGraph 1.2.15 with the official SQLite
checkpointer 3.1.2. Redis 8.10.2 remains the real local effect service. No model or key is needed.

## Selected design

Native checkpoint persistence is preferable to serializing our own imitation of a workflow.
An external orchestration service would broaden operational scope without improving this bounded
restart test. Use an immutable checkpoint at the approval boundary and a small SQLite application
ledger. Persist the exact checkpoint bytes, digest, length, framework/version marker, workflow ID
and action binding. Verify integrity and version before native deserialization. Checkpoints are
trusted local application data, never client input; hashes are not signatures or encryption.

The pause worker persists native state and commits the ledger before reporting ready. The parent
then SIGKILLs it and verifies exit -9. A fresh worker loads the saved state and applies a persisted
approve/reject decision. No tool callback may run before approval. LangGraph restores a copy of
the saved SQLite checkpoint using the same thread ID; OpenAI reconstructs the same agent/tool
configuration and loads RunState. Rebuilding code definitions is required by both frameworks.

Serialize cooperating application operations with a local POSIX lock. Persist the decision before
resuming; conflicting decisions are refused. The callback checks exact action, current policy
revision and a trusted operator's revocation flag immediately before calling the unchanged Redis
connector. Revocation updates use the same lock, making authorization ordering explicit. This is
local policy state, not authenticated human identity or distributed revocation.

On a crash after the Redis effect but before workflow completion, restore the original approval
checkpoint and reuse the committed decision. Execution after that checkpoint may replay. Redis
reconciliation must return the existing effect without another write. Do not claim arbitrary
workflow exactly-once execution or recovery from every intermediate native checkpoint. Once a
workflow completion is committed, retry checks the observed effect before returning cached status.
Rejected workflows must remain rejected and have no callback. Missing/corrupt checkpoint bytes or
version mismatch refuse restoration before SDK deserialization or service execution.

## Named cases and checks

For each framework: approved restart, rejected restart, revocation while paused, policy revision
changed while paused, checkpoint tamper, missing checkpoint, version mismatch, post-effect crash
and recovery, four concurrent resumes, completed-record loss, conflicting repeat decision, and
checkpoint substitution from a different workflow. Twenty-four named rows, with explicit attempt,
callback, native lifecycle, current effect and unknown/refusal outcomes. No percentage or statistical
power claim. Include automated transport/ledger tests and strict complete report replay/tamper
verification. Preserve earlier source and saved reports; add tools/assurance-workflow and
docs/assurance/workflow. Use a separate hash-locked extension environment preserving old pins.

## Sources, contribution and limits

The current official OpenAI human-in-the-loop guide documents serialization, trusted storage,
run binding, replay concerns and versioning. LangGraph documents SQLite persistence and replay
semantics. These mechanisms already exist. The contribution is a reproducible two-runtime
failure/recovery contract in Simurgh, not a new orchestration algorithm or competitor defect.
The 2026 industry map remains the broader source review; it records standards, prior art and
public technical needs without pretending to establish customer demand or novelty.

A framework integrator could use the fixture to reproduce this specific approval/effect boundary.
Independent authorship/replay remains the blocker to external validity. Same-host trusted files,
no rollback, no hostile operator, no power-loss/failover test, no authenticated identity, no real
LLM, no latency benchmark and no hosted production deployment. A single approval/tool workflow
is deliberately bounded; arbitrary multi-agent, long-running and version-migrated flows remain open.

| Field                         | Declaration                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive persisted SDK workflow v1                                                                                                                                        |
| protected_surface             | tools/assurance-workflow/**, docs/assurance/workflow/** and scoped CI/links                                                                                               |
| next_phase_behaviour          | Verify this pinned contract only; new workflows get separate evidence                                                                                                     |
| maintenance_behaviour         | Regression first; new source requires refreshed own evidence; old phases frozen                                                                                           |
| sunset_or_migration_condition | Explicit versioned successor with retained old evidence and migration tests                                                                                               |
| anti_vacuity_condition        | Actual SIGKILL after native checkpoint, different restoring process, no callback before approval, real effect, post-effect crash, exact 24-case replay and tamper refusal |

Subjective targets: reproducibility 8/10, workflow recovery evidence 7/10, operational realism 5/10,
novelty 2/10. Raise these with an externally operated reproduction, multi-step crash matrix,
authenticated approval fixture and measured integration cost, respectively.
