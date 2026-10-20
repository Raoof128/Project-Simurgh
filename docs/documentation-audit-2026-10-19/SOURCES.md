# Primary-source applicability review

**Checked: 19 October 2026 (Australia/Sydney).** Sources below were searched/opened on their
publishers' sites. Dates identify the cited version or publication where available, not necessarily
the page's latest edit. Living documentation can change; the experiment's committed locks and
protocols remain the authority for what ran. No dependency or captured input was upgraded here.

This is a scoped review of applicable guidance, not an exhaustive standards inventory or a
certification assessment. The project interpretations in the last two columns are our own.

| ID  | Primary source and status                                                                                                                                                                                                                                                        | Relevant guidance                                                                                                                    | Application and remaining evidence                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), living API guidance                                                                                                                                                                   | Strict mode constrains schema shape; the application executes function calls                                                         | Document host authorization separately from valid JSON. Keep exact tool/resource checks; structured output does not grant authority                                                             |
| S02 | [OpenAI safety in building agents](https://developers.openai.com/api/docs/guides/agent-builder-safety), living vendor guidance                                                                                                                                                   | Keep untrusted variables out of developer messages; use constrained flows and approvals                                              | The role correction moves host-authored lifecycle state, not retrieved/user instructions, into the developer role. No claim that approval records prove human deliberation                      |
| S03 | [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/), living SDK guidance                                                                                                                                                                   | Agent-input guardrails can run concurrently; function-tool guards and hosted/built-in tool paths have different execution boundaries | State the tested native function-tool surface. A post-execution/output check cannot undo an effect. Current online features are not assumed present in the pinned SDK 0.23.1                    |
| S04 | [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), living service policy                                                                                                                                                                           | Application state, abuse-monitoring records and retention controls are distinct                                                      | `store:false` is not a universal zero-retention guarantee. Document synthetic payloads, local archives and exported copies separately; real account policy needs its own review                 |
| S05 | [MCP authorization, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) and [security guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices), protocol requirements and supporting guidance | Validate intended resource/audience; do not accept tokens issued for another resource or pass them through unvalidated               | Synthetic credential lifecycle is not a complete MCP/OAuth integration. Require provider-issued identity, audience and lifecycle tests before making that claim                                 |
| S06 | [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), IETF Best Current Practice 240, January 2025                                                                                                                                                                            | Updated OAuth security practice and threat model                                                                                     | Use as a requirement source for a future owned-provider connector. The current local issuer/admin fixture is not OAuth conformance evidence                                                     |
| S07 | [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) and [NIST AI 600-1](https://doi.org/10.6028/NIST.AI.600-1), voluntary framework and July 2024 generative-AI profile                                                                                         | Structure risk identification, measurement, management and communication in context                                                  | Link threat model, intended use, controls, failures and follow-up evidence. Reviewing these documents in 2026 does not turn them into a new 2026 standard or a certification                    |
| S08 | [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/), published 9 December 2025, community security guidance                                                                                           | Provides a shared risk taxonomy for agentic systems                                                                                  | Use it to structure threat review; a local lifecycle experiment is not coverage of every category. The edition year differs from publication date                                               |
| S09 | [OWASP Agent Control Standard](https://genai.owasp.org/resource/agent-control-standard-acs/), 1 September 2026 project resource                                                                                                                                                  | Describes middleware hooks and portable runtime policy controls                                                                      | Relevant prior art for host-enforced agent controls. Simurgh has not implemented or validated ACS compatibility; do not claim an unserved market merely from the existence of a dashboard       |
| S10 | [SLSA specification v1.2](https://slsa.dev/spec/v1.2/), approved specification                                                                                                                                                                                                   | Defines source/build security tracks and provenance formats                                                                          | Preserve exact source and artifact relationships. A signed Simurgh archive is not automatically SLSA provenance or a SLSA level; no level assessment was performed                              |
| S11 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/), W3C Recommendation, cited revision 12 December 2024                                                                                                                                                                                   | Defines testable web-content accessibility success criteria                                                                          | Plan keyboard, focus, zoom, contrast and assistive-technology checks for the explorer. jsdom interactions and a production build do not establish WCAG conformance; browser review remains open |
| S12 | [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence), living vendor guidance                                                                                                                                                                     | Checkpointers persist thread state; stores serve other persistence scopes                                                            | Name the tested checkpoint/approval fixture and process boundary. Persisting workflow state does not prove atomicity with an external effect or arbitrary restart safety                        |
| S13 | [OpenAI: Designing AI agents to resist prompt injection](https://openai.com/index/designing-agents-to-resist-prompt-injection/), March 2026 security analysis                                                                                                                    | Discusses contextual manipulation and reducing consequential actions under attack                                                    | Supports studying effect boundaries as well as model behavior. Simurgh does not replicate OpenAI's defenses or establish prevention of the incidents discussed                                  |

## Decisions from this review

- Keep schema validity, authorization, observed effects and model refusals as distinct concepts.
- Describe the developer-role correction narrowly: trusted host state must not become a channel
  for lower-trust content. Retain the initial failure and post-observation nature of the correction.
- Document provider identity and alert lifecycle as unvalidated integrations, despite passing
  synthetic local tests. Name resource/audience and revocation/session behavior as future checks.
- Preserve complete denominators and source revisions. Separate hash integrity, source replay,
  signer identity and independent observation; neither SLSA nor signatures supply missing evidence.
- Keep real browser/accessibility validation open. No “2026 compliant” badge or universal security
  claim follows from this review.
- Recognize existing runtime-control and evaluation tooling, including ACS and vendor SDK controls.
  A stronger novelty claim needs a systematic comparison and empirical evidence, not a list of links.

## Additional checks during the manual continuation

Checked 19 October 2026. These checks qualify historical claims; they do not update frozen
experiments or establish compatibility with a current service.

- **S14 — [Anthropic distillation defences](https://www.anthropic.com/research/distillation-defenses),
  12 October 2026, provider research report.** The provider describes reasoning-context controls,
  a two-stage classifier, rate limits and account bans, and reports a 90–99% reduction in
  harvested reasoning data on its own platform. It also reports integration costs, false
  positives and uncertainty about durability against future attacks. The older EBA/CCB
  positioning cannot treat prevention or cross-platform abuse controls as absent. These are
  provider-reported results, not independent Simurgh measurements. The narrower project question
  is whether declared enforcement evidence can be recomputed under stated trust assumptions.
- **S15 — [NIST agent-security RFI announcement](https://www.nist.gov/news-events/news/2026/01/caisi-issues-request-information-about-securing-ai-agent-systems),
  12 January 2026.** It solicited input on measuring and improving agent security, including
  deployment access constraints. Its stated comment deadline was 9 March 2026. An RFI is not
  an adopted technical standard, certification, endorsement or currently open submission call.
- **S16 — [Commission GPAI incident-template announcement](https://digital-strategy.ec.europa.eu/en/library/ai-act-commission-publishes-reporting-template-serious-incidents-involving-general-purpose-ai),
  4 November 2025, and [GPAI Code overview](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai),
  updated 7 October 2026.** The announcement explicitly maps systemic-risk GPAI reporting to
  Article 55 and Commitment 9; Article 73 addresses high-risk systems separately. The Code is
  voluntary. See M47 for the correction to Stage 4N's combined legal mapping. Synthetic cadence
  and pinned template structure do not prove filing, timeliness or legal compliance.
- **S17 — [RFC 3161 §2.4.2](https://www.rfc-editor.org/rfc/rfc3161.html#section-2.4.2),
  August 2001 standards-track protocol.** Accuracy bounds can come from the token or another
  source such as its policy. An absent Accuracy field does not establish a one-second default.
  Stage 5N's elapsed-time arithmetic is conditional on the committed uncertainty assumptions;
  it does not independently measure human attention or TSA clock correctness.
- **S18 — [Sigstore identity-token guidance](https://docs.sigstore.dev/cosign/signing/overview/#identity-tokens),
  living implementation documentation.** Automated OIDC tokens and supported workload identities
  can enable keyless signing without an interactive human login. Stage 5P's retained Rekor
  ceremony uses a self-managed key; it must not be relabeled as Fulcio/OIDC identity evidence.

## Verification and limits

This review checked the named pages and relevant passages; it did not certify every external URL
in the historical archive, reconstruct every old citation, or assess legal applicability. No new
claims about grant eligibility, venue deadlines, publication acceptance or the owner's affiliation
were inferred. Old source registers remain dated snapshots and are not overwritten by this file.
The explorer's bundled index is also unchanged; its `--year` filter means review year and performs
local search, not current web research.

### S19 — Sigstore Rekor verification contract

Checked 19 October 2026: [Rekor architecture specification](https://github.com/sigstore/architecture-docs/blob/main/rekor-spec.md),
particularly §§4, 8.1 and 9.2–9.6. A Signed Entry Timestamp is an inclusion promise over entry
metadata. Verification of inclusion also requires authenticating the checkpoint, and log trust
keys require independent distribution. M58 compares these requirements with the archived
standalone verifier's actual behavior. This is a documentation/implementation comparison, not a
new public-log ceremony or certification of the project.

### S20 — SCITT statement accuracy and participation

Checked 19 October 2026: [RFC 9943 §§9.1–9.3](https://www.rfc-editor.org/rfc/rfc9943.html#section-9.1).
Registration order need not establish issuance order; authenticated statements can be false,
and issuers may selectively omit statements. These primary-source limits support the distinction
between authenticity, accuracy and completeness in M58. Relevant passages were read; this is
not a full RFC conformance assessment.

### S21 — Early detector-paper citation versions

Checked 19 October 2026: the abstract records for [PromptSleuth](https://arxiv.org/abs/2508.20890),
[WAInjectBench v1](https://arxiv.org/abs/2510.01354v1), [WAInjectBench v2](https://arxiv.org/abs/2510.01354v2)
and [AlignSentinel](https://arxiv.org/abs/2602.13597). Titles, author lists, dates and abstract-level
scope were read. WAInjectBench's September 2026 revision changes the Wang/Xu author order;
version pinning preserves the original June citation correctly. No full-paper review or
independent reproduction of their results is claimed by this metadata check.

### S22 — Cargo test selection

Checked 19 October 2026: [Cargo test command reference](https://doc.rust-lang.org/cargo/commands/cargo-test.html),
including test-name filtering, integration-target selection and locked dependencies. A positional
filter matches test names; `--test NAME` selects an integration-test target. This supports M62's
correction to historical commands. Successful compilation or an empty filtered run does not
establish execution of the intended cases.

### S23 — XDG ScreenCast properties and session lifecycle

Checked 19 October 2026: [XDG Desktop Portal ScreenCast reference](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.ScreenCast.html),
particularly the lifecycle and `AvailableSourceTypes` property. The property reports a source-type
bitmask; session creation, source selection, starting and PipeWire access are separate operations.
The reference says starting typically presents a user dialog. This qualifies the C/D plan's
portal-active and consent wording in M62; no compositor interaction was performed for this check.

### S24 — ECMAScript string length

Checked 19 October 2026: TC39's living [String type definition](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type)
and [String instance length](https://tc39.es/ecma262/multipage/text-processing.html#sec-properties-of-string-instances-length).
String length counts 16-bit elements, not UTF-8 bytes. This supports M65's distinction between
`MAX_INPUT_CHARS` and a byte limit. The fetched living specification labels itself ECMAScript
2027; it is not cited as a finalized 2026 edition. GNU's online Bash redirection pages failed
to load during this check and are not presented as verified web sources.

### S25 — Anthropic SDK retry and timeout behavior

Checked 19 October 2026: the official [TypeScript SDK reference](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript),
particularly Retries and Timeouts. It documents two automatic retries for specified transient
failures and the `maxRetries` setting for disabling them. The installed 0.39.0 SDK was separately
inspected and tested with injected local fetch functions; M71 distinguishes that pinned behavior
from the living reference. No provider request was made. The attempted raw GitHub v0.39.0 README
URL returned 404 and is not used as evidence.

### S26 — Llama Guard 4 model card and execution surface

Checked 19 October 2026: Meta's [Llama Guard 4 model card](https://huggingface.co/meta-llama/Llama-Guard-4-12B).
It supports classifying both prompts and responses; the user-turn-only restriction in Stage 3V-B
is this experiment's configuration. The model-card example uses `AutoProcessor` and
`Llama4ForConditionalGeneration` and identifies the LlamaGuard preview Transformers release.
This supports M89's distinction between the draft loading code, retained capture code and broader
model capability. No weights were downloaded or inference performed; this source does not
independently authenticate the repository's historical capture.

### S27 — RFC 9162 Merkle-tree definition

Checked 19 October 2026 against the [RFC Editor's RFC 9162, §2.1.1](https://www.rfc-editor.org/rfc/rfc9162.html#section-2.1.1).
The standard hashes an empty tree as the hash of an empty string and splits a nontrivial tree
at the largest power of two below its length. Stage 4D instead uses an all-zero empty root and
duplicates an odd final node. Its domain prefixes are similar, but that is not the standard's
complete tree construction. This source qualifies the historical “RFC 6962 / 9162 style” label;
it does not certify repository conformance or change frozen roots.

### S28 — Adaptive-attack bibliography identities

Checked 19 October 2026 against the primary arXiv records:
[Tramèr et al. (2020)](https://arxiv.org/abs/2002.08347),
[Croce et al. (2022)](https://arxiv.org/abs/2202.13711),
[Adaptive Attacks Break Defenses (2025)](https://arxiv.org/abs/2503.00061),
[The Attacker Moves Second (2025)](https://arxiv.org/abs/2510.09023), and
[Audit Trails for Accountability (2026)](https://arxiv.org/abs/2601.20727).
The identifiers match the cited titles; the first paper's lead author is Tramèr, not Carlini.
These research references support evaluation context, not a claim that Simurgh implements their
methods or that deterministic signed fixtures demonstrate adaptive robustness (M96).

### S29 — PCTA prior-art scope

Checked 19 October 2026 against the primary arXiv records for
[Metere, Attested Tool-Server Admission (2026)](https://arxiv.org/abs/2605.24248) and
[Costa et al., Securing AI Agents with Information-Flow Control (2025)](https://arxiv.org/abs/2505.23643).
Metere describes signed server clearance, tool allowlists and host enforcement. Costa et al.
describe Fides and its confidentiality/integrity tracking and formal planner model. These are
research proposals and evaluations, not a common 2026 compliance standard or an exhaustive
survey proving Simurgh's novelty. The cited SSRN abstract 5688982 failed to load and was not
verified in this check. M103's implementation findings come from local source and temporary
probes, independently of those papers.

### S30 — CCB research references

Checked 19 October 2026 against the primary arXiv records:
[Brundage et al., Toward Trustworthy AI Development (2020)](https://arxiv.org/abs/2004.07213),
[Xu et al., Antidistillation Fingerprinting (2026)](https://arxiv.org/abs/2602.03812), and
[AEX: Non-Intrusive Multi-Hop Attestation and Provenance for LLM APIs (2026)](https://arxiv.org/abs/2603.14283).
The records match the cited research identities. Brundage et al. discuss multiple institutional,
software and hardware mechanisms; the fingerprinting work reports statistical detection
experiments. Neither establishes Simurgh's novelty, deployed enforcement, legal applicability
or an absence of other verifiable evidence systems. M105 uses these as context, not standards.

### S31 — Frontier-safety reproducibility position paper

Checked 19 October 2026: [arXiv:2605.08192v1](https://arxiv.org/abs/2605.08192v1),
_NeurIPS Should Require Reproducibility Standards for Frontier AI Safety Claims_, by
Varad Vishwarupe, Nigel Shadbolt, Marina Jirotka and Ivan Flechais (submitted 5 May 2026).
The abstract proposes public, controlled and claim-restricted disclosure with scoped claims.
The record identifies a preprint; it does not establish an adopted conference policy or
endorse Simurgh's P/A/R mapping. This check covered bibliographic identity and abstract scope,
not a full-paper review or implementation conformance assessment.

### S32 — Tool-surface motivation, approval statistics and incident attribution

Checked 19 October 2026 against these primary sources; scope was the identified passages
and bibliographic records, not a complete prior-art survey or incident reconstruction:

- [Anthropic, Trustworthy agents in practice](https://www.anthropic.com/research/trustworthy-agents)
  (9 April 2026) describes model, harness, tools and environment, and shared responsibility.
  It does not establish the spec's ranked “#1 threat” assertion or exclusive responsibility
  assignment. Its linked [March 2026 NIST RFI response](https://www-cdn.anthropic.com/43ec7e770925deabc3f0bc1dbf0133769fd03812.pdf)
  discusses agent risks and shared infrastructure. The reviewed PDF text did not substantiate
  the spec's exact attribution of cryptographic-attestation/audit-trail requests. A company
  submission is not an adopted NIST standard or endorsement of this implementation.
- [Anthropic, How we built Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
  (25 March 2026) reports 93% permission approval. That is not a measurement showing 93%
  were unread, and it does not establish the effectiveness of delta-bound consent.
- [Snyk, ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
  (5 February 2026), findings table: 1,467 of 3,984 sampled skills (36.82%) had any security
  issue; the category table reports 2.6% prompt-injection detection across ClawHub. Preserve
  the sampling and detector scope; the headline must not substitute for the table's denominator.
- [Bhatt, Narajala and Habler, ETDI](https://arxiv.org/abs/2506.01333v1) (2 June 2025)
  proposes cryptographic identity, versioned definitions and permission/policy controls.
  The abstract does not establish that the approach excludes verification or that no other
  system implements verification-side mechanisms.
- [RyotaK / GMO Flatt Security, Poisoning Claude Code](https://flatt.tech/research/posts/poisoning-claude-code-one-github-issue-to-break-the-supply-chain/)
  is dated 1 June 2026. Its timeline reports a January GitHub Actions permission-bypass
  disclosure/fix and later remediation. The located matching-title source does not support
  the spec's May MCP-incident/2.1.128 attribution. Keep that attribution unverified rather
  than inventing a concrete before/after tool-surface reconstruction.

### S33 — Custody motivation and the shadow-API sample

Checked 19 October 2026. [Zilan Qian's ChinaTalk article](https://www.chinatalk.media/p/how-to-buy-cheap-claude-tokens-in)
is dated 5 May 2026; it is contextual reporting, not a Simurgh experiment or standard.
The primary paper is Zhang, Jiang, Chen, Backes, Shen and Zhang,
[Real Money, Fake Models: Deceptive Model Claims in Shadow APIs](https://arxiv.org/abs/2603.01919),
first submitted 2 March 2026. Its [5 March version](https://arxiv.org/html/2603.01919v2)
identifies 17 services but empirically audits three representative providers. The September
revision uses more qualified behavioral/fingerprint language and reports CCS 2026 acceptance.
Do not call all 17 empirically tested or adopt their results as this repository's measurements.
The inspected source sections establish identity and sample scope, not a full independent
replication. [RFC 9334](https://www.rfc-editor.org/rfc/rfc9334.html) supplies RATS architectural
vocabulary; citation alone establishes no protocol conformance or trustworthy remote execution.

### S34 — Friction receipts and governance prior art

Checked 19 October 2026 against primary abstracts and official GitHub documentation:

- [Proof-Carrying Agent Actions](https://arxiv.org/abs/2606.04104), Zexun Wang,
  2 June 2026, explicitly includes approval receipts and enforceability classes, not
  solely non-execution proofs. Its bounded reference evaluation is not a standard.
- [Notarized Agents](https://arxiv.org/abs/2606.04193), Juan Figuera, 2 June 2026,
  proposes receiver-signed confidential receipts and a transparency log; its abstract
  explicitly discusses suppression, collusion and adoption limits.
- [Governing Actions, Not Agents](https://arxiv.org/abs/2606.26298), Jakob Salfeld-Nebgen,
  24 June 2026, proposes separately attested preconditions bound to intent and deterministic
  policy, with a proof of concept. These abstracts establish relevant prior art, not an
  exhaustive firstness comparison or independent validation of Simurgh.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
  support required reviews before merging, stale-review invalidation and approval by someone
  other than the latest pusher, subject to configured bypass rules. The frozen map's blanket
  statement that GitHub evidence is not ordered or separated is too broad. Distinguish those
  platform controls from a portable cryptographic receipt protocol without denying their
  existing approval semantics or implying configuration has been checked for this repository.

### S35 — Information sharing is a motivation, not proof of an unserved market

Checked 19 October 2026. The [Frontier Model Forum information-sharing page](https://www.frontiermodelforum.org/information-sharing/)
confirms a March 2025 agreement and lists a February 2026 progress update and May 2026 issue
brief. Its public overview does not specify every internal verification or privacy mechanism;
absence of implementation details is not evidence that members lack such controls or that
Simurgh uniquely supplies them. [Nicholas Felstead's Enabling Frontier Lab Collaboration to
Mitigate AI Safety Risks](https://arxiv.org/abs/2511.08631), submitted 9 November 2025, discusses
antitrust concerns and possible reforms. The inspected abstract does not endorse this protocol
or establish that digest-only sharing eliminates legal risk. Apply M41's jurisdiction/scope
qualifications to the frozen SB 53, RAISE and Article 73 comparison, and S31's proposed-research
status to the reproducibility position paper. Counts and match results can still disclose
information; a protocol's disclosure vocabulary is not a legal or privacy certification.

### S36 — Offline delegation verification already exists in prior art

Checked 19 October 2026. The official [Eclipse Biscuit overview](https://www.biscuitsec.org/)
describes public-key verification by a holder of the issuer's public key, offline attenuation
and Datalog policy enforcement. Calling it merely “runtime trust” is misleading; distinguish
its authorization-token semantics from a claimed complete execution census. The primary abstract
of [AIP: Agent Identity Protocol for Verifiable Delegation Across MCP and A2A](https://arxiv.org/abs/2603.24775),
Sunil Prakash, submitted 25 March 2026, describes IBCTs, chained Biscuit policies, provenance
records and reference implementations. Its reported timings and attack results are the author's
bounded evaluation, not Simurgh measurements or a standards endorsement. These sources establish
relevant overlap, not a complete feature audit or proof of either system's firstness. An AAIF
proposal reference likewise does not establish an adopted standard; the frozen specification's
84% survey statement lacks a traceable sample/method in that passage and should not be reused
as verified industry prevalence.

### S37 — Incident-report motivation does not establish report sufficiency

Checked 19 October 2026. [Decision Evidence Maturity Model for Agentic AI](https://arxiv.org/abs/2605.04093),
Oleg Solozobov, submitted 29 April 2026, names the container fallacy and explicitly labels its
synthetic/public-incident exercise implementation behavior rather than external validation.
It motivates property-specific evidence assessment; it does not validate VIC or establish that
all incident tools lack comparable controls. [Transparency as Architecture](https://arxiv.org/abs/2603.26983),
Schmitt, Kruse, Sahitaj and Schöning, submitted 27 March 2026, studies Article 50(2) marking
and transparency. Its abstract and inspected legal/technical sections do not substantiate the
frozen spec's attributed quotation about the Act's logging duty having no cryptographic integrity.
Do not reuse that quotation with this citation as verified support. Use the Commission sources
in S16 and the regime/schedule qualifications in M41/M47 for legal claims. Pinning a local heading
transcription does not make it a current, complete official template or an accepted filing.
The prior-art sweep and named-buyer framing remain author hypotheses, not an exhaustive market
survey, regulatory endorsement or independent assessment of this implementation.

- **S38 — Stage 4V legal and identity rationale (checked 2026-10-19).** The California
  Assembly Judiciary Committee's [2025 bill summary](https://ajud.assembly.ca.gov/system/files/2025-10/2025-asm-jud-bill-summary.pdf),
  printed page 14, identifies AB 316 as chapter 672 and describes a restriction on asserting
  AI autonomy as the cause of alleged harm. It expressly preserves other defenses and evidence
  concerning comparative fault, causation and foreseeability. This is not automatic liability,
  a validation of Simurgh's allocation model or a mandate for its counter-capsule format.
  The official enacted-text page returned 403; the committee PDF's relevant entry was read
  locally, rather than treating a failed fetch as verification of the complete statute.
  [NIST's 17 February 2026 initiative announcement](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure)
  includes research on agent security/identity and industry-led standards development. It
  does not establish that Simurgh's keys identify real accountable parties, certify its schema,
  or guarantee that future identity integration requires no schema changes. The source is an
  initiative announcement, not a final interoperability standard or implementation validation.

- **S39 — Stage 4W provenance and incident comparisons (checked 2026-10-19).**
  [C2PA 2.3 technical specification](https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html),
  §§1.2–1.3, 2.3 and 18.2, describes signed claims, assertions and content binding; its regions
  of interest include textual ranges and character offsets. Therefore “signs the file, never
  the sentences” is an overbroad comparison. The supplied quotation about declaration truth
  is not established here as a verbatim quotation from the specification. Provenance validation
  does not adjudicate factual truth, and emitting an in-toto statement is not a C2PA integration.
  This review inspected the relevant sections, not the complete external specification.
  [NIST's 9 March 2026 AI 800-4 announcement](https://www.nist.gov/news-events/news/2026/03/new-report-challenges-monitoring-deployed-ai-systems)
  identifies monitoring challenges using practitioner workshops and literature review; it is
  neither a universal incident-reporting format nor validation of VSN. The [Oregon Judicial
  Department's 5 June 2026 announcement](https://apps.oregon.gov/oregon-newsroom/OR/OJD/Posts/Post/Oregon-Supreme-Court-issues-first-AI-orders)
  confirms separate state-court actions involving fabricated citations and quotations; it does
  not verify the design's federal Brigandi sanction amounts/counts. The 1,313 proceedings,
  106 countries, 11-fold escalation, April order/counts and dated KPMG withdrawal claims remain
  unverified historical secondary-source claims in the frozen design. Do not republish them
  as established statistics, exact primary-source quotations or proof VSN prevents those events.

- **S40 — Stage 4X benchmark and institutional comparisons (checked 2026-10-19).**
  [PADBen](https://arxiv.org/abs/2511.00416), Zha, Min and Sushmita, submitted 1 November 2025,
  concerns AI-generated-text detection under paraphrasing, including authorship obfuscation;
  it is not a benchmark of factual incident-claim truth. The primary abstract links code and
  does not establish the design's blanket assertion that paraphrase benchmarks are impossible
  to reproduce offline. Frozen labels can be replayed even when their creation used a model;
  replay and independent semantic validation are different claims. [CheckList](https://aclanthology.org/2020.acl-main.442/),
  Ribeiro, Wu, Guestrin and Singh, ACL 2020, provides behavioral test methodology and generation
  tools. Its primary abstract does not prove that nobody has combined metamorphic tests with
  signed reports, nor establish VLR's claimed novelty. These were metadata/abstract checks,
  not complete reviews of the external papers.
  [NIST's AI 800-2 draft announcement](https://www.nist.gov/news-events/news/2026/01/towards-best-practices-automated-benchmark-evaluations),
  dated 30 January 2026, describes voluntary preliminary evaluation practices and a comment
  period ending 31 March. It is not an endorsement or certification of VLR, and it does not
  prove the claimed universal finite-guardrail impossibility result. No specific such theorem
  is established by this citation. [Anthropic's RSP v3 announcement](https://www.anthropic.com/news/responsible-scaling-policy-v3)
  describes periodic Risk Reports and external review in specified circumstances, not an
  unconditional external-review requirement for every model/report. It does not establish
  that reviewers have no analysis tools or that VLR makes their safety cases machine-verifiable.
  ISO audit acceptability, AILuminate/institute adoption and benefit scores remain proposed
  positioning, not demonstrated conformance, partnership or independent validation.

- **S41 — Stage 4Y review, redaction and OSCAL comparisons (checked 2026-10-19).**
  [METR's 8 May review summary](https://metr.org/blog/2026-05-08-rd-section-anthropic-risk-report-feb-2026-review/),
  by Jurkovic, Barnes and Wijk, identifies a missing survey response counted as negative and
  broader evidentiary problems. It also agrees with the low-risk conclusion using additional
  evidence. Neither that finding nor access to private materials demonstrates a Simurgh pilot,
  that reviewers work without tools, or that a lexical residue map would detect the miscount.
  [Barrett et al.](https://arxiv.org/abs/2604.21964), submitted 23 April 2026, describes external
  Assurance 2.0 review of DeepMind's safety case; the primary abstract confirms that scope,
  not the frozen design's precise quotations or person-month estimate. Those details were
  not revalidated against the full paper in this check.
  [Bland, Iyer and Levchenko's PoPETs 2023 paper](https://petsymposium.org/popets/2023/popets-2023-0069.pdf),
  §4, printed page 47, reports 80,000 dictionary guesses/second on its specified laptop and
  explains limits when the right candidate is absent. It studies PDF glyph geometry, not
  Simurgh byte partitions or a proof that publishing those partitions preserves confidentiality.
  The article's relevant section, rather than its entire text, was checked.
  [Cilla Ugarte et al.](https://arxiv.org/abs/2604.13767), submitted 15 April 2026, proposes OSCAL
  for AI governance and reports schema-validated native results in its own implementation.
  This primary-abstract claim cannot be transferred to VDR's projection.
  NIST's pinned v1.1.2 [assessment-results metaschema](https://github.com/usnistgov/OSCAL/blob/v1.1.2/src/metaschema/oscal_assessment-results_metaschema.xml),
  [metadata metaschema](https://github.com/usnistgov/OSCAL/blob/v1.1.2/src/metaschema/oscal_metadata_metaschema.xml)
  and [assessment-common metaschema](https://github.com/usnistgov/OSCAL/blob/v1.1.2/src/metaschema/oscal_assessment-common_metaschema.xml)
  explicitly require the fields missing from VDR in M118. Relevant definitions were checked;
  the repository's hand-written projection test does not validate against these schemas.
  VDR is neither a complete OSCAL document nor evidence of FedRAMP/AI Act compliance.
  Incident statistics remain qualified by S39; legal timing remains qualified by M41/M47.

- **S42 — Stage 4Z interpretability rationale (checked 2026-10-19).**
  The [Anthropic workspace paper](https://transformer-circuits.pub/2026/workspace/index.html)
  is dated 6 July 2026. Its limitations explicitly reject assuming J-space monitoring is
  sufficient; the method/data discussion describes a default thousand sequences and a lens
  that incompletely captures the relevant structure. These sections support distinguishing
  VWA's proposed restricted instrument from a replication of the complete paper. They do not
  establish independent capture, statistically uncorrelated defenses or universal coverage.
  [STATEWITNESS](https://arxiv.org/abs/2606.17478), Chen et al., submitted 16 June 2026, describes
  an activation explainer evaluated on two reasoning models and seven deception datasets.
  [Building Production-Ready Probes For Gemini](https://arxiv.org/abs/2601.11516), Kramár et al.,
  submitted 16 January and revised 10 February 2026, reports deployment-informed probe research
  and important distribution-shift limitations. These primary abstracts establish research
  scope, not that either organization has no signatures, audit infrastructure or evidence
  contract anywhere. A keyword absence in a paper cannot establish that industry-wide claim;
  the historical PDF word-search results were not rerun as a comprehensive prior-art survey.
  [Duan's monitor-staleness study](https://arxiv.org/abs/2606.15980), submitted 14 June and revised
  18 June 2026, reports update- and monitor-dependent effects. A copied revision/lens digest
  pair neither authenticates an execution nor measures this performance drift. Primary
  metadata/abstracts and the specified workspace sections were checked, not all cited papers.
  Futurium participant commentary is not binding EU guidance; M41/M47 govern the legal claims.
  The MDF, Goodfire, Petri, FMTI, Mythos and other comparisons do not substantiate universal
  absence of verification mechanisms, Simurgh adoption, complete MDF mapping or the design's
  precise first-in-field and usefulness scores. Treat those assertions as historical positioning,
  not independently established facts or regulatory approval.

- **S43 — Stage 5A introspection and monitorability sources (checked 2026-10-19).**
  [Singh, Linzen and Ravfogel](https://arxiv.org/abs/2605.26242), submitted 25 May and revised
  21 August 2026, is now marked accepted at COLM 2026. Its abstract distinguishes privileged
  internal access and second-order computation from input cues/task performance; it does not
  validate VNC's author-supplied claim mapping. [Venkata](https://arxiv.org/abs/2605.27773),
  submitted 26 May 2026, studies reasoning faithfulness under knowledge conflict. These
  primary abstracts support the research motivation, not a universal absence of attestation
  or a claim that the dispute has been settled by this repository.
  The [J-lens paper's ablation passage](https://transformer-circuits.pub/2026/workspace/index.html)
  reports 71% to 3% verbalized evaluation awareness under an intervention. That is not a
  measured discrepancy rate for two simultaneous VNC witnesses, nor a result obtained here.
  OpenAI's [Evaluating chain-of-thought monitorability](https://openai.com/index/evaluating-chain-of-thought-monitorability/)
  is dated **18 December 2025**, not 2026. It introduces an evaluation framework and explicitly
  discusses limits; the [23 April 2026 open-source release](https://alignment.openai.com/monitorability-evals/)
  provides a subset of datasets and reference code, with an illustrative mocked scaffold and
  named private-data omissions rather than a complete supported evaluation framework. Characterizing the entire research surface as
  unreproducible provider prose overlooks those artifacts; they are not a VNC adoption.
  The [official constitution page](https://www.anthropic.com/constitution) explicitly grants
  CC0 1.0 reuse. That verifies the licensing statement, not the placeholder strings' provenance,
  a retained January snapshot or the truth of training-example-to-principle assignments.
  These were targeted abstract/metadata, method-passage and licensing checks, not complete
  external-document reviews. S42 and M41/M47 continue to qualify institutional and legal claims.

- **S44 — Stage 5B red-team measurements (checked 2026-10-19).**
  [Erdem's 400-run study](https://arxiv.org/abs/2605.30096), submitted 28 May 2026, concerns
  four models against a fixed penetration-testing target. Its primary abstract explicitly
  corrects an earlier classification of upstream API overloads as safety refusals. It supports
  distinguishing infrastructure failures from model decisions, not treating every nonzero
  verifier result as a security success or validating VAR's repeated deterministic mutations.
  [Zou et al.](https://arxiv.org/abs/2507.20526), submitted 28 July 2025, reports the public
  challenge; [Table 1 and §2.2](https://arxiv.org/html/2507.20526v1) give 12.7% overall,
  5.7% direct and 27.1% indirect values. Those are table averages with a user-session ASR
  definition, not simply successes divided by the roughly 1.8 million attempts. They must
  retain their denominators and must not be compared directly with VAR's fixture rate.
  NIST's [17 January 2025 technical blog](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations),
  updated 19 December 2025, describes an experiment in which 25 attempts increased average
  success across five injection tasks from 57% to 80%. This is not a 2026 competition result
  or a universal attack probability. Its separate held-out attack comparison is 11% to 81%.
  The blog publishes an evaluation-framework link; neither that artifact nor the February
  2026 initiative establishes absence of signed evidence throughout the industry. These
  checks covered primary metadata/abstracts, Table 1/§2.2 and the relevant NIST experiment
  passages, not full external papers. Source validity does not establish VAR adoption,
  regulatory conformance, novelty priority or independent validation.

- **S45 — Stage 5C metamorphic testing and guardrail sources (checked 2026-10-19).**
  [MORTAR](https://arxiv.org/abs/2412.15557), Guo et al., originated 20 December 2024;
  the current v4 is dated 17 June 2026 and marked accepted in IEEE TSE. It establishes
  relevant prior work, not VSB novelty or contamination freedom. [Young's guardrail study](https://arxiv.org/abs/2511.22047),
  submitted 27 November 2025, confirms ten models and 1,445 prompts in its abstract. Its
  reported generalization gaps do not prove that all associated artifacts lack itemized
  outcomes; that blanket negative comparison remains unestablished.
  [Hackett et al.](https://arxiv.org/abs/2504.11168), submitted 15 April and revised 14 July
  2025, reports evasion reaching 100% in some evaluated settings across six protection
  systems. This is not a guarantee that every Prompt Guard version, corpus or threshold is
  fully evadable, and VSB did not execute that experiment. [BingoGuard's ICLR 2025 record](https://proceedings.iclr.cc/paper_files/paper/2025/hash/782b6152c04e9948c2cb3833e9a288ef-Abstract-Conference.html)
  describes topic-specific severity rubrics and model predictions. A digest-nibble bucket
  is not an equivalent severity assessment. The underspecified MTF/ICAIAT citation was not
  resolved in the targeted search and must not support priority claims.
  [Seth and Sankarapu's position paper](https://arxiv.org/abs/2605.15164), submitted 14 May
  2026, argues for limits on behavioral assurance; it is not a binding governance standard
  or validation of Simurgh. Anthropic's [BrowseComp engineering account](https://www.anthropic.com/engineering/eval-awareness-browsecomp)
  was published **6 March 2026**, not February. It separates nine ordinary contamination
  cases from two successful evaluation-aware answer-key retrievals across 1,266 problems.
  Static transforms and signed counts do not by themselves establish immunity to selection
  bias, training contamination or benchmark gaming. These checks covered primary metadata,
  abstracts, the conference record and the relevant engineering passages, not full external
  papers. S42 qualifies the Gemini-probe analogy; M41/M47 qualify EU dates and legal status.

- **S46 — Stage 5D Unicode claims (checked 2026-10-19).**
  The official [UTS #39 confusable-detection guidance](https://www.unicode.org/reports/tr39/)
  distinguishes same-script, mixed-script and whole-script confusability. Its skeletons are
  internal comparison forms, not display text or a general normalization replacement, and
  stored skeletons need version-aware handling when Unicode is updated. This supports
  explicit data/version pinning, not a proof that every fixed table must fail every chosen
  corpus or that Simurgh's unimplemented C corner has measured complete closure.
  [UAX #15 §3](https://www.unicode.org/reports/tr15/) gives normalization stability guarantees
  for characters assigned in the relevant versions; its introduction also cautions that
  compatibility normalization can erase meaningful distinctions. Those guarantees differ
  from confusable-table stability and do not validate an arbitrary lexical detector's
  permanent robustness. These targeted primary-standard sections, not the entire reports,
  were checked. Neither standard establishes the proposed three-corner impossibility or
  certifies the repository's implementation; S45 retains the bounded guardrail prior art.

- **S47 — Stage 5E detector and loading contracts (checked 2026-10-19).**
  Meta's [Prompt Guard 2 86M model card](https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M)
  describes binary benign/malicious classification, a 512-token context, an argmax example,
  adaptive-attack limitations and application-dependent performance. These support a local
  reference threshold, not a vendor-prescribed universal 0.5000 operating point, calibrated
  probabilities or a conclusion that every generic fixture is malicious under its scope.
  The page requires gated access under the Llama 4 license: offline inference can avoid a
  hosted API after acquisition, but “no key” must not imply anonymous unrestricted download.
  The card links inference utilities and fine-tuning resources; it does not establish that
  no reproducible evidence exists anywhere. Its current page is not a reconstruction of the
  historical pinned snapshot, and the eight local sentences lack exact publication citations.
  Hugging Face's [Auto-class loading documentation](https://huggingface.co/docs/transformers/main/en/model_doc/auto)
  provides explicit `revision` and `local_files_only` controls. Omitting them from the capture
  call is not equivalent to enforcing a pinned offline load. Targeted model-card scope,
  usage/limitations and loading-parameter sections were checked, not the entire API reference.
  S45 bounds the earlier Prompt Guard evasion study; S46 bounds normalization claims.

### S48 — Stage 5F regulatory scope and extensible attestation formats

Checked the [European Commission's Code overview](https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai)
(current page updated 7 October 2026). The GPAI Code, published 10 July 2025, is voluntary;
it helps demonstrate compliance with binding AI Act obligations. Its Safety and Security
chapter concerns providers of GPAI models with systemic risk under Article 55. The frozen
spec's blanket “Code mandates” wording conflates voluntary commitments, underlying statutory
obligations and applicability. Do not generalize its proposed annual testing schedule to every
AI provider or treat VMP as a regulatory conformance certificate. This check covers the overview,
not a clause-by-clause legal opinion or full Safety and Security chapter review.

The [in-toto Statement v1](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md)
binds subjects to a URI-identified predicate; its [predicate specification](https://raw.githubusercontent.com/in-toto/attestation/main/spec/v1/predicate.md)
provides the extension mechanism. [C2PA 2.3](https://spec.c2pa.org/specifications/specifications/2.3/specs/C2PA_Specification.html),
section 11.1.4.3, explicitly accommodates custom assertions. Therefore “structurally cannot
express” detector-panel completeness is unsupported. A standard built-in panel predicate and
an extensible envelope capable of carrying one are different questions. The older C2PA
attestation section is not an exclusion applying to all C2PA assertions. These targeted sections
do not establish absence of equivalent prior art, patent novelty, universal interoperability or
SCITT incompatibility. The scorecard remains the author's assessment, without lab endorsement.

### S49 — Stage 5G mock anchoring versus the Sigstore bundle contract

Read the relevant verification-material and content sections of the official
[Sigstore Bundle Format](https://docs.sigstore.dev/about/bundle/) (page identifies version 0.3.2,
updated 14 January 2025). It distinguishes a certificate with identity extensions from an
out-of-band public-key identifier, and specifies signed timing evidence for validating short-lived
certificates after expiry. Transparency entries are encouraged, not universally required by the
format. DSSE content uses an envelope and an in-toto statement. The implementation's bare PEM,
fixed integer time and plain JSON signature do not implement that contract. A key fingerprint
allowlist alone is not an OIDC/Fulcio identity chain. This targeted source check does not assert
that every Sigstore deployment must use identical log policy or that offline verification is
impossible; the bundle is specifically designed to carry verification material.

### S50 — Stage 5H transparency figures, benchmark comparability and legal dates

The current [Stanford CRFM December 2025 FMTI page](https://crfm.stanford.edu/fmti/December-2025/index.html)
reports a mean of **41**, down 17 points from 58, across 13 companies. It explicitly changes
indicators and adds companies, so this is not a controlled longitudinal estimate for a fixed
population. The frozen spec's 40/100 should not be repeated as the current page's value.
Relevant indicator/results passages in the [report](https://crfm.stanford.edu/fmti/December-2025/paper.pdf)
support no scored company disclosing train-test overlap; that is the index's assessed sample,
not a census of every developer. This was a targeted source check, not a full report review.

[Epoch's 23 January 2025 clarification](https://epoch.ai/latest/openai-and-frontiermath)
describes ownership/access to the commissioned problems and a 50-question solution holdout.
Its [historical benchmark methodology](https://epoch.ai/benchmarks/frontiermath-tiers-1-3-v1)
explicitly identifies possible differences in scaffolding, test-time compute and problem subset
(180 versus 290) from OpenAI's evaluations. The quoted approximately 25% versus 10% comparison
is therefore not a same-recipe reproduction failure or evidence of cheating. A holdout protects
an access boundary; it does not alone supply VSD signatures or justify an automatic tier label.

The Commission's [GPAI guidelines overview](https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers)
distinguishes obligations applying from **2 August 2025**, enforcement powers from **2 August
2026**, and compliance by **2 August 2027** for models placed on the market before the first date.
The spec incorrectly places both GPAI transparency obligations and enforcement in August 2026.
Article 50 system-transparency provisions are a separate scope; consult M41/M47 for the wider
schedule. The guidelines and Code are not binding statutes themselves, and a model-documentation
form or private/public reporting distinction does not mandate VSD's tier calculus. S48 retains
the Code's systemic-risk applicability qualification.

### S51 — Split external review is a policy commitment, not a cryptographic assurance standard

Anthropic's [official RSP version history](https://www.anthropic.com/responsible-scaling-policy)
identifies version 3.4 as effective **8 July 2026**. Its change summary permits multiple outside
reviewers to cover different unredacted report sections if their combined review covers all
parts. It also distinguishes report coverage date from publication date and requires visible
redaction indications. That supports Stage 5I's coverage motivation. It does not prescribe VPC,
certify its identities, or equate set coverage with diligence. The current page includes later
updates; v3.4 is a historical policy version, not the current universal 2026 standard.

The [2025 pilot announcement](https://alignment.anthropic.com/2025/sabotage-risk-report/)
describes a practice exercise for potential future obligations and internal/external review.
This historical review is not evidence that Simurgh's 2026 fixture panel had unredacted access.
These were targeted checks of the publisher's policy history and pilot announcement, not a
complete new review of the linked risk reports or a market-wide novelty search.

### S52 — Contest recording, cross-evaluation and actual transparency receipts

Checked 20 October 2026. [RFC 9943](https://www.rfc-editor.org/info/rfc9943/), published June 2026,
describes SCITT signed statements, transparency services, verifiable data structures and receipts.
A JSON field equaling a local root is not evidence of registration under that architecture. Its
extensible content does not substantiate the frozen claim that general attestation systems are
structurally unable to carry multi-party contest information. This was a targeted architecture
check, not certification of the implementation or a complete novelty search.

The [Anthropic pilot account](https://alignment.anthropic.com/2025/openai-findings/) confirms a
2025 cross-evaluation of the parties' public models. [METR's risk-assessment index](https://metr.org/risk-assessment/)
identifies its Opus 4.6 report review as 12 March 2026. Neither source authenticates Simurgh's
rating pairs. The [2025 pilot announcement](https://alignment.anthropic.com/2025/sabotage-risk-report/)
describes revision with internal and external reviewers; the broader assertion that external
evaluation “does not bite” overstates what these sources establish. These checks do not establish
whether every deployment decision was affected, nor a universal absence of postponements.

### S53 — Universe commitments require real anchor evidence and a bounded taxonomy interpretation

Checked 20 October 2026. [RFC 9162](https://www.rfc-editor.org/rfc/rfc9162.html) distinguishes a
signed certificate timestamp's promise from later Merkle inclusion verification against a signed
tree head, with a maximum merge delay. Neither an anchor type string nor a generic JSON object
supplies those proofs. VUC's domain-separated Merkle profile borrows tree structure; it is not
RFC 9162 certificate/carrier encoding. The [PLANTS document history](https://datatracker.ietf.org/doc/draft-ietf-plants-merkle-tree-certs/)
now identifies revision **07**, an Internet-Draft. The frozen unversioned May reference is not a
stable published standard or a complete prior-art exclusion.

Anthropic's [ATT&CK analysis](https://www.anthropic.com/research/attack-navigator) and
[companion navigator](https://red.anthropic.com/2026/attack-navigator/navigator) describe 832 banned
accounts, 13,873 **technique observations**, all 14 tactics and 482 unique sub-techniques mapped
to ATT&CK v18. Observed categories are not proof that every taxonomy item was evaluated, and v18
is the analysis's historical version. These targeted source checks support the scope-versus-
adequacy motivation; they do not authenticate Simurgh's commitments or imply vendor adoption.

### S54 — Temporal evidence, timestamp accuracy and verification time

Checked 20 October 2026 against primary sources for M131:

- [SEC order 34-92361, 9 July 2021](https://www.sec.gov/files/litigation/admin/2021/34-92361.pdf),
  especially the findings on late-prepared/backdated audit documentation, supports the motivating
  problem. The order is accessible; an earlier access-block note is historical. It does not establish
  that Simurgh prevents those acts or supplies regulatory compliance.
- [RFC 3161, §2.4.2](https://www.rfc-editor.org/rfc/rfc3161.html) defines time accuracy and the interval
  around `genTime`. Missing accuracy components differ from an absent complete accuracy field, whose
  meaning may depend on the TSA policy. Absence does not justify silently assuming exact time.
- [OpenSSL `ts`](https://docs.openssl.org/master/man1/openssl-ts/) and
  [verification options](https://docs.openssl.org/4.0/man1/openssl-verification-options/) distinguish
  token/digest verification from certificate validation at a selected reference time. `-attime` selects
  a time other than the default current time; a successful current check is not by itself proof of
  certificate validity at the token's generation time.
- [C2PA Technical Specification 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html)
  is a published version, not an invented reference. Its timestamp/trust requirements are separate
  from this fixture adapter and provide no conformance finding for Simurgh.
