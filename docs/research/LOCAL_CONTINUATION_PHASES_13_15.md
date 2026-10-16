# Local continuation: reliability, privacy-aware export and validation

Declared 16 October 2026 (Australia/Sydney), baseline `190f1de5`, under the user's
instruction to complete all locally executable phases and tests consecutively. The
previous broad readiness run 38846752700 has now succeeded, all 13 jobs. Preserve all
frozen predecessor source, protocols, captures and signed/historical evidence. No paid
inference, external probing, provider key, deployment, merge or outreach is needed.

## Design and alternatives

The [current gap map](presentation-phase-12/GAPS.md) and the [dated 29-source public
review](OPENAI_NEEDS_2026-10-16.md) identify operational reliability (N02), privacy-aware
export (N11), and portable outcome interchange (N12) as useful local work. The source
review covers standards, incidents, prior art and published buyer needs; this plan adds
no claim of exhaustive coverage or new market novelty. An external evaluator can use
a minimal export tomorrow, but presently has to handle the complete raw transcript and
receiver databases. An operator can run composed controls, but lacks repeated queued/
concurrent restart observations with explicit timing limits.

Options considered: more model sampling would leave custody/realism gaps and repeat
an already measured axis; live provider testing needs project entitlements and endpoint
configuration that a key alone does not supply. Choose bounded reliability plus an
explicitly reduced evidence view and a complete inventory of executable local checks.
This pays local evidence/portability gaps without relabeling them external validation.
The next stronger version needs independent custody, live provider integration and
externally held multi-model/multi-step tasks; none can be claimed from these phases.

### Phase 13: bounded concurrent/restart reliability

Reuse the unchanged Phase 9 real pipeline/owned authenticated receiver and native SDK
approval/isolated-worker delivery. Six schedules, five repetitions, two controls
(`credential_only`, `composed`): **60 fixtures**, **210 final native calls**, **10 initial
lost-acknowledgment calls**, **600 raw snapshots** (initial service plus nine final DBs).

- `authorized_reopen`: reopen the pipeline, one approved A call; both observe one effect.
- `parallel_retry`: release four queued A calls; all report observed, receiver has one effect.
- `parallel_siblings`: release A/B/A/B; credential-only has two effects, composed one shared
  budget reservation. Either composed route may win; retain the actual winner.
- `queued_stop`: queue A/B/A/B behind a barrier, apply composed stop, then release. Baseline
  omits that reaction and produces two effects; composed produces none. This is queued
  work, not a claim that already admitted work is interrupted.
- `update_process_kill`: a trusted child enters the actual durable pipeline update, signals
  that the hold is committed, then waits. Kill only that owned child and reopen. Both
  fixtures retain the durable hold; credential-only bypasses it and produces two effects,
  composed produces none. Record the process exit and all raw hold/event state.
- `lost_ack_reopen`: initial A commits but loses acknowledgment; retain its unknown result
  and initial effect. Reopen, release A/B/A/B; A stays unknown, composed blocks B, baseline
  permits B. Initial/new effects remain distinct; never refund the reservation.

Four worker threads perform separate native deliveries; the update interruption uses
an actual killed process. The fixture clock stays at 100 to isolate scheduling from
lease expiry; this is not sustained real-time monitor coverage or a production load test.
Capture per-call enqueue/start/end monotonic offsets and elapsed time, report observed
medians and nearest-rank p95 with sample counts. These are host observations, not portable
latency guarantees. Calls, exceptions and incomplete outputs are retained; no selective retry.

Source/protocol freeze precedes the retained run. Verify raw tables exactly against the
published row, exact schedule/call inventory, effect content, state and expected invariants.
Fresh schedule execution must satisfy those same invariants, **not** equal original timing,
thread ordering or winner. Label this fresh schedule validation rather than byte-identical
replay. The source-bound raw report remains byte/hash checked. A compromised producer can
forge a whole run; these receipts do not establish outside observation or truthful timing.

### Phase 14: explicit privacy-aware outcome projection

Export the verified Phase 10 capture into a strictly allowlisted public outcome view.
Exclude prompts, report content/tool arguments, free-form reasons, token IDs, original
text IDs, raw database state and fixture bearer material. Use ordinal task/generation IDs,
fixed outcome/control/state enums and counts. Retain all 144 branches, four initial unknown
results/effects per control, model proposal outcomes, final outcomes and matching metric
denominators. Compute authorization from trusted state and raw effect content before
omitting content; an unknown acknowledgment is not unauthorized by itself.

The exported format declares every omitted field class and what can no longer be checked.
Public-only validation checks schema, exact inventory and aggregate consistency, but cannot
validate original authorization content, raw effects, inference origin or omission honesty.
With the pinned source archive, full source verification plus exact reprojection establishes
consistency with the supplied source. Bind the source root/protocol/capture hashes and the
export's exact digest. Digests do not make redacted evidence complete or anonymous.

A JSON view and metadata-plus-JSONL representation round-trip without losing outcomes.
This is a project-defined versioned interchange contract, not a claim of Promptfoo or
other vendor compatibility. Tests inject synthetic secret canaries into omitted fields,
reject unknown/extra fields and altered outcomes/counts, retain declined/denied/unknown/
error distinctions and verify round trips. Do not use real secrets or personal data.
No real-data retention/access-control deployment is established by this projection.

### Phase 15: consolidated local validation and handoff

Discover and pin the exact maintained Python tool test-directory inventory; run each in
its own process to prevent generic module-name collisions. Run the full npm unit suite,
applicable offline reproduction checks and the repository aggregate gates where their
prerequisites are available. Retain commands, exit status, passed/failed/skipped counts,
logs and reasons for unsupported/unrun checks. A successful zero-test discovery is a
failure. Do not run paid API capture commands or regenerate frozen evidence. Historical
platform/toolchain/live-service requirements must be reported instead of called tested.
Update current presentation/navigation with observed results and explicit external gaps.

## Write authority and lifecycle

Add only `tools/assurance-reliability/**`, `tools/assurance-export/**`,
`docs/research/reliability-phase-13/**`, `docs/research/export-phase-14/**`,
`docs/research/validation-phase-15/**`, `.github/workflows/assurance-reliability-export.yml`;
update this ledger, current README/ROADMAP/reviewer navigation, npm commands and root logs.
P13-CI01 authorizes modifying **only `current`** in
`docs/research/llm-shield/evidence/stage-5q-q1/problem-gate-set.json` to add exact identity
`assurance-reliability-export.yml::Validate reliability and evidence export`, reason
`missing_committed_universe_query`. Authority commit must strictly precede the edit.
No prior frozen source or evidence modification is authorized by this declaration.

| Field                         | Declaration                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| active_phase                  | Phases 13–15 local continuation                                                                                     |
| protected_surface             | New reliability/export source, protocols and retained evidence                                                      |
| next_phase_behaviour          | Successors use new namespaces; existing verification remains scoped                                                 |
| maintenance_behaviour         | Declare exact bounded repair before any frozen change                                                               |
| sunset_or_migration_condition | Versioned successor retains prior receipts and limitations                                                          |
| anti_vacuity_condition        | Exact 60 reliability rows/210 final calls/600 snapshots; complete 144-branch export; nonzero named test inventories |

## Execution plan and ledger

1. Commit this declaration before implementation and census mutation. Tests first for
   real schedule mechanics, full raw observation, inventory/timing checks and evidence.
2. Implement exporter with synthetic privacy canaries, exact schema and JSONL round-trip
   negatives. Freeze no predecessor changes; review both new components together.
3. One fresh whole-change reviewer before freeze; reproduce and correct substantial
   findings test-first. Freeze both source sets, retain one full reliability run and
   source-verified export; independently verify and publish both outcomes.
4. Execute the consolidated maintained test/reproduction inventory and applicable aggregate
   gates. Diagnose failures without changing frozen evidence. Record hosted results.
5. Update claim/evidence navigation and gap status, commit/push the authorized topic branch.

- Ruling: use queued thread concurrency plus an actual killed update process, with a fixed
  fixture clock — isolates admission/order semantics; leaves representative deployment load open.
- Ruling: fresh scheduling checks invariants rather than timing/order equality — preserves
  genuine concurrency; timing and complete-run provenance remain same-operator observations.
- Ruling: export an allowlisted derivative with explicit lost verification capabilities —
  prevents accidental free-text disclosure; does not prove anonymity or replace raw evidence.
- Preflight: Phase 13 consumes the frozen Phase 9 fixture and Phase 10 raw observer; Phase 14
  consumes the frozen Phase 10 verified capture. Their namespaces and evidence do not overlap.
- User's standing instruction supplies continuation authorization; routine design/plan choices
  proceed without another approval round. Paid/live external operations remain out of scope.
