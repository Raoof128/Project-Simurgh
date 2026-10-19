# Research fit and next evidence

**Updated: 19 October 2026.** Simurgh contributes an inspectable experiment about changing
application authority, useful completion and observed effects. Its value depends on correct
measurement and reproducibility. Test volume, document volume and provider names do not establish
novelty, external validity or selection by a grant programme.

## Evidence available now

The [current brief](OPENAI_BRIEF.md) summarizes the two-model comparison, the retained failed
interface and the separate developer-role correction. The [integration matrix](../INTEGRATIONS.md)
distinguishes real native SDK paths from synthetic provider lifecycle fixtures. The
[latest smoke report](../research/smoke-validation-2026-10-19/RESULTS.md) records passing checks,
original failures and excluded browser/platform work at exact revisions.

The original [offline instrument](EVALUATION.md) remains useful for deterministic controls and
artifact-tamper checks. Its [readiness report](READINESS_REPORT.md) is a dated result for that
instrument, not a statement that later live captures never happened. The
[optional Inspect task](../../tools/openai-readiness/inspect/README.md) exposes those synthetic
cases; an adapter does not make them an established external benchmark.

## Relationship to existing work

| Research area                                 | Relevant primary source                                                                                        | What Simurgh can test                                                   | What it cannot infer                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Prompt injection and constrained consequences | [OpenAI agent-security analysis](https://openai.com/index/designing-agents-to-resist-prompt-injection/)        | Unauthorized effects and legitimate utility under matched controls      | General prevention of real incidents or a replication of OpenAI's product defenses       |
| Native execution and approval boundaries      | [Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/)                             | Declared function-tool and approval/resume paths                        | Equivalent protection for every hosted/built-in tool or informed human deliberation      |
| Resource-bound authorization                  | [MCP 2026 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)         | Local credential/session state and exact-action checks                  | Complete OAuth/MCP compliance or live provider lifecycle coverage                        |
| Runtime policy interoperability               | [OWASP Agent Control Standard](https://genai.owasp.org/resource/agent-control-standard-acs/)                   | A future explicit adapter/comparison with middleware control hooks      | That a control dashboard is a new category or that Simurgh already implements ACS        |
| Reusable evaluation instruments               | [Inspect](https://inspect.aisi.org.uk/)                                                                        | Agreement between a declared adapter and the local scorer               | External validation, benchmark acceptance or representative task sampling                |
| Traceable risk and provenance                 | [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [SLSA v1.2](https://slsa.dev/spec/v1.2/) | Explicit intended use, source revisions, evidence and failure reporting | Standards certification, truthful execution from signatures alone or independent custody |

See the [dated source review](../documentation-audit-2026-10-19/SOURCES.md) for distinctions
between formal requirements, voluntary guidance and project interpretation. A stronger novelty
claim requires a systematic literature comparison and empirical alternatives, not this source map.

## Next experiment: independent authority and consequence tests

1. Freeze the boundary, scorer, known limitations and counting rules before receiving new cases.
2. Obtain externally authored resource/approval/lifecycle cases with matched legitimate tasks.
   If the author is not independent, record that fact and do not call the set externally held out.
3. Predeclare model/interface choices, repetitions, stopping rules and a bounded authorized budget.
   Preserve all malformed responses, refusals, task failures, transport errors and unknown effects.
4. Compare credential-only, composed and deny-all behavior. Report useful completion and new
   unauthorized effects separately; retain already-observed effects and clustered-trial limits.
5. Have another operator replay the source-bound archives and retain discrepancies. Separate
   independent reproduction from independent observation of the original capture.
6. Publish the method, all outcomes and limits under the applicable artifact licenses. Production
   integration and real-provider identity remain separate experiments with their own acceptance tests.

The [roadmap](../../ROADMAP.md) records other open inputs and the
[classmate handoff](../research/CONTINUATION_HANDOFF_2026-10-19.md) is ready for the owner to use.
No outside operator is represented as having completed this new handoff.

## Application scope

The [proposal](PROPOSAL.txt) and [checklist](APPLICATION_CHECKLIST.md) remain drafts. Program
requirements checked for an earlier draft must be rechecked before submission. No technical
result establishes applicant eligibility, authorship, affiliation, a deployed customer base,
funding or an evaluator's private reasoning. Do not infer an individual selection outcome from
general research advice. Owner decisions are named in the checklist rather than fabricated.
