# Why a shared human/agent explorer is useful

Reviewed 19 October 2026. A scoped engineering assessment of selected public sources,
not proof of an unserved market or an exhaustive industry survey.

[Anthropic's January 2026 evaluation guide](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
recommends inspecting transcripts and actual outcomes, checking grader validity and
retaining balanced trials. [OpenAI's agent evaluation documentation](https://developers.openai.com/api/docs/guides/agent-evals)
already describes trace grading across tools, guardrails and handoffs. A dashboard
alone is therefore not a novel research contribution.

The useful Simurgh question is whether people and agents can inspect the same record
of **proposed action → control decision → acknowledgment → observed effect**, including
failures and missing evidence. The explorer makes inspection easier; it does not improve
containment or prove source completeness. Public exports omit original action content,
so those views cannot reconstruct a full causal trace. Optional local detail exposes
selected Phase 10 records without inventing omitted data.

[OpenAI monitoring documentation](https://developers.openai.com/api/docs/guides/safety-checks/misalignment-monitoring)
distinguishes flags from established violations and stopping from reversal of effects.
Our analysis: expose those distinctions instead of a single safety score.
[The July 2026 MCP guidance](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
explains audience and token-passthrough risks; synthetic credentials leave real identity
integration open. [Anthropic's operational measurement discussion](https://www.anthropic.com/institute/measuring-pace-of-ai-development)
identifies coverage, review latency and escalation rate. Bounded fixture timings do
not establish those deployment-level measures.

The [source and gap register](research.json) separates local work from remaining external
evidence. Search dates mean reviewed in 2026, not necessarily first published in 2026.
The existing 29-source October 16 register retains its original provenance. Search is
local; refreshing web sources requires a new dated review. Official sources were opened
and relevant sections read, not just search snippets.
