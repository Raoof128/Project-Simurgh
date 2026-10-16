# Phase 7: authority and evidence across context changes

Declared 16 October 2026 (Australia/Sydney), baseline `b8645bbe`, under the user's
instruction to continue implementing and testing the phased roadmap.

## Design and scope

N04/N05 in [the OpenAI needs review](OPENAI_NEEDS_2026-10-16.md) motivate this
phase. The linked official compaction reports describe self-generated instructions
and concealed failures; Agents API documentation describes inherited tools,
credentials and shared filesystems. A summary is data, not an authority source.
The existing source register also covers standards, incidents, prior art and buyer
requirements. This phase introduces no novelty or live-product compatibility claim.

Use a trusted durable SQLite ledger beside the existing exact-action hosts. A
host-owned checkpoint binds task, source version, configuration, grants, facts and
all admitted attempts. Resume validates this checkpoint against current durable
state. A structured model-summary projection is checked field by field; discrepancies
are retained while authoritative output always comes from the ledger. Free-text
notes are untrusted and never interpreted as permission. This is not semantic lie
detection. Legitimate work may continue despite a dishonest note or summary claim
when the host state permits it; a blocking failure cannot disappear that way.

The trusted orchestrator selects actor identity, outside tool arguments. A fixed
registry binds permitted parent/child relationships to this task. Delegation can
only narrow the parent's exact action set, to a registered child, at depth at most
two. Existing grants are immutable. Revoking any ancestor disables descendants.
Source changes invalidate existing sessions and grants. Session construction and
registry provisioning are trusted application operations, not model-accessible tools.

Every actor shares a root budget of one distinct action. Reserve an attempt and
charge the budget transactionally BEFORE calling the existing exact-action host.
Unknown/crashed attempts retain their reservation. A duplicate authorized handoff
returns the existing status; it does not resend or allocate a new budget. Two
separately owned receivers make aggregate effects observable: each exact host can
permit its own action, but the integrated lineage may admit only one. This is an
explicit action-count constraint, not inferred cumulative semantic harm.

Only side-effecting calls through this boundary are covered. Trusted host/storage,
actor routing, configuration and checkpoint custody are assumed uncompromised.
Same-operator hashes are not independent custody or rollback-proof storage.
Already admitted remote work can finish after revocation. No live model, OpenAI
compaction API, Agents API subagent, credential or real third-party incident is used.
Native Agents SDK approval/resume and isolated workers exercise local tool dispatch.
Broken-task recognition by a model (N03) remains open; a trusted missing-input fact
only tests propagation of that known condition.

## Exact experiment

Two policies: `local_only` (existing exact-action hosts) and `integrated` (new
context/lineage gate plus those hosts). Both receive identical scripted proposals.
Exactly 18 cases per policy, 36 rows:

`honest_resume`, `authorized_child`, `authorized_grandchild`, `forged_approval`,
`omitted_failure`, `fabricated_success`, `stale_checkpoint`, `changed_source`,
`changed_task`, `cross_task_peer`, `sibling_overreach`, `unapproved_delegate`,
`revoked_parent`, `shared_budget`, `duplicate_handoff`, `unknown_effect`,
`missing_input`, `nonblocking_failure`.

Retain both raw receiver databases and the complete normalized controller database
per row: 108 snapshots. Record summary discrepancies, prior/final results, grants,
facts, reservations and observed effects. Keep unknowns and all failed published
runs. Verification checks exact case/policy identities, complete raw table/schema
contents, source commit and hashes, and fresh native replay of every row. Counts
are fixture outcomes, not attack success rates or model generalization.

## Implementation plan

Execute inline, followed by one fresh whole-change review. This tracked design is
also the execution ledger; development logs live outside the checkout at
`/workspace/simurgh-research/phase-7/`. Preserve failures for diagnosis.

1. **Ledger and sessions.** Add `tools/assurance-context/context_gate.py` and
   `tests/test_context.py`. Test first: absent implementation fails; honest resume
   succeeds, forged approval cannot expand grants, blocking/unknown facts survive,
   stale/task/source checkpoints fail, parent revocation propagates, shared budget
   serializes concurrent admissions, duplicate handoffs do not resend, and a killed
   process leaves an unknown reservation. Implement `ContextGate.create(path, hosts,
actions, task, source, registry, budget=1)`, reopen constructor, `checkpoint()`,
   `projection()`, `resume(actor, checkpoint, summary)`, `record_fact`, `change_source`,
   `revoke`, plus `Session.delegate(child, action_ids)` and `Session.dispatch(action)`.
   A denied resume returns a blocked session with attributable reason.
2. **Native experiment.** Add `experiment.py` and `tests/test_experiment.py`.
   Test exact 36-row inventory, declared outcomes, receiver effects and discrepancy
   preservation before implementing `execute(output)` and `validate(rows)`.
   Each native dispatch uses the existing worker; never give it state or credentials.
3. **Evidence.** Add `evidence.py` and `tests/test_evidence.py`. First fail tampered
   inventory, report, raw state, summary and source-binding tests. Implement the
   existing archive format with a new phase-specific verifier, protocol and CLI.
   Freeze source/protocol in Git BEFORE the retained execution. No source edits
   after freeze without a new preceding repair declaration.
4. **Review, checks and publication.** Review hostile summaries, grant cycles and
   lineage, check-to-admission races, crash windows, missing evidence, independent
   replay and standalone CLI. Reproduce important findings before repair. Run all
   focused tests, Ruff, dependency compatibility and `PYTHONDONTWRITEBYTECODE=1 npm test`.
   Publish report/pack/root/receipt/results, verify separately, add scoped CI, push,
   and record actual hosted outcomes. No merge, deployment or external submission.

Preflight interfaces: native delivery consumes only `dispatch(action)`; exact hosts
remain responsible for action identity/content and bounded RPC. The raw observer
allows one effect per receiver, so two receivers are observed separately. Root
budget is checked across both. Summary discrepancies never replace raw observations.

## Write scope and lifecycle

Add `tools/assurance-context/**`, `docs/research/context-phase-7/**`, this document
and `.github/workflows/assurance-context.yml`. Update current README, ROADMAP,
reviewer index, package.json and both change logs as required.

Maintenance P7-CI01 authorizes modifying only `current` in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` to add the new
exact CI step and refresh live telemetry. Preserve baseline and all other fields.
This declaration's commit must be a strict ancestor of the census edit.

| Field                         | Declaration                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| active_phase                  | Phase 7 context and delegation                                               |
| protected_surface             | New tools/tests, protocol and retained evidence                              |
| next_phase_behaviour          | Successors add namespaces and retain this replay                             |
| maintenance_behaviour         | Bounded repair declaration must precede frozen edits                         |
| sunset_or_migration_condition | Versioned successor preserves evidence and scope                             |
| anti_vacuity_condition        | Exact 36 identities, 108 snapshots, raw checks, negative tests, fresh replay |

## Decisions and ledger

- Ruling: implement a host-owned structured projection, not semantic truth detection.
  It gives mechanically checkable omissions and contradictions; free-text deception
  and model recognition remain unmeasured.
- Ruling: use exact action-count budget and two owned receivers. This tests cumulative
  lineage admission, not arbitrary multi-step harmful outcomes.
- Ruling: retain unknown reservations without automatic retry or budget refund.
  This prevents duplicate uncertain work at the cost of conservative availability.
- Ruling: continue on the clean existing topic branch with inline implementation.
  The user already authorized phased implementation and push; no redundant approval
  roundtrip. Skill helper scripts are unavailable locally; the tracked ledger records
  decisions and tests. No historical frozen source/evidence will be edited.
- Review focus: forged identity through tool payload, source/checkpoint mutation,
  cyclic/duplicate grants, revocation and concurrent dispatch, exception/crash state,
  summary omission, raw table edits, report inventory and replay laundering.
- Progress: design declared; implementation pending.

- Task 1 complete: 14 controller tests pass, including real process exit after
  reservation. Source label restoration first reproduced grant reactivation, then
  passed after source changes permanently revoked all existing grants.
- Task 2 complete: exact 36-row native matrix passes; 108 raw snapshots retained
  per development run. Five legitimate integrated cases complete; shared-budget
  siblings produce one effect instead of two; unknown reservations remain charged.
- Task 3 implementation: five evidence tests pass, including every raw table and
  coordinated report/database forgery rejected by a fresh replay. Total 20 tests pass.
- Ruling: source changes permanently revoke old grants, requiring a newly authorized
  task to resume. This closes label-restoration reactivation at an availability cost.
- P7-CI01 adds exactly one live gate identity (42→43), none removed. Baseline and
  non-current fields are preserved. The classification limitation remains recorded.
- Source freeze and retained published execution are still pending review.

## Review and source freeze

Fresh whole-change review of `b8645bbe..77d1e4f6` found no Critical, Important or
Minor defects within the declared boundary. The reviewer independently ran 20 tests
and additional identity, duplicate/cyclic grant, depth-three, in-flight revocation
and unexpected-exception probes. Those five probes are now retained as regression
tests; the author ran all **25 tests**, passing in 24.238 seconds. No production code
changed after review. Ruff and the 62-package dependency check pass. The repository
suite passed 5,122 tests, zero failures and three existing prerequisite skips.

- Ruling on review limits: unpublished evidence and hosted status will be checked
  separately after this source freeze. Live model behavior, semantic deception,
  actual compaction/Agents API integration, compromised trusted orchestration/storage,
  rollback resistance and independent custody remain outside this result. Cost:
  only the stated local engineering claims are supported.
- Task 3 complete: raw verification and fresh replay reject the declared mutations.
- Task 4 progress: reviewed source and protocol bind 47 source/data files; the next
  commit freezes them before any retained published execution. Historical artifacts
  and implementations are unchanged. No deferred minor findings.
- Prior-phase status update: readiness run `38832945810` completed successfully with
  all 13 jobs, closing the pending status recorded at the end of phase 6.

## Retained execution

Source/protocol freeze: `a43220d8`. One subsequent retained run completed all
36 rows and passed mandatory fresh replay. A separate verification of the copied
publication archive passed too. It retains 108 raw SQLite snapshots with 47 unchanged
source/data bindings. Archive size: 92,947 bytes; manifest SHA-256:
`2eeff1f45fe67c7c192db2cc6ec25984f8125dc1c6f27fc47d7b1d8fb397fdb7`.

Integrated outcomes across 18 cases: five final deliveries, 12 blocks, one final
unknown; six total receiver effects including the earlier sibling action. The
local-only control records 17 final deliveries, zero blocks, one final unknown and
18 effects. Five structured summary discrepancies per policy include three false
claims and two stale-context mismatches. These are engineered cases, not detection
or utility rates. [Results](context-phase-7/RESULTS.md) preserve the detailed limits.

Implementation, fresh review, frozen execution and separate verification are complete.
Phase 8, fresh model experiments and independent custody remain open. The final archive was checked by the author, not an outside operator.

## Hosted verification receipt

Publication commit `8b04e791` passed
[context/delegation run 38836069448](https://github.com/Raoof128/Project-Simurgh/actions/runs/38836069448).
The fresh hosted runner passed all 25 tests and verified the committed archive with
fresh replay, 36 rows, 108 raw snapshots and manifest hash
`2eeff1f45fe67c7c192db2cc6ec25984f8125dc1c6f27fc47d7b1d8fb397fdb7`.
This is project-operated automation on another machine, not outside custody.

The broader [readiness run 38836069319](https://github.com/Raoof128/Project-Simurgh/actions/runs/38836069319)
was still running at this receipt: seven of 13 jobs passed, six pending, none failed.
Its final outcome is not claimed. The previous readiness run `38832945810` passed
all 13 jobs but does not substitute for this run. Phase 7 implementation, scoped
hosted verification and publication are complete; broader CI status remains explicit.
