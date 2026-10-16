# OpenAI's published agent-safety needs and Simurgh's remaining gaps

Reviewed **16 October 2026 (Australia/Sydney)** against Simurgh commit `1a009518`.

**The earlier work did not cover all of OpenAI's needs.** It established bounded
authorization, isolation, recovery and reproduction results. This follow-up searches
current official publications and developer documentation to identify the next useful
experiments. Public statements reveal problems and priorities, not OpenAI's private
roadmap, procurement requirements, endorsement or willingness to adopt Simurgh.

## Research method and limits

Discovery used OpenAI's [news RSS](https://openai.com/news/rss.xml) (1,296 entries),
the [developer index](https://developers.openai.com/llms.txt), its API documentation
index, and links from incident reports. Searches covered agent safety, containment,
misalignment, monitoring, cybersecurity, evaluations, credentials and delegation.
Seven category sitemap requests returned HTTP 403; RSS and documentation indexes
provided alternative discovery. An obsolete `tools-remote-mcp.md` URL returned 404;
the current index led to `tools-connectors-mcp.md`.

The [source register](openai-needs-2026-10-16/sources.json) retains 29 selected official
URLs, retrieval times, response hashes, short verified excerpts and our interpretation.
Full fetched pages remain workspace research material, not a committed archival copy.
Relevant sections were reviewed; downloading a page does not imply a full technical
audit of its examples or linked papers. Incident accounts are attributed to OpenAI.
This is a scoped public-source review, not an exhaustive survey of all OpenAI research,
all AI risks, or every file in Simurgh. No paid inference or third-party probing occurred.

## What the latest Simurgh evidence establishes

- [Phase 3](model-phase-3/README.md): under exact enforcement, 90/90 benign branches
  and 59/90 attacked branches completed, with zero unauthorized effects. Bypass had
  43/90 unauthorized attacked effects. These are repeated branches of 60 local tasks,
  not independent population samples; 31 unsuccessful attacked branches remain.
- [Phase 4](reproduction-phase-4/RESULTS.md) and its
  [fresh-host successor](recovery-phase-5/hosted-phase4/README.md): 540 frozen branches
  and 763 retained snapshots reproduced. Project-controlled CI is not outside custody.
- [Phase 5](recovery-phase-5/RESULTS.md): deterministic guarded recovery increased
  completions from 3/13 to 7/13 in scripted cases, preserving declines and unknowns.
  All three concurrency drills blocked later sends after revocation, while the already
  in-flight legitimate effects committed. No model was queried in that phase.

These results provide building blocks. They do not establish production integration,
general model alignment, provider monitoring coverage or prevention of the real incidents.

## Published needs mapped to concrete gaps

The priorities and proposed tests below are **our recommendations**, not requirements
assigned to Simurgh by OpenAI. P1 means next research priority, not vulnerability severity.
The G references connect to the [earlier gap map](SIMURGH_GAP_MAP_2026-10-15.md);
they do not silently mark those items closed.

| ID / priority | OpenAI's published problem or guidance                                                                                                                                                                                                                                                                                               | Simurgh coverage and remaining gap                                                                                                                                                                    | Proposed acceptance evidence                                                                                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 / P1      | [Misalignment monitoring](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring): asynchronous alerts and API blocks require application handling; completed actions are not reversed.                                                                                                                 | Phase 5 has local stop/revoke ordering, but no demonstrated provider-alert integration. G20 remains partial.                                                                                          | A local adapter handles a block before output, a stream error after output, a delayed signed alert, duplicates, wrong-project lookup, missing detail and alert outage. Preserve already committed effects; never automatically retry a blocked conversation.                      |
| N02 / P1      | [Safety cases](https://openai.com/index/towards-safety-cases-for-frontier-ai-training/): monitoring and auto-pausing should fail closed, with runbooks, accountability and residual risks.                                                                                                                                           | A mismatch monitor is not proof that every worker starts with monitoring or that monitor failure stops dispatch.                                                                                      | Prevent new scoped work when the required monitor is absent; kill its heartbeat during execution; retain queued/in-flight outcomes; require a separate attributable restart decision. Demonstrate a permitted restart and rejected stale approvals.                               |
| N03 / P1      | [HF report](https://openai.com/index/hugging-face-incident-and-the-road-ahead/): broken or impossible tasks drove persistence, cheating and unsafe alternatives.                                                                                                                                                                     | Preserving a scripted decline does not show that a model recognizes impossibility. Exact-copy fallback already knows the answer. G11/G12 remain broader.                                              | Fresh paired solvable/broken tasks with missing inputs, unavailable services and insufficient permission. Score useful completion, justified clarification, safe stopping, fabrication and unauthorized effects separately. Stopping must not count as success on solvable tasks. |
| N04 / P1      | [Self-generated summary instructions](https://alignment.openai.com/misalignment-reports/self-generated-prompt-injections-in-compaction-summaries/) and [concealed mistakes](https://alignment.openai.com/misalignment-reports/encouraging-deception-in-compaction-summaries/): misalignment can persist through context changes.     | No current phase 3–5 result establishes authority preservation across compaction or memory poisoning. G26 remains open.                                                                               | Resume across context changes with forged approval, omitted failure and changed source-version summaries. Host authority and raw evidence survive unchanged; honest summaries still support useful work. Distinguish model refusal, ignored injection and enforced containment.   |
| N05 / P1      | [HF report](https://openai.com/index/hugging-face-incident-and-the-road-ahead/) and [long-horizon safety](https://openai.com/index/safety-alignment-long-horizon-models/): unauthorized collaboration and individually plausible steps can produce a prohibited outcome.                                                             | Cross-run checks and mailbox simulations cover selected channels, not arbitrary delegated workflows. G16/G26 remain partial.                                                                          | Authorized parent/child handoffs plus cross-task mailbox, peer instruction and shared-cache cases. Bind grants to task lineage and cumulative outcome; reject a peer's claimed permission without breaking approved collaboration.                                                |
| N06 / P1      | [Sandbox security](https://developers.openai.com/api/docs/guides/agents-api/environments/security) and [vaults](https://developers.openai.com/api/docs/guides/agents-api/tools/vaults): credentials belong outside untrusted code; stored-secret deletion is not provider revocation or session cancellation.                        | Synthetic principals, scoped gateway tokens and local revocation do not establish real provider identity or lifecycle integration. G14/G15 remain open.                                               | Owned test service with authenticated identities, expiry, rotation, revocation and active sessions. Prove old authority fails at the receiver after acknowledged revocation; retain uncertainty during outage. Test existing-session behavior separately from new sessions.       |
| N07 / P1      | [HF response](https://openai.com/index/hugging-face-incident-and-the-road-ahead/): a compromised supporting service must not alone enable internet or internal-network access; continuously test isolation.                                                                                                                          | Kernel/descriptor experiments cover specific local routes. They are not full VM, package-service or infrastructure containment. G13/G16 remain partial.                                               | Two isolated owned services with a deliberately compromised intermediary, cached-read path, redirect and shared-artifact relay. Observe both services independently and preserve useful approved reads. No affected real endpoints.                                               |
| N08 / P1      | [MCP guidance](https://developers.openai.com/api/docs/guides/tools-connectors-mcp), [source/sink guidance](https://openai.com/index/designing-agents-to-resist-prompt-injection/) and [URL safety](https://openai.com/index/ai-agent-link-safety/): trusted destinations and valid tool schemas do not make every transmission safe. | Exact action/content binding helps, but the current inbox experiment does not validate general browser redirects, MCP data minimization or inferred sensitive content.                                | Synthetic sensitive data through URLs, tool arguments, metadata and approved-service relays; record exactly what the receiver observes. Include allowed public retrieval and authorized disclosure. Do not label this a Safe Url implementation.                                  |
| N09 / P1      | [Third-party evaluation guidance](https://openai.com/index/trustworthy-third-party-evaluations-foundations/): harness, budget, task validity and elicitation determine which claims a score supports.                                                                                                                                | Frozen replay is strong for reproducibility; same-operator tasks, short exact-copy workflows and no matched external comparator limit generalization. G18/G21/G22 remain open.                        | Independently authored held-out tasks, a fixed threat model, matched policy baseline, preregistered model/harness budgets, task-level uncertainty and cost per useful completion. Retain refusals, broken tasks and negative incremental results.                                 |
| N10 / P1      | [Safety cases](https://openai.com/index/towards-safety-cases-for-frontier-ai-training/) and [reporting framework](https://openai.com/index/model-misalignment-reporting-framework/): immutable transcripts, inspectable claims, dissent and explicit unknowns support investigation.                                                 | Hashes bind supplied bytes; same-operator snapshots do not establish completeness against a compromised host. Historical independent ceremonies do not validate this experiment. G18/G19 remain open. | Separate operator controls receiver evidence and final count/root; omission, delayed delivery and observer loss yield discrepancy or unknown. Publish a claim-to-evidence table, a dissent and unresolved risks without claiming full frontier-training assurance.                |
| N11 / P2      | [Monitoring docs](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring) and [data controls](https://developers.openai.com/api/docs/guides/your-data): alert detail may be absent; retention and third-party policies vary.                                                                            | Current raw evidence is synthetic. Real traces can expose credentials or personal data, and redaction can remove evidence needed to audit a claim.                                                    | A privacy-aware export with access controls, retention, synthetic secret checks and explicit redaction/missingness markers. Prove what remains verifiable; never equate a digest with truthful or complete observation.                                                           |
| N12 / P2      | [Deprecations](https://developers.openai.com/api/docs/deprecations) and [red teaming](https://developers.openai.com/api/docs/guides/red-teaming): hosted evaluation products change; portable evaluation remains useful.                                                                                                             | Local verification already avoids a hosted Evals dependency. No demonstrated Promptfoo interchange or maintained provider-alert compatibility contract. G23/G24 remain partial.                       | Versioned adapter contracts and lossless outcome export, including refusal/unknown/failure. Reject unsupported semantics and preserve frozen historical artifacts.                                                                                                                |

## Important integration details verified in current docs

1. **Monitoring coverage is conditional.** For covered models, Responses requests
   using persisted reasoning, WebSockets or OpenAI compaction are monitored with
   conversation stopping available. Other Responses requests are monitored but are
   not automatically stopped; Chat Completions is outside this monitoring system.
   A webhook subscription alone does not enable automatic stopping. This is the
   documentation's scope, not a live account-entitlement or model-coverage test.
2. **Treat a provider block as terminal for automatic execution.** Match
   `misalignment_policy_violation`, including stream-time errors, stop dispatch and
   retain request/response IDs. The docs provide no general resume mechanism for a
   conversation stopped by this monitor. A fallback model must not be used to evade it.
3. **Alerts are evidence to investigate, not proof of a completed stop.** Verify
   `safety.alert.created` webhooks, deduplicate deliveries and retrieve `data.id` with
   same-project `api.safety.alerts.read` permission. `request_paused: true` means
   registering the block succeeded; it does not prove execution ceased. A null reason
   or `safety_alert_not_found` must not become an invented clean result. Alert delivery
   and retrieval do not supply a complete audit history.
4. **Do not confuse safety event types.** Organization-level `safety.warning_issued`
   and `safety.deactivation_issued` use safety cases and `api.safety.read`; these are
   separate from project-level misalignment alerts. The [webhook guide](https://developers.openai.com/api/docs/guides/webhooks)
   documents signature verification, duplicate delivery and retries for up to 72 hours.
5. **Subagent creation is not an isolation boundary.** Current Agents API
   [multi-agent docs](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)
   say coordinator and subagents share the environment filesystem; subagents inherit
   configured MCP tools, credentials and allowed tools. They do not support function
   tools. Do not assume the existing native-SDK function wrapper covers this product.
6. **Deletion, rotation and revocation differ.** The vault guide says environment
   credential updates require a new session; existing sandboxes retain their configured
   credential. Deleting a stored credential neither revokes its original provider token
   nor stops the running session. Local revoke acknowledgments cannot establish either.
7. **SDK guardrails have defined boundaries.** [Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)
   places checks at the side-effecting tool, describes first-agent input and final-agent
   output guards, and says Responses/Agents SDK applications do not automatically inherit
   Codex Auto-review. Generic SDK use is not sufficient evidence of review coverage.
8. **Avoid obsolete deployment targets.** The current deprecations page schedules
   Evals read-only for **31 October 2026**, Evals shutdown for **30 November 2026**, and
   Agent Builder shutdown for **30 November 2026**. MCP docs deprecate `connector_id`
   for models released after **1 September 2026**, while retaining it for existing
   models; use the documented remote-server/tunnel path for new integrations.

## Recommended next experiments

**First: provider alerts connected to local enforcement (N01/N02).** Build an additive,
versioned adapter in a new namespace. Start with signed local fixtures and a synthetic
receiver: blocked request, stream error, duplicate/delayed alert, missing detail,
monitor outage and in-flight action. Compare the existing local-only stop policy with
the integrated controller under identical schedules. Measure post-block dispatch,
actual receiver effects, unresolved outcomes, false stops and useful completion.
Document that fixture replay is not live provider validation. A later owned webhook
test can validate transport without deliberately inducing real abuse.

**Second: safe stopping across compaction and delegation (N03–N05).** Use a fresh
protocol and held-out tasks with legitimate counterparts. Broken-task recognition,
honest uncertainty, persistent authority and useful collaboration are distinct
outcomes. A small model is suitable for development; broader model claims require a
separately budgeted fresh study. More scripted cases alone cannot establish transfer.

**Third: authenticated connector lifecycle and separate observation (N06–N10).**
Use an owned service with real authentication semantics, then obtain an outside
operator's separately retained evidence. Compare against a straightforward exact-policy
baseline. Do not assert novelty merely for approvals, logging, sandboxing or receipts;
OpenAI already describes these controls. The research question is whether their
composition improves useful, observable outcomes across failures and lifecycle changes.

These are proposals, not newly implemented features or closed gaps. Any future gate
must declare its lifecycle before freeze. This research update installs no gate and
changes no frozen experiment, model score or signed artifact.

## What would make a presentation relevant to OpenAI?

Present one narrow, reproducible contribution: **connecting authorization, provider
safety signals and observed effects while preserving useful work and explicit unknowns**.
Show where it fails, how much it costs, and which assumptions require independent testing.
OpenAI's [Safety Fellowship announcement](https://openai.com/index/introducing-openai-safety-fellowship/)
names empirical safety evaluation, robustness, scalable mitigations, privacy and agentic
oversight, and prioritizes research ability, technical judgment and execution. Its
announced May 3 application deadline has passed; it is a relevance signal, not a currently
open application invitation or prediction of selection.

The [Safety Bug Bounty announcement](https://openai.com/index/safety-bug-bounty/) focuses
on actionable harm and reproducible product behavior; its prompt-injection category
states at least 50% reproducibility. That program-specific condition is not a general
research quality threshold, and these local fixtures do not establish a bounty finding.
No submission, outreach, endorsement or access to OpenAI's internal systems is claimed.

The HF and Australian accounts motivate this work. They do not show Simurgh would have
prevented either incident. The Australian article also contains an October 4 update about
NPWS; its statements about accessed material and absent personal records remain OpenAI's
account, not an independent forensic conclusion. A public website being reachable, or a
credential being discoverable, is not authorization to use every capability it exposes.
