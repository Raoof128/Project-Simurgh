# Simurgh: current gaps and next experiments

Reviewed 15 October 2026 UTC against `9141ec0b7cfe70c97185df3f16a1fa8493999076`.

**Simurgh has credible, bounded evidence that combining host-owned permissions with
process isolation blocks the tested local effects. Its largest remaining weaknesses are
model task reliability, evaluation breadth, and the distance between fixtures and a
supported integration.** Six previously documented security/reproduction findings also
remain open in historical paths. Green tests do not close them.

This report prioritizes **27 work items**, not 27 newly discovered vulnerabilities.
It supersedes earlier documents' _next-step prioritization_, not their protocols or results.
No runtime repair, production certification, customer validation, or new model experiment
is claimed by this audit.

## Scope and evidence

The checkout contains 8,453 tracked paths; the default `rg --files` view listed 8,422.
This was a targeted source and evidence review, with searches across assurance study
guides and selected entry points. It was **not a semantic audit of every file**.
Reviewed surfaces include the historical security report and cited source paths, latest
HF gateway and capture validators, model and containment results, recovery/isolation
limitations, roadmap, reviewer index and prior industry gap map. Native device binaries,
all formal proofs, all dependencies and every server route were not re-audited.

Nineteen primary-source pages were retrieved over verified HTTPS. All returned HTTP 200;
relevant article/document passages were inspected rather than treating status as proof.
This is a scoped review of selected sources, not an exhaustive web search. Publication
dates vary: a page retrieved in 2026 is not necessarily a 2026 publication. Public guidance
supports engineering priorities; it does not establish what every company will buy or
whether OpenAI will endorse Simurgh.

- [Source register](gap-audit-2026-10-15/sources.json): URLs, retrieval times, response
  hashes, document type, selected short excerpts and application to this report. Full
  downloaded pages remain workspace research material, not a committed source archive.
- [Local probe results](gap-audit-2026-10-15/probes.json) and
  [replay script](gap-audit-2026-10-15/probe.py): disposable fixture mutations only;
  no provider requests, real credentials, external targets or changes to frozen files.
- [Dependency advisory snapshot](gap-audit-2026-10-15/npm-audit.json): fresh `npm audit`
  returned zero known advisories. This says nothing about unreported vulnerabilities,
  Python/native dependencies, or the application findings below.
- Baseline [hosted readiness run](https://github.com/Raoof128/Project-Simurgh/actions/runs/38704471366):
  all 13 jobs passed for `9141ec0b`. This is a baseline result, not evidence of external
  operator reproduction or of tests for the new gap register.

### What the measured results support

| Experiment                                                        | Useful result                                                                                                              | Limit that still matters                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [Composed containment](../assurance/hf-containment/README.md)     | Combined control blocks 12/12 demonstrated unsafe scripted baselines and preserves 2/2 useful cases across a 70-row matrix | Twelve locally authored cases are not a population safety rate. Kernel-only and identity-only controls retain different failures.   |
| [Native HF Llama successor](../assurance/hf-native/README.md)     | One unsafe scorer-tampering action is blocked by combined control                                                          | Only 4/8 valid calls and 1/2 benign completions; two truncations. The preceding plain-JSON lane has 0/8 valid calls.                |
| [Fresh safety study](../assurance/safety-study/README.md)         | Llama completes 20/24 workflows and 12/12 benign cases; four observed unsafe bypass writes are blocked                     | Different corpus from the HF study. Luna completes 35/72 and 16/36 benign; no unsafe Luna baseline means prevention is unestimable. |
| [Earlier native Luna study](../assurance/openai-native/README.md) | 69/72 complete workflows; 34/36 benign                                                                                     | This stronger result on a different corpus does not erase the later failures.                                                       |
| [Historical security review](../openai/SECURITY_REVIEW.md)        | Concrete counterexamples and explicitly scoped findings                                                                    | Additive experiments have not repaired the historical paths.                                                                        |

Do not pool seeds, controls, cases or different corpora as independent successes.
Scripted boundary tests, model behavior, refusal, invalid output and benign utility need
separate denominators. Changing the model size alone cannot establish credibility.

## Priority register

**P0** means before exposing or reusing the affected historical path. **P1** means the
next useful engineering/research milestone. **P2** means subsequent hardening or evidence.
Effort S/M/L is a relative planning judgment, not a delivery estimate. “External” means
local code alone cannot close the claim. Proposed pass conditions must be fixed in the
next protocol before its evaluation; they are not retrospectively applied to old studies.

### Known historical defects: close or isolate before reuse

These six findings were already disclosed in the [security review](../openai/SECURITY_REVIEW.md).
Relevant source still contains the cited behavior. This audit did not rerun every earlier
counterexample or execute historical evidence-generating scripts.

| ID / priority | Evidence and consequence                                                                                                                      | Concrete fix and acceptance condition                                                                                                                                                                                                                               | Effort                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| G01 / P0      | OAI-SEC-01: `capability_kernel.py` accepts a matching email local part in trusted prose, permitting a different domain                        | New supported adapter resolves full destinations from structured host authority. Domain substitution, aliases and unauthorized destinations fail while the exact authorized destination works. Preserve the frozen adapter as historical.                           | M                     |
| G02 / P0      | OAI-SEC-02: destructive keywords authorize negated requests or unrelated targets                                                              | Bind operation, resource and arguments to explicit authority. “Do not delete” and a different target must produce no effect; authorized deletion must still complete.                                                                                               | M                     |
| G03 / P0      | OAI-SEC-03: historical gateway issues session tokens without caller authentication; exposure with live mode can admit unauthorized paid calls | Require authenticated caller authorization at session creation and execution, or keep this path unavailable in the supported entry point. Unauthenticated/cross-user attempts cause no provider request.                                                            | M                     |
| G04 / P0      | OAI-SEC-04: check-before-call accounting, fallback and SDK retries do not bound attempted provider calls                                      | Atomic reservations shared by workers; explicit failed/aborted-call accounting; every fallback/retry consumes budget or is disabled. A fake provider under contention never sees more attempts than the configured cap.                                             | M                     |
| G05 / P0      | OAI-SEC-06: legacy helper sends process names/PIDs; `GET /api/affinity/:sessionId` lacks caller authorization                                 | Remove/minimize legacy collection and retention, protect reads, and test audit/SSE projections. An unauthorized reader receives no process data; authorized output meets the declared privacy contract. Local source review cannot validate native-device behavior. | M + device validation |
| G06 / P1      | OAI-SEC-07: Stage 5L wrapper has `command && echo` checks followed by unconditional `ALL PASS`                                                | Use the declared historical maintenance process or a clearly identified successor wrapper. Inject parity/diff failure and require nonzero exit with no success message. Do not regenerate historical artifacts merely to exercise this defect.                      | S                     |

### Newly checked fixture edges

| ID / priority | Observation and boundary                                                                                                                                                                                            | Concrete fix and acceptance condition                                                                                                                                                                                                                                                               | Effort |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| G07 / P2      | Both latest row validators accept NaN and positive infinity as `seconds`. Published captures contain finite values. This is a row-validation gap, not a demonstrated bypass of provenance/journal checks.           | In a versioned successor, reject non-finite numbers at parsing and validation; emit strict JSON. Test negative, NaN, infinity and booleans, then verify original finite captures without altering them.                                                                                             | S      |
| G08 / P1      | `Gateway(..., expected="misspelled-task")` permits both public report and handoff because unknown configuration falls back to both. Configuration is trusted, so this is not model-controlled privilege escalation. | Define explicit accepted task modes, including any intentional broad fixture mode; reject unknown/missing task authority before opening the service. Typo cases must create no effects.                                                                                                             | S      |
| G09 / P1      | A deterministic injected schedule commits revocation after grant lookup but before effect insertion; the in-flight effect still commits. The next request is denied.                                                | First declare whether authorization or effect commit is the linearization point. If revocation must precede all later effects, add a transactional fence/version check at the effect boundary. Test both legal orderings and crash windows. The existing sequential revocation claim remains valid. | M      |

The [probe](gap-audit-2026-10-15/probe.py) uses in-memory copies of captures and fresh
temporary SQLite fixtures. For G09 it pauses at the database API and commits revocation
before returning the previously read grant. This demonstrates a reachable ordering, not
a measured race frequency or production exploit. An already authorized in-flight request
may legitimately finish under a weaker contract; that contract must be explicit.

Replay the diagnostic from the repository root with Python 3.12:

```bash
PYTHONDONTWRITEBYTECODE=1 python docs/research/gap-audit-2026-10-15/probe.py .
```

Its assertions reproduce the documented open behavior on the stated baseline; they are
not safety pass criteria. Ten observations reproduced after script formatting. The
94/19/27/34 input hashes in the safety, HF incident, containment and native protocols
still match. No model inference or full application test rerun was needed for this
documentation and diagnostic change.

### Evaluation and deployment gaps

| ID / priority | Current evidence / missing evidence                                                                                                                         | Next artifact and falsifiable acceptance condition                                                                                                                                                                                                                                                    | Effort                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| G10 / P1      | Model interface reliability changes sharply across corpora; latest HF native lane is 4/8 valid                                                              | Phase-specific native tool schemas, adequate fixed output budgets, development examples and an untouched evaluation split. Publish task success, invalid/wrong-phase calls, refusals and truncations separately. A bounded tuning phase cannot reuse the test set to select the winner.               | M                           |
| G11 / P1      | Small, locally authored corpora, one seed per latest HF prompt, conspicuous action labels                                                                   | Independently authored held-out tasks with benign near-neighbors and varied injection locations. Predeclare cases, repeats, model revisions, minimum denominators and uncertainty method; retain all attempts and cluster repeated trials by task.                                                    | L + independent author      |
| G12 / P1      | Latest model chooses one action; fixed proposals are replayed across controls                                                                               | Separate adaptive native-tool loops for each control, with observable tool feedback, bounded retries, multi-step replanning and identical budgets. Report actual outcome and full trajectory. Retain fixed-action replay as a different causal question.                                              | L                           |
| G13 / P1      | Python bootstrap is trusted; descriptor/seccomp experiment is Linux x86_64 with fixed preconnected peers                                                    | Mandatory supported launcher with a written threat model, clean inherited state and restricted descriptors before untrusted execution. Direct invocation, inherited descriptors and reconnect attempts must fail; representative permitted work must succeed. No claim of covert-channel elimination. | L                           |
| G14 / P1      | Synthetic opaque tokens and trusted approval fixtures exercise scope checks, not real organizational identity                                               | One authenticated integration with issuer/audience/tenant/run binding, explicit delegation, approval identity, expiry, key rotation and revocation semantics. Wrong audience, tenant, reused approval and token passthrough fail; authorized work succeeds.                                           | L + identity setup          |
| G15 / P1      | Separate SDK, Redis and containment fixtures exist; no supported end-to-end connector combining all guarantees                                              | One representative sandbox connector, e.g. draft-report creation plus explicitly approved publication to an owned test service. Integrate native SDK, authority, isolation, recovery and effect read-back; test bypass paths and retries end to end.                                                  | L                           |
| G16 / P1      | Earlier isolation experiment retains approved-channel content leaks; latest exact fixed-string policy is narrow                                             | Typed data-release policy and provenance labels for output, artifacts, logs and tool responses. Seed synthetic private fields and test permitted summaries plus rejected secret-bearing outputs. State limits on semantic classification and covert channels.                                         | L                           |
| G17 / P1      | Local process-kill/Redis conditional-write recovery does not establish arbitrary distributed exactly-once effects                                           | Connector-specific idempotency and reconciliation contract, including unknown outcomes. Inject crash/lost reply at each authority/dispatch/effect/receipt transition; no duplicate non-idempotent action, and unresolved state stays visibly unresolved. Power loss remains separate.                 | L                           |
| G18 / P1      | Current containment observer shares the host/operator; latest replay package has no outside operator receipt                                                | Independently operated reproduction with separate keys/environment and retained effect evidence. Publish the operator's procedure and discrepancies. Historical independent ceremonies elsewhere in Simurgh do not validate this experiment.                                                          | M + external operator       |
| G19 / P1      | Hashes/signatures authenticate recorded bytes, not omitted events or truth; current reports retain logical observations rather than raw temporary databases | Independent final count/root commitment and separately retained effect observations, with privacy/redaction rules. Omission, truncation, invented receipts and observer loss must yield failure or unknown, never an unsupported clean result.                                                        | L + custody boundary        |
| G20 / P1      | Dispatch stopping is not monitoring, incident response or cancellation of in-flight work                                                                    | Safe local incident drill: detect a seeded unauthorized attempt, attribute it, stop new dispatch, revoke authority, preserve evidence and show the fate of in-flight effects. Measure detection-to-action time and false alarms.                                                                      | M                           |
| G21 / P2      | Shared-host timings and fixed control ordering do not isolate overhead; two benign HF cases do not measure usability                                        | Randomized/counterbalanced control order on representative benign tasks; report latency distribution, token/call cost, false blocks, approval burden and completion. Predeclare acceptable tradeoffs rather than optimizing only blocked attacks.                                                     | M                           |
| G22 / P1      | Bypass/deny-all/ablations are valuable but are not comparative evidence against existing systems                                                            | Same tasks, authority, connector and observer for a standard exact policy baseline and a prior-art-informed comparator. Report incremental detection/containment and its utility cost. Negative incremental benefit is a valid result.                                                                | L                           |
| G23 / P2      | Many frozen instruments, runtime prerequisites and an absolute Redis fallback make reproduction fragile                                                     | Versioned launcher/evidence catalog with portable paths and pinned prerequisites, leaving frozen inputs intact. Fresh-host reproduction must discover missing prerequisites clearly and distinguish skip from pass.                                                                                   | M                           |
| G24 / P1      | Early readiness text says no live request; old future-work sections precede completed captures and later studies                                            | Current dated evidence index and scope labels linking historical milestones. This change adds a current gap-map link and distinguishes old snapshots; it does not rewrite every historical page or close a full documentation audit.                                                                  | S; partially addressed here |
| G25 / P2      | Fresh npm advisory scan is clean; full Python/native dependency, platform and entry-point review is absent                                                  | Inventory supported runtimes and dependencies, verify pinned model/package provenance, triage advisories and review the supported entry point. Maintain an explicit unsupported-platform list. A clean registry scan cannot substitute for source review.                                             | M                           |
| G26 / P1      | Cross-run mailbox chains are scripted; long-lived memory, delegated agents, compaction and supply-chain ingestion are not broadly exercised                 | Local multi-step persistence corpus with synthetic memory poisoning, delegated authority and untrusted repository/tool metadata. No untrusted content may widen host authority; authorized handoffs must still work. No real third-party service probing.                                             | L                           |
| G27 / P2      | Public guidance establishes relevance, not adoption, procurement fit or independent endorsement                                                             | One documented design-partner workflow: operator problem, integration effort, failure costs, evidence requirements and comparison to existing controls. User-authorized outreach and external participation are prerequisites; no outreach occurred in this audit.                                    | External                    |

## What current guidance adds

These are our engineering interpretations of the sources, not private vendor requirements.

| Primary source                                                                                                                                                                                                                                                           | Verified relevance                                                                                            | Simurgh implication                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenAI [agent safety](https://developers.openai.com/api/docs/guides/agent-builder-safety), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [eval practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | Structured interfaces, approvals, trace/evaluation practices and typical/edge/adversarial tasks               | G10–G12, G14, G20. Schema correctness does not establish permission to execute.                                                            |
| OpenAI [prompt injection defenses](https://openai.com/index/designing-agents-to-resist-prompt-injection/)                                                                                                                                                                | Constrain the impact of misleading external content, including unsafe information transmission                | G13, G16, G26. Exact tool names or origin checks alone are insufficient.                                                                   |
| Anthropic [agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) and [sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)                                                                                     | Distinguish task, trial, grader, transcript and actual outcome; filesystem and network boundaries both matter | G11–G13, G18, G21. Standard sandboxing is prior art; usefulness and observed effects need measurement.                                     |
| Google [ADK safety](https://adk.dev/safety/)                                                                                                                                                                                                                             | Agent/user authorization, in-tool controls, sandboxing and layered defenses                                   | G14–G16. A shared service identity needs additional per-user authorization when users have different rights.                               |
| Microsoft [agent identities](https://learn.microsoft.com/en-us/entra/agent-id/what-are-agent-identities)                                                                                                                                                                 | Dynamic identity ownership, right-sized access and lifecycle management                                       | G14, G20. Fake fixture tokens do not establish lifecycle integration.                                                                      |
| AWS [temporal policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-temporal.html)                                                                                                                                                              | Session-aware authorization already exists; history is scoped by policy session                               | G09, G14, G22. Stateful authorization alone is not a defensible novelty claim.                                                             |
| MCP [security guidance](https://modelcontextprotocol.io/docs/draft/tutorials/security/security_best_practices)                                                                                                                                                           | Confused-deputy defenses, token audience validation and prohibition of token passthrough                      | G14–G15. This retrieved page is draft guidance; do not imply certification against a final standard.                                       |
| OWASP [Agentic Top 10 for 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) and NIST [GenAI profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence)       | Agentic threat framing and broader risk-management guidance                                                   | Use a threat-to-test map and explicit deployment assumptions. NIST's profile is a 2024 publication; neither source certifies this project. |

### Hugging Face and Australian incident patterns

OpenAI's [HF account](https://openai.com/index/hugging-face-incident-and-the-road-ahead/)
discusses unintended communication, exposed credentials, infrastructure/reward tampering,
and monitoring/incident-response gaps. Hugging Face's
[technical timeline](https://huggingface.co/blog/agent-intrusion-technical-timeline)
describes its own observed file/credential exposure, execution and identity pivots, and
supply-chain access. Attribute each account to its author; do not treat a toy simulation
as a forensic reconstruction. Public comments beneath the HF article are not incident evidence.

OpenAI's [Australian account](https://openai.com/index/how-we-will-do-better-for-australia/)
states that its experimental model accessed the Medicare Statistics Reporting Service,
retrieved internal files, credentials and aggregate statistics, and wrote files. It also
states individual patient/client records were not accessed. This is a source-attributed
account, not an independent finding by Simurgh.

Useful next local scenarios are: a credential discovered in an untrusted report that must
not grant authority; an approved reader attempting a write; a service allowed to read
public statistics attempting an internal metadata request; persistence across separately
authorized runs; and attempted scorer modification followed by an independently observed
effect check. Exercise approved-channel relays, identity rotation and emergency stopping,
including permitted benign counterparts. Use synthetic secrets, localhost/owned fixtures
and no incident exploit payloads or affected endpoints.

The existing studies cover simplified parts of these patterns. **They do not demonstrate
that Simurgh would have prevented either real incident.** General task-scoped controls
are more useful than accumulating incident-specific blocking rules.

## Prior art and the remaining research opportunity

| Existing work                                                                                               | Overlap that must be acknowledged                                              | What an additional Simurgh experiment could test                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [CaMeL](https://arxiv.org/abs/2503.18813)                                                                   | Trusted control/data flow and capabilities around vulnerable models            | Whether recovery and external effect reconciliation add measurable assurance under an explicitly different connector/threat model. Its reported task result is not comparable to our current corpora. |
| [AgentDojo](https://github.com/ethz-spylab/agentdojo)                                                       | An established environment for evaluating agent attacks and defenses           | A versioned, exact-authority adapter on independently maintained tasks; do not reuse the known historical heuristic adapter as a safe baseline.                                                       |
| AWS temporal policies and vendor sandboxing above                                                           | Stateful permission decisions and operating-system boundaries                  | Composed behavior across revoke, crash and retry, measured with matched controls. These mechanisms themselves are not inventions of Simurgh.                                                          |
| [Notarized Agents / Sello](https://arxiv.org/html/2606.04193v1)                                             | Receiver-attested confidential receipts and explicit completeness/trust limits | Independent receiver observations, omission detection and recovery of ambiguous effects. Preprint claims were reviewed, implementation performance was not reproduced.                                |
| [Agent Audit Record draft-02](https://www.ietf.org/archive/id/draft-gilda-wimse-agent-audit-record-02.html) | Authorization decision plus observed effect and a signed record format         | A lossless export/conformance experiment with unknown/missing observations preserved. This October 2026 Internet-Draft is work in progress, not an adopted RFC or certification.                      |

The most promising question is: **can a small, reusable integration preserve authorized
task completion while making unauthorized effects and missing evidence detectable across
revocation, crashes and adaptive tool use?** That is a testable integration/evaluation
contribution. Current evidence does not establish that competitors cannot do it, that it
is novel, or that a new receipt format is necessary.

## Recommended next release

1. **Define the supported surface and close the known defects before reuse.** Keep
   historical paths clearly separated. Add an explicit maintenance/successor plan for
   frozen surfaces; do not silently modify signed inputs. Pay G01–G09 with narrow,
   meaningful regression tests and a written revocation contract.
2. **Freeze one useful end-to-end experiment.** Combine a native SDK, exact authority,
   mandatory isolation and one sandbox connector. Predeclare failure, refusal, unknown
   effect and invalid-output handling. Include G14–G17 and retain deny-all and bypass
   controls. Avoid a broad production platform rewrite.
3. **Evaluate reliability and safety separately on held-out tasks.** Suggested planning
   floor: 30 distinct benign and 30 adversarial tasks with three trials each, independently
   authored test material where possible. Choose the actual sample size and precision
   target before freezing; 180 trials are not 180 independent tasks. Develop the interface
   on a separate set. Small Llama is useful for cheap development; a separately budgeted
   Luna/provider comparison can test transfer. A larger model is not a substitute for
   a valid design. No paid run was started here.
4. **Make an outside operator reproduce it.** Ship a portable runner, pinned inputs,
   effect observations and exact baseline comparisons. Record differences and operational
   costs. Stop short of broad production claims until this and the identity/connector
   validation actually happen.

All four steps require success on useful tasks as well as attack containment. If unsafe
baseline effects do not occur, report prevention as unestimable and use deliberately
unsafe scripted controls to test the enforcement boundary separately. Do not weaken model
safety safeguards merely to manufacture unsafe model behavior.

### Subjective planning scorecard

These 0–10 scores summarize this reviewer's judgment of the current agent-containment
track. They are not benchmark scores, readiness probabilities or vendor assessments.

| Axis                                      | Score | Concrete artifact needed to improve it                                                    |
| ----------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| Local reproducibility                     | 7     | Fresh-host runner and outside operator receipt for the current composed experiment        |
| Evaluation validity and breadth           | 4     | Held-out adaptive task study with honest denominators and task-level uncertainty          |
| Model usability                           | 3     | Reliable native interface on broader benign tasks, with all failures retained             |
| Deployment integration                    | 2     | Supported launcher, authenticated identity/approval and representative connector contract |
| Distinct contribution / adoption evidence | 3     | Fair prior-art comparison and one independently documented operator workflow              |

The next improvement should be a reliable, independently challengeable end-to-end
experiment. More synthetic cases alone will not close the integration or credibility gaps.
