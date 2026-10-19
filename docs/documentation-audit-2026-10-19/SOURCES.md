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
