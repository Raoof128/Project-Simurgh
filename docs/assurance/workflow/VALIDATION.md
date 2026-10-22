# Persisted workflow validation — 15 October 2026

The target is Linux, Python 3.12, Node 24, Redis 8.10.2, OpenAI Agents SDK 0.23.1,
LangGraph 1.2.15 and its official SQLite checkpointer 3.1.2. Proposals and decisions are synthetic.
There is no API key requirement or live model capture.

## Method

Each report case starts a fresh Redis instance and workflow directory. The application starts
in a new process, reaches an actual native interruption, persists checkpoint bytes and commits
the application ledger. The harness reads its ready result, kills that process and verifies exit
`-9`. A different process restores the saved approval checkpoint. PID inequality is asserted at
runtime; unstable PID values are omitted from the deterministic report.

The post-effect fault is an actual SIGKILL inside the callback, after Redis effect and connector
receipt completion but before returning the result to the SDK. The application ledger retains the
approval and first callback count. Restoration replays from the original approval boundary; its
second callback returns an existing Redis record. This is not a kill between connector intent and
receipt, nor a guarantee for every SDK intermediate state.

Four-worker cases start distinct ready-gated application processes and require one native resume,
one callback and one Redis key. Terminal retries have no fresh tool result. Missing completed
effects return unknown; rejection, denial, refusal and unknown remain distinct outcomes.

## Integrity and source closure

The checkpoint length/digest and framework/version marker are checked before native restoration.
This assumes the application ledger is trusted. It does not authenticate a caller or protect
against an operator replacing both ledger and checkpoint. Only local synthetic snapshots are used.

The report hashes the new source/tests and dependency files, the previous Redis implementation
closure and the earlier saved Redis report. Its verifier requires the exact top-level schema,
complete 24-case inventory, matching source hashes and equality with an entire fresh execution.
Changed observations, omitted cases and added claims are rejected. Source-hash replay is not
independently authored ground truth.

The official extension lock was compiled against the frozen SDK dependency lock and installed
with `--require-hashes --only-binary=:all:` into a new virtual environment. The earlier SDK
virtual environment and dependency lock were preserved. `pip check` passed.

## Limits and unrun checks

Hosted CI, independent operator reproduction, authenticated human approvals, distributed revocation,
multi-host recovery, hardware/power failure, arbitrary checkpoint migration, broader multi-step
workflow crash coverage, paid/model calls and performance benchmarks are unrun. Python socket guards
are not OS isolation. The fixture has one approval and one consequential record operation.

The new CI step adds one census identity with reason `missing_committed_universe_query`. Only the
standing mutable current set was re-derived, 28 → 29; the immutable baseline remains 19. This
records a classifier limitation, not certification of the new CI step as a complete gate.

## Review and regression evidence

A fresh independent reviewer found no Critical or Important defect and one Minor cleanup defect:
LangGraph's worker-owned temporary checkpoint directory survived intentional SIGKILL outside the
parent fixture root. A regression first failed with no native scratch under the parent-owned root.
The fix places native working copies below that root. The same SIGKILL/recovery test then passed
and confirmed the parent removes the leftover SQLite files. Pre-fix scratch from this phase was
removed. This does not promise automatic cleanup for an arbitrary long-lived deployment.

A separate transport-outage regression confirms that a failed resumed callback leaves the workflow
paused with its saved approval. After Redis restarts with no record, a retry remains unknown under
the connector's pending-intent policy; it creates no effect and does not manufacture completion.

The cached-result test initially exposed reuse of the first tool result's `effectCreated: true` in
a cached response. It was changed to return no new tool result and zero native resumptions for a
cached completion; the regression passed. Callback execution and cached history are now explicit.

## Repository preservation checks

Full `PYTHONDONTWRITEBYTECODE=1 npm test`: **5,122 total, 5,119 passed, zero failed, three skipped**
(one real-browser parity check without Chrome, two proof/toolchain checks without Lean).
The previous Python suites also passed: **31 SDK, 16 durability and 14 Redis tests**.
All five earlier saved reports (OpenAI offline, file lab, SDK, durability and Redis) verified with
fresh execution. A diff against phase base `27aca221d27335527c25b357c01b2c78c2a903e1` confirms
that their implementation and artifact bytes remain unchanged.

The existing checksum-verified Redis binary was reused; each service startup checks its exact
version and a real PING response. The dependency comparison found no changed earlier package
version, only aiosqlite 0.22.1, langgraph-checkpoint-sqlite 3.1.2 and sqlite-vec 0.1.9 additions.
Ruff checks and Python formatting pass for the new source. Documentation and JSON formatting,
census and diff checks are part of final closeout. No environment configuration or credential
storage change was made in this phase.

## Final executed result

The corrected source passed **15 workflow tests**. This includes the complete 24-row study, fresh
full replay, refusal of tampered/missing/extra evidence, native process restoration, cleanup after
SIGKILL and unknown-state preservation. The saved report separately matches fresh application
processes and current source hashes. CLI existing-output and omitted-case checks both return 1.
All documentation/JSON formatting and diff checks pass. Hosted CI remains unrun locally.
