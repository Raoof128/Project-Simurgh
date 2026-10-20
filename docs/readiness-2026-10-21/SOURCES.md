# Primary-source gap map — checked 21 October 2026

These sources inform test design. They do not certify Simurgh or establish global novelty.
Publication dates and access dates differ; versioned older standards can remain applicable.

| Front                     | Primary source                                                                                                                                                          | Applicable gap / implication                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer / agent engineering | [OpenAI, Designing AI agents to resist prompt injection, 11 March 2026](https://openai.com/index/designing-agents-to-resist-prompt-injection/)                          | Constrain consequences even when manipulation succeeds. Test actual receiver effects after authority changes, not just input classification.                   |
| Developer interfaces      | [OpenAI guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)                                                         | Approval pauses execution; blocking versus parallel guardrails have different speculative-work behavior. Revalidate host authority when a paused call resumes. |
| Protocol / prior art      | [MCP security best practices, versioned 2025-11-25 route](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)                       | Audience validation, token-passthrough prohibition, session binding and confused-deputy controls. Do not claim MCP conformance from an owned local receiver.   |
| Standards initiative      | [NIST AI Agent Standards Initiative, 17 February 2026](https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure) | Identity, authorization, reliability and interoperability are active standards work. This announcement is not a final certification standard.                  |
| Prior art / containment   | [Anthropic, How we contain Claude across products, 25 May 2026](https://www.anthropic.com/research/how-we-contain-claude)                                               | Product containment addresses potential damage as capabilities/access grow. Distinguish approval, isolation, credentials and observation in the comparison.    |
| Incident investigation    | [OpenAI's March 2026 prompt-injection analysis](https://openai.com/index/designing-agents-to-resist-prompt-injection/)                                                  | Its published examples motivate social-engineering-shaped tests. A local replay of a derived case is not reproduction of the original incident.                |

Initial gap-hunt conclusion: the strongest review question is whether approval, revocation,
monitoring and uncertain effects remain correctly bound at execution and verification time.
The existing audit shows the same class of risk in several older verifiers: producer statements
or unbound sidecars can be mistaken for authenticated observations. Prior art already supplies
many containment/approval mechanisms; the contribution must be a measured contract and failure
analysis, not an unsupported claim to have invented agent containment.

Environment observation: a configured model API credential is available, but no provider admin
or alert-lifecycle capability was identified. No credential value was read into the report.
The Browser plugin instructions were loaded; no Browser `js` or CUA tool was exposed in this
session's tool inventory. This does not establish real-browser validation. The existing strict
parity runner must retain a failure if managed browser policy prevents execution.
