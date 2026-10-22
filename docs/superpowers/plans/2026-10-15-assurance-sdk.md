# SDK integration execution plan

**Goal:** Execute the existing assurance corpus through two real approval/resume runtimes.
**Spec:** [Integration contract](../specs/2026-10-15-assurance-sdk-design.md).
**Architecture:** Python SDK adapters → persistent Node boundary → original disposable file sink.
**Tech stack:** Python 3.12, pinned OpenAI Agents SDK/LangGraph, Node 24, unittest/node:test.

## Constraints and review focus

Preserve all original assurance-lab and OpenAI report source bytes. No paid/model calls, deployment,
new release or independent-operator claim. Use the existing isolated cloud checkout. Prior push
authorization persists. Parent updates both change logs after complete verification.

Review exact decision parsing, schema loss on tool serialization, duplicate call identities,
approval before effects, resume with edited arguments, lifecycle checkpoint scope, bridge process
failure/EOF/timeouts/cleanup, no silent case loss, network denial and fair baseline information.

## Tasks

1. Parent: write failing bridge/process tests in tests/unit/assuranceSdk/bridge.test.js;
   implement tools/assurance-sdk/bridge.mjs using original exported policy/sink/corpus functions.
   Add Python bridge.py and network guard plus their tests. Expect strict bounded protocol,
   serialized duplicate rejection, clean close and exact projections of original cases.
2. OpenAI adapter owner: tests first, then openai_adapter.py using actual scripted Model,
   function tool approvals, RunState serialize/restore and Runner resume. Expect native approved
   callbacks, rejected no-callback, unique call ids for repeated action ids, unsupported edit.
3. LangGraph adapter owner: tests first, then langgraph_adapter.py with a side-effect-free interrupt
   node and separate execution node. Expect real checkpoint resume, native approve/reject/edit,
   strict decisions and original boundary retained.
4. Parent: write study/replay tests before study.py. Run 102 baseline rows and four lifecycle
   rows; retain unsupported edit as unsupported, compare executed projections with original
   baseline. Pin complete dependency hashes; reject altered/omitted report content.
5. Parent: add docs/assurance/sdk results, source/API notes, validation, reproducible setup and
   scoped CI. Recompute only the existing mutable workflow-census current set if needed.
6. Run Python integration tests under network denial, full npm suite, both original saved reports,
   SDK fresh replay, dependency consistency, formatting and diff checks. Fresh final reviewer;
   regressions for material findings. Update AGENT.md/CHANGELOG.md; commit/push and verify remote.

## Shared interfaces

Both adapter tasks produce the spec's run_actions function and documented result shape. Parent's
bridge supplies async execute/observe callbacks via thin async wrappers around bounded local IPC.
No adapter owns or updates policy authority. Package imports use PYTHONPATH=tools/assurance-sdk.
SDK versions and all transitive artifacts come from requirements.lock; no system Python mutation.

## Design scorecard

Targets follow the spec: reproducibility 8/10, integration evidence 6/10, realism 4/10,
differentiation 3/10. These are subjective targets, not measured vendor acceptance or achieved ratings.
