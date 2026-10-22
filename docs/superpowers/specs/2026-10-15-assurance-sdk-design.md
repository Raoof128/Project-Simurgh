# Assurance SDK integration contract

The owner approved proceeding to the next phase: two actual SDK integrations against the
existing real-effects workload. This is compatibility and evaluation infrastructure, not a
new security mechanism, live model benchmark or production gateway.

## Design choice

Keep the six hashed assurance-lab modules and saved v1 report unchanged. A new line-oriented
Node bridge owns the original policy and child-process file sink. Python adapters use actual
OpenAI Agents SDK and LangGraph approval/resume machinery and call the same persistent bridge.
Scripted proposals avoid paid inference and make failures exactly reproducible. Reimplementing
policy independently in each SDK would confound the comparison; live-model evaluation would add
sampling and spending before this integration contract is tested. Both are outside this phase.

Pin openai-agents 0.23.1 and langgraph 1.2.15 with a complete artifact-hash dependency lock for
Python 3.12. SDK documentation and installed source define supported behavior. OpenAI's public
RunState approval API has no in-place argument-edit parameter: record that operation as unsupported,
and test changed arguments as a separate tool call. LangGraph supports edits through the resume
payload. Do not simulate a missing native API with undocumented state mutations.

## Shared interfaces

Bridge requests are newline-delimited JSON, bounded to 64 KiB per line, with an integer id and an
operation. Initialize exactly once with a known corpus scenario id and control mode; authority
comes from the fixture, never from tool arguments. Execute accepts only an action, snapshot reads
the sink, finish applies the original declared trace mutation and scores actual observed effects,
and close cleans up. Requests execute serially; duplicate action ids therefore reach the one
session's policy. This is session-local replay protection, not durable or distributed at-most-once.
EOF, malformed requests and unexpected sink failure must not manufacture a clean report.

Python adapter signature:

```python
async def run_actions(actions, execute, observe, *, decisions=None): ...
```

`execute(action)` and `observe()` are async trusted host callbacks. Decisions default to approve
for each scripted proposal, or contain explicit approve/reject/edit objects. A result records
framework name, interruption/resumption counts, state roundtrips, decisions, actual tool results
and observations taken while paused. Invalid decision shapes fail closed. Rejected calls never
invoke execute. The callbacks retain the original bridge across resumes; editable framework state
never reconstructs authority. Unique SDK call ids ensure duplicate action ids are not hidden by
framework call deduplication.

OpenAI uses Agent, Runner, a scripted Model, needs_approval, public RunState serialization and
restoration, then approve/reject/resume. LangGraph uses StateGraph, interrupt, InMemorySaver and
Command(resume=...). Its approval node has no effects because that node restarts on resume;
a separate execution node performs the host callback. Its checkpoint remains in process and
does not count as a serialized restart or durable recovery.

## Acceptance matrix

Both runtimes execute all 17 original cases under all three controls: 102 case/control/runtime
rows. Compare authority, trace, observation, attack-application status, benign completion and
verdict against the unchanged 51-row baseline. Framework decisions are separately recorded;
they need not match the original direct runner's bookkeeping, especially on intentional faults.

For each runtime also test native rejection and native edit under exact policy. LangGraph edit
must reach the boundary with changed arguments and be denied. OpenAI edit is an explicit unsupported
result, excluded from executed-operation counts. Approval pause observations and callback-order
assertions must demonstrate no premature effects. Same-host unknown observations stay unknown.

Python network connections are forbidden during tests and experiment execution; tracing is disabled.
Node bridge/sink code has only local IPC/filesystem paths, with no model/network transport.
Persist the complete report, source manifest and actual pinned SDK versions. Replay validates the
full matrix and source/lock identity; elapsed time and random SDK ids are not deterministic evidence.

## Gate lifecycle

| Field                         | Declaration                                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Additive assurance SDK v1 integration and maintenance                                                                                                                                                                       |
| protected_surface             | tools/assurance-sdk/**, tests/unit/assuranceSdk/**, docs/assurance/sdk/\*\* and scoped CI/package wiring                                                                                                                    |
| next_phase_behaviour          | Continue checking only this pinned compatibility contract; new SDK versions require new evidence and an explicit update                                                                                                     |
| maintenance_behaviour         | Tests before fixes; refresh this source-bound SDK report after reviewed changes; preserve prior lab hashes and frozen stage authority                                                                                       |
| sunset_or_migration_condition | Document migration to a versioned successor, retaining the prior result's source identity and limitations                                                                                                                   |
| anti_vacuity_condition        | Real framework interruptions/resumes; effect-free pauses; all 102 named baseline projections equal; rejection and edit outcomes explicit; unsupported distinct from passed; tampered report rejected; no paid/network calls |

## Scorecard and limits

Subjective targets: reproducibility 8/10 (pinned fresh replay), integration evidence 6/10 (two native
lifecycles), empirical realism 4/10 (synthetic disk writes), differentiation 3/10 (no advantage claim).
Higher scores need external reproduction, live connector workloads, held-out attacks and measured
incremental benefit. This retires the two-runtime integration milestone for the declared versions;
durability, enterprise identity, independent operators and live models remain unproved.
