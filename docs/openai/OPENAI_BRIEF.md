# Project Simurgh: inspectable authorization for AI agents

**Technical review brief · Updated 19 October 2026 · Research prototype.**
No provider endorsement, funding, submission or production-readiness claim is implied.

## Research question

Can a host-controlled boundary reject a proposed action when authority changes, preserve
legitimate work, and retain enough receiver evidence for another person to inspect the result?
Simurgh studies this question with exact-action permissions, delegation, safety stops, monitor
leases, credential/session lifecycle and conservative handling of unknown effects.

## Measured result

A two-model study retained **96 proposals and 288 matched control branches** over 24 internally
authored tasks. Llama's restricted-state trials with new effects fell from **17/24 to 0/24**
under composed controls while active completions stayed **23/24**. Luna completed **24/24**
active trials but already had zero restricted effects in the credential-only baseline; no
incremental protection is established for Luna. All controls retain prior effects in unknown-
acknowledgement fixtures. The small, known-family corpus and different model interfaces do not
support a model ranking or general safety conclusion.

A separate live Responses workflow initially declined all eight cases because host updates
were supplied in the user role. The separately frozen developer-role correction completes
**2/3 authorized cases** and declines **5/5 restricted cases**. One active refusal remains;
all original outcomes are retained. Only host-authored lifecycle state belongs in the developer
update. A model decline is not an attempted call stopped by the enforcement boundary.

Read the [comparison](../research/transfer-phase-17/RESULTS.md) and
[correction](../research/provider-role-phase-17b/RESULTS.md), then run the
[credential-free replay](../../README.md#replay-the-evidence). No new API request or model
download is needed. Source revisions and expected archive roots are part of verification.

## What a reviewer can inspect

- Matched credential-only, composed and deny-all controls; useful completion and unauthorized
  effects are reported separately, with refusals, malformed proposals and unknowns retained.
- Raw receiver snapshots, frozen source bindings and fresh local execution of saved proposals.
  Signatures and hashes establish key/byte relationships, not truthful capture or outside custody.
- [Full smoke receipts](../research/smoke-validation-2026-10-19/RESULTS.md): 142 base steps,
  32 E2E steps and supplemental suites at recorded revisions. Managed browser parity remains
  blocked; native unit/build results do not establish interactive platform behavior.
- A [dashboard and JSON CLI](../../tools/simurgh-explorer/README.md) sharing one query core.
  Their built-in 144-row dataset is the earlier Phase 10/14 study, not the newer comparison.

## Relevance and next evidence

[OpenAI's prompt-injection analysis](https://openai.com/index/designing-agents-to-resist-prompt-injection/)
motivates controlling consequential actions as well as model behavior. Existing SDK guardrails,
MCP/OAuth requirements and OWASP runtime-control work are relevant prior art; the
[primary-source map](../documentation-audit-2026-10-19/SOURCES.md) records applicability and limits.
This evidence does not establish that competitors lack equivalent controls.

Next priorities are independent replay, externally authored transfer tasks, real provider identity
and alert lifecycle, representative deployment reliability and browser/accessibility validation.
The [research roadmap](../../ROADMAP.md) names acceptance evidence for each. The local Phase 8
review is [complete within its scope](../research/PHASE_8_REVIEW_2026-10-19.md), not independent
certification. Historical 5Q coverage remains 6.2%; 5R adds no discharged cells; 5S witness
independence remains unproven.

The [application proposal](PROPOSAL.txt) remains an owner-review draft. Applicant identity,
affiliation, resources, terms and submission are separate decisions. Existing code remains under
its applicable licenses; no acceptance, endorsement or relicensing is implied.
