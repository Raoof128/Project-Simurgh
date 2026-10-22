# Phase 9: composed signal, context and credential controls

Declared 16 October 2026 (Australia/Sydney), baseline `f497775f`, following the
user's approval to compose phases 6–8 before fresh model evaluation. Apply Simurgh
Arise, the change protocol and inline executing-plans/TDD discipline. Preserve all
frozen predecessor source, protocols and evidence. Use the existing authorized topic
branch and publish commits/results without another approval roundtrip.

## Design and acceptance

Reuse the actual `SignalGate`, `ContextGate`/`Session`, `Gateway` and authenticated
continuous-policy `Service`. Build versioned adapters under `tools/assurance-composed/`.
Two exact actions share one context budget and one authenticated service credential.
Each route has its own signal state and credential gateway. A trusted orchestration
object serializes dispatch and control changes with an advisory file lock. Before
multi-control mutation it durably sets a hold; clear only after successful completion.
Exceptions or process death leave that hold active, including after reopen. There is
no automatic recovery from partially applied authority updates: use a new reviewed task.

Pipeline: native isolated proposal → composed admission → context/lineage gate →
route signal gate → exact credential gateway → authenticated receiver transaction.
A separate credential-only control bypasses the new context/signal/composition gates.
Both controls retain native isolation and the same continuous receiver policy.

Adapters persist exact immutable policy/binding records for the old host interfaces.
They validate gateway configuration on reopen. Receiver `denied` maps conservatively
to context `blocked`; raw credential-gateway status remains `denied` and is published.
Remote revocation uncertainty raises through the signal interface so it records
`revocation_unknown`, never an acknowledgment inferred from a local stop.

Any action already admitted can finish before a control update acquires the pipeline
lock. A timed-out request may still execute remotely. Receiver credential revocation
retains phase 8's commit-bound guarantee; signal/context updates do not undo effects.
Unknown attempts reserve budget. A signal hold consumes admission budget conservatively
when encountered after context admission. Reopening never refunds or resends an intent.

Exact ordered matrix: 20 cases × `credential_only`, `composed` = **40 rows**:
`authorized_child`, `authorized_grandchild`, `signal_stop`, `pending_alert`,
`expired_monitor`, `operator_restart`, `restart_after_credential_revoke`,
`ancestor_revoke`, `source_change`, `omitted_failure`, `shared_budget`,
`unknown_then_sibling`, `credential_revoke`, `credential_expiry`, `session_cancel`,
`lost_ack`, `stop_after_delivery`, `revocation_outage`, `interrupted_transition`,
`forged_summary`.

Retain nine raw databases per row: service, pipeline, context, two policy adapters,
two signal gates and two credential gateways (**360 snapshots**). Check every schema
and table, exact identities, raw receiver effects, leaf outcomes and mandatory fresh
native replay. Bind inherited phase 6–8 protocol source sets and every new Python file.
Freeze committed source/protocol before the retained execution. Keep partial failures.

Tests must cover missing components, mismatched binding, receiver denial translation,
unknown remote acknowledgment, restart persistence, interrupted updates, shared budget,
no automatic resend, concurrent admissions/updates, native isolation and evidence
mutation/coordinated forgery. Model generation, production identity/TLS, independent
custody, control-state rollback and malicious host/admin are outside scope.

## Plan and interface rulings

1. Write failing composition tests, then adapters/orchestrator. Construct real owned
   receivers in disposable directories. Exercise reopen, multi-control hold, denial
   translation and signed alert/restart paths. Expected: real effect and state assertions.
2. Write failing exact-matrix tests, then fixture/observer. Expected: all 40 identities,
   correct effects/unknowns, nine complete snapshots per row and worker isolation probes.
3. Write failing evidence tests, then source-bound archive/replay CLI. Expected: rejects
   missing/extra/raw/summary/source/coordinated changes; unchanged inputs replay exactly.
4. Run focused tests, inherited phase 6–8 checks, Ruff, pinned dependency compatibility
   and repository npm suite. Request one fresh whole-change review under executing-plans;
   record incomplete/declined scope accurately. Reproduce important findings before fixes.
5. Freeze source/protocol, run once with retained failures, separately verify archive,
   publish results/navigation and hosted CI receipt. Do not claim new model results.

Preflight interfaces: Phase 7 requires `policy(identity,approved,control)` and accepts
only observed/blocked/unknown/invalid; Phase 6 reads four policy columns and calls
no-argument revoke. Phase 8 uses config and explicit revoker. New adapters bridge these
exact interfaces without changing predecessors. Costs: Linux/trusted inode locking,
serialized RPCs, conservative budget consumption and no automatic partial-update recovery.

The OpenAI needs review N02/N04/N05/N06 and its primary-source/standards/incident map
motivate composition; the phase 8 vault/environment sources were rechecked this session.
This is integration evidence, not a novelty claim or validation of vendor internals.
An agent-platform engineer can replay the owned workflow; representative provider
identity and deployment routing are the blockers to direct production adoption.

## Write scope and gate lifecycle

Add `tools/assurance-composed/**`, `docs/research/composition-phase-9/**`, this ledger,
and `.github/workflows/assurance-composed.yml`. Modify current README/ROADMAP/reviewer
index, package.json and both logs. P9-CI01 permits modifying only `current` in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` for the exact new
CI identity `assurance-composed.yml::Validate composed lifecycle controls`; preserve
all non-current fields. This declaration must be a strict ancestor of that edit.

| Field                         | Declaration                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| active_phase                  | Phase 9 composed lifecycle                                        |
| protected_surface             | New source/tests, protocol and retained artifacts                 |
| next_phase_behaviour          | Successors add namespaces and preserve this replay                |
| maintenance_behaviour         | Bounded repair authority precedes frozen changes                  |
| sunset_or_migration_condition | Versioned successor preserves scope/evidence                      |
| anti_vacuity_condition        | Exact 40 rows, 360 raw snapshots, negative tests and fresh replay |

## Execution ledger

- Ruling: inline work with one fresh final reviewer; use this tracked ledger instead
  of unavailable skill helper scripts. Existing topic branch is isolated from main.
- Ruling: Phase 8's interrupted review stays explicitly incomplete; a new composition
  review does not retroactively certify all Phase 8 surfaces.
- Prior broader readiness run 38840727954: 12 jobs passed; workflow-recovery still
  running at preflight. No final success claim yet.

## Implementation progress

- Tasks 1–3 implemented after missing-component tests failed. Eight initial adapter/
  composition tests and the complete 40-row native matrix passed before evidence work.
- Evidence tests exposed an empty pipeline state raising an untyped indexing error;
  the observer now explicitly rejects invalid state cardinality. Mutation fixtures now
  alter empty-table schema instead of deleting zero rows. All 17 tests passed before
  final lint formatting; final formatted checks and inherited suites are running.
- Ruling: cached context success can return the prior observation after a signal stop,
  with no new receiver call. The stop-after-delivery row reports that historical result
  and one total effect, not successful delivery after stopping. This preserves the
  frozen context cache semantics rather than inventing a stronger cancellation claim.
- Four extra regressions exercise process exit inside an update, update ordering across
  reopened pipeline instances, policy rebinding and monitor state after a boot change.
- P9-CI01 adds exactly one live census identity (44→45); no predecessor code is changed.
- A formatter removed an indirect Service import used by the fixtures; direct imports
  corrected the resulting import failure before protocol generation and final checks.

- Final pre-review checks: all 17 focused tests passed (43.616 seconds under parallel
  load); inherited phase 6/7/8 suites passed 24/25/24. Repository suite passed 5,122,
  zero failures, three prerequisite skips. Ruff and 62 pinned packages pass. Protocol
  preflight and unchanged non-current census fields verified. Source freeze pending review.
- Prior Phase 8 broader readiness run 38840727954 now succeeded, all 13 jobs.

## Fresh review and freeze disposition

- Fresh whole-change review of `f497775f..9a50d5d9` reported no Critical, Important
  or Minor findings. It independently passed all 17 focused tests and current/committed
  source bindings. Three additional probes are now retained in `tests/test_review.py`.
- The additional probes interrupt the dispatch stack with SystemExit before sending
  and after an actual receiver effect, then reopen with unknown intent and no resend
  or budget refund. These are stack-interruption probes, not process-kill claims.
  A third interrupts an update after stopping route A; route B remains globally held.
  The earlier boundary test separately exercises real process exit during an update.
- No production source changed after review. Adding the retained probe file expands
  the source/data bindings from 75 to 76; final focused tests follow before freeze.
- Ruling on unjudged scope: production identity/TLS/provider behavior, real clocks,
  malicious host/admin or state rollback, independent custody and model generalization
  remain outside this owned fixture result. Wrong deployment assumptions would defeat
  these bounds; require separate provider/operator experiments before such claims.
- Ruling on predecessor review: the reviewer inspected inherited interfaces only as
  needed for composition. Phase 8's interrupted exhaustive review remains incomplete;
  this clean Phase 9 review is not retroactive certification of predecessor internals.
- Final retained execution, archive and hosted results are checked by author/automation
  after freeze, not by the source reviewer. No deferred minor findings were reported.

- Final freeze checks: all 20 focused tests passed, including all retained review probes;
  76 source/data bindings pass preflight. Prior inherited suites and npm suite passed.
  Strict declaration ancestry, exact one added census identity and predecessor scope
  preservation passed. This source/protocol commit precedes the publication run.

## Retained execution and publication

- Source freeze `9c326a8cc384d52a685be3c51676ce13a6f38c8f` precedes the retained run
  in `/workspace/simurgh-research/phase-9/published-run`. All 40 rows completed and
  mandatory fresh replay matched. A separate verification of the copied archive passed.
- Composed final outcomes: four observed, 15 blocked, one unknown; seven actual effects.
  One observation is cached prior success. Credential-only: 14 observed, four denied,
  two unknown; 17 effects. Both retain four raw receiver denials; the composed adapter
  translates these to blocked. Initial unknowns remain visible outside final counts.
- Archive 378,443 bytes; 360 snapshots; 76 frozen bindings. Manifest SHA-256:
  `7fbcb77fcccc793100eb8f88839dea0a43df8b1701975e9ba1274377ca55d3be`.
- Canonical report equals archive bytes; all phase links and frozen/current source
  hashes pass. Only retained review tests changed after source review, no production code.
- [Results](composition-phase-9/RESULTS.md) include costs, scorecard and limits. Remaining
  work: fresh held-out model tasks, representative provider identity and outside custody.
  Hosted verification follows publication; no hosted Phase 9 result is claimed yet.

## Hosted verification receipt

Publication commit `1db778f5` passed [composed lifecycle run 38843557082](https://github.com/Raoof128/Project-Simurgh/actions/runs/38843557082).
The fresh hosted runner passed all 20 tests in 48.087 seconds, dependency compatibility
and committed-archive verification with fresh native replay: 40 rows, 360 raw snapshots,
manifest `7fbcb77fcccc793100eb8f88839dea0a43df8b1701975e9ba1274377ca55d3be`.

Broader readiness [run 38843556999](https://github.com/Raoof128/Project-Simurgh/actions/runs/38843556999)
was still running at receipt time: seven jobs passed, six pending, none failed. No
final success is claimed for that workflow. This receipt changes no frozen source,
protocol or artifact. Fresh model evaluation, provider identity, outside custody and
Phase 8's separate incomplete review remain open.
