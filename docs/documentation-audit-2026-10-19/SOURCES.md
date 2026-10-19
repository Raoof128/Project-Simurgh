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
