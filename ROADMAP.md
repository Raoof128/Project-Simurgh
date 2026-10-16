# Research roadmap

Use the [presentation guide](docs/research/presentation-phase-12/README.md),
[portable handoff](docs/research/handoff-phase-11/README.md) and
[current gap map](docs/research/presentation-phase-12/GAPS.md) for the Phase 10–12 closeout.
The clean-clone run and hosted Phase 10 verification both passed all 16 focused tests
and the complete saved-proposal replay. Live provider integration, outside custody,
broader model/task transfer and the interrupted Phase 8 review remain open.

The [Phase 10 local Llama study](docs/research/model-composition-phase-10/RESULTS.md) retained 48 generated responses and
144 matched control branches. Composed controls completed 22/24 active branches, matching
credential-only utility, while new unauthorized effects on stopped branches fell from
16/24 to 0/24. All 1,440 raw snapshots passed fresh replay; all 48 token records verified.
This is a bounded single-model result, with two active failures retained and no claim
of general safety or outside custody.

[Phase 9](docs/research/composition-phase-9/RESULTS.md) now composes phases 6–8 in
one native workflow with shared reservations and persistent partial-update holds.
All 40 rows and 360 raw snapshots passed fresh replay; a fresh composition review
reported no Critical, Important or Minor findings. Phase 10 now adds fresh held-out
local Llama tasks on this pipeline. Real provider
identity integration and outside custody remain separate validation work.

[Phase 8](docs/research/credentials-phase-8/RESULTS.md) now tests authenticated
credential expiry, rotation, revocation and session behavior in an owned HTTP service.
All 46 rows and 92 raw snapshots passed fresh replay; continuous checks deny three
additional revoked/expired-credential cases. The whole-change review remains incomplete.
Phase 9 now supplies the separately scoped composition result above. Phase 10 adds a bounded fresh local model evaluation.
Real provider identity integration and outside observation remain separate gaps.

[Phase 7](docs/research/context-phase-7/RESULTS.md) now tests host-owned authority
and evidence through scripted context changes and delegated handoffs. All five
permitted cases complete; 12 hold/authority cases block and one outage stays unknown.
Shared budgeting limits sibling effects without erasing uncertain reservations.
These are local engineering results; fresh model recognition of broken tasks and
actual compaction/subagent integration remain open. Phase 8 adds the separately
scoped credential result above.

[Phase 6](docs/research/signals-phase-6/RESULTS.md) adds signed synthetic safety
signals, durable stop/hold state and monitor-gated dispatch. Across 21 cases, the
integrated controller allowed all six intended deliveries, blocked all 14 declared
stop/hold cases and retained one unknown outcome. Two in-flight drills expose the
limit: already admitted work can finish after a stop. Live provider delivery remains
untested. The [16 October OpenAI needs review](docs/research/OPENAI_NEEDS_2026-10-16.md)
motivates this sequence; phase 7's bounded result is recorded above.

[Phase 5](docs/research/recovery-phase-5/RESULTS.md) adds guarded exact-grant recovery,
lookup-only uncertainty handling and a local detect/revoke/in-flight drill. Its new
scripted cases show four additional completions; they are not new model results.
A full [fresh GitHub-host reproduction](docs/research/recovery-phase-5/hosted-phase4/README.md)
now passes the frozen phase 3 trajectories with retained phase 4 evidence. Outside
operator/custody, broader model tasks and real identity/vendor integration remain open.

[Phase 4](docs/research/reproduction-phase-4/README.md) now provides the portable
replay handoff, pinned inputs and 763 retained raw receiver snapshots. All 540
branches matched the baseline in a clean local checkout. This prepares G18 and
partly addresses G19/G23. The fresh-host run is now recorded in phase 5; an outside
operator and independent custody remain open. The [execution record](docs/research/reproduction-phase-4/RESULTS.md)
distinguishes local reproduction from external validation.

[Phase 3](docs/research/model-phase-3/README.md) now supplies a frozen local Llama
capture: 60 tasks, three trials and three controls, with bounded feedback and all
540 branches retained. Enforcement preserved 90/90 benign completions and had no
unauthorized effects, but completed only 59/90 attacked branches. Recovery under attack,
outside reproduction and representative vendor/identity integration remain priorities.

[Phase 2](docs/research/connector-phase-2/README.md) now composes native SDK approval,
mandatory worker isolation, exact authority and a sandbox inbox with crash reconciliation.
The phase 3 model study exercises that local composition; enterprise identity and real
vendor connectors remain unvalidated.

The [first hardening implementation](docs/research/hardening-phase-1/README.md) now addresses
G01–G09 through exact-authority/transaction/validation successors and legacy endpoint
retirement. Read its disposition table: historical internals remain unchanged, and the
broader model and external-validation phases remain ahead. The local connector
composition below does not establish vendor integration.

The active track is verifiable security controls and evidence for autonomous AI agents. The earlier
device-integrity roadmap is preserved verbatim in [DEVICE_ROADMAP.md](DEVICE_ROADMAP.md); its old
"current" and "next" labels describe that document's historical state.

For priorities after the completed SDK, recovery, live-model and HF containment studies,
use the [15 October 2026 gap map](docs/research/SIMURGH_GAP_MAP_2026-10-15.md). It records
27 actionable items, six still-open historical findings, fresh local probes and 19 primary
sources. The next milestone is independent reproduction of the frozen model study,
followed by broader tasks and a representative authenticated vendor connector. Earlier milestone sections below
retain their original scope; a past “next” item may now have a separate published result.

## Existing foundation

- Provider-agnostic containment boundaries and historical signed, offline-reproducible research
  through `v2.54.1`; see [RESEARCH_HISTORY.md](RESEARCH_HISTORY.md).
- Recorded approval-gate ordering and delegation completeness mechanisms in Stages 4Q and 4S.
- Explicit coverage and independence limits: Stage 5Q **6.2%**, Stage 5R **zero new discharged
  cells**, Stage 5S **comparison-bounded detection with unproven witness independence**.
- A historical device-integrity application whose package version remains `0.4.18`.

## OpenAI review track

The focused question is whether a host-controlled authorization gate prevents simulated unsafe tool
consequences while preserving authorized work when agent input contains untrusted instructions.

| Deliverable               | Scope                                                                                                 | Acceptance evidence                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline demonstration     | Deterministic local fixtures, explicit policy, simulated consequences, safe and vulnerable controls   | Run `npm run openai:offline -- --out /tmp/simurgh-openai/report.json`, then `npm run openai:verify -- /tmp/simurgh-openai/report.json`; inspect actual results |
| Optional model adapter    | Explicitly opted-in Responses API transport; model proposes actions, host retains execution authority | Contract tests are separate from an authorized live capture; no current live result is claimed                                                                 |
| Claim and security review | Trace reviewer-facing assertions to code, artifacts and limitations                                   | [Claim audit](docs/openai/CLAIM_AUDIT.md) and the readiness report distinguish inspection from reproduction                                                    |
| Application package       | Focused proposal, problem statement, milestones, methodology, resources and public benefit            | [Owner checklist](docs/openai/APPLICATION_CHECKLIST.md); identity, budget and eligibility reviewed before submission                                           |

These additions do not raise historical coverage figures or confer a release status on frozen
incomplete work. New results must identify their own corpus, implementation revision, parameters
and limitations.

## Real-effects milestone and remaining gaps

The [assurance lab](docs/assurance/README.md) implements the first bounded milestone from the
[industry gap review](docs/assurance/INDUSTRY_GAPS.md): precommitted exact-action permissions,
actual child-process file effects, independent read-back within the same host, three enforcement
controls and trace/checkpoint/effect comparisons. Its 51 case/control runs include ineffective
mutations and explicit observation failures. The checkpoint baseline matches full reconciliation
on the four trace mutations; no incremental detection advantage is claimed.

The [SDK extension](docs/assurance/sdk/README.md) now connects OpenAI Agents SDK 0.23.1 and
LangGraph 1.2.15 to the unchanged workload: all 102 matrix rows match the original effects and
verdicts. Native rejection and LangGraph edits are exercised; OpenAI in-place edit is explicitly
unsupported. Same-process serialization and in-memory checkpoints do not establish crash recovery.

The [durability extension](docs/assurance/durable/README.md) now tests a bounded local contract:
26 named cases, four process-kill windows, eight-worker races, immutable authority and executor
restarts through both SDKs. A stable file identity allows receipt recovery without rewriting
an effect; the file and receipt are not one atomic transaction.

The [Redis connector extension](docs/assurance/redis/README.md) now tests conditional record writes
and ambiguous-response recovery against Redis 8.10.2 in 19 named cases. It includes a real lost
success reply, GET-only reconciliation, a non-idempotent retry control and AOF process restart.

The [persisted workflow extension](docs/assurance/workflow/README.md) now restores native SDK
approval checkpoints in new application processes across 24 named cases. Local revocation and
revision changes are checked at dispatch; an effect followed by application crash is reconciled.

Next, obtain held-out attacks and external reproduction, then broaden the single-approval fixture
with a multi-step workflow crash matrix. Power-loss validation, arbitrary workflow
recovery, authenticated approval identity, distributed revocation and measured overhead remain open.
These are evidence requirements, not claims that competitors lack these controls.

The [incident scope extension](docs/assurance/scope/README.md) now adds 54 local HTTP rows for exact
task permissions, per-redirect checks, budgets and durable stopping. It explicitly fails to prevent
an approved service's hidden onward request. The [2026 incident review](docs/assurance/scope/INCIDENT_RESEARCH.md)
prioritizes network-layer containment and independent observation of that path, followed by held-out
cases, outside reproduction, multi-step memory/checkpoint tests and measured integration cost.

The [kernel egress extension](docs/assurance/egress/README.md) now measures an ingress-only seccomp
profile around the approved service: eight network channels blocked, two useful operations retained,
36 case/control rows. It does not provide namespace isolation or selective egress, and it preserves
a filesystem mailbox negative result. Next: reviewed native launch, destination-specific network
policy on a suitable host, filesystem/IPC isolation and external reproduction.

The [descriptor isolation extension](docs/assurance/isolation/README.md) now provides a bounded
filesystem/IPC and selective-connection experiment. It denies new object acquisition after trusted
bootstrap, with 57 measured rows. Next: outside reproduction and held-out probes, native mandatory
launch, real workload compatibility/overhead and content-release policy. Dynamic path/reconnect
permissions still need a suitable host and broader design.

## Further research requiring additional evidence or owner inputs

1. **Authorized live capture:** select an available model, approve spending and data handling,
   freeze the dataset and capture parameters, then publish measured results including failures.
2. **Broader validity:** add independently authored cases and an external operator reproduction;
   distinguish shared-code replay, separate implementation checks and operator independence.
3. **Executable coverage:** build probe families capable of observing class-specific outcomes,
   preserving 5Q and 5R's frozen records and reporting any new coverage under a new label.
4. **Witness independence:** obtain an external operator's full witness-tuple evidence before
   proposing any stronger claim; digest anchoring alone does not pay this debt.
5. **Operational assurance:** evaluate deployment-specific isolation, approval identity, audit
   custody and integration failure modes before any production-readiness claim.

No delivery date or funding award is implied. Grant milestones and resource scenarios are proposals
in [PROPOSAL.txt](docs/openai/PROPOSAL.txt). Deployment, publication, paid model use and submission
remain owner decisions.
