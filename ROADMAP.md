# Research roadmap

The active track is verifiable security controls and evidence for autonomous AI agents. The earlier
device-integrity roadmap is preserved verbatim in [DEVICE_ROADMAP.md](DEVICE_ROADMAP.md); its old
"current" and "next" labels describe that document's historical state.

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
