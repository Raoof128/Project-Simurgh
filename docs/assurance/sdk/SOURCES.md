# Pinned SDK API sources

Retrieved 15 October 2026. [Source metadata](evidence/sources.json) records URLs, retrieval
times, HTTP status and SHA-256 of retrieved response bytes. Those hashes identify the local
research snapshots; the response bodies are not archived here, and live pages may change.
The package lock and executed tests establish the installed versions used by this study.

| Official source                                                                              | Used for                                                               | Bound on the conclusion                                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [OpenAI human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/) | Tool `needs_approval`, interruptions, approve/reject and Runner resume | Existing framework capability, not a Simurgh invention                        |
| [OpenAI RunState](https://openai.github.io/openai-agents-python/ref/run_state/)              | `to_string`, `from_string` and interruption restoration                | Same-process roundtrip; no durable executor restart claim                     |
| [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)           | `interrupt`, checkpointer/thread identity, `Command(resume=...)`       | Interrupted nodes restart; effects are confined to a separate downstream node |
| [openai-agents 0.23.1 metadata](https://pypi.org/pypi/openai-agents/0.23.1/json)             | Exact package pin                                                      | No compatibility claim for other versions                                     |
| [langgraph 1.2.15 metadata](https://pypi.org/pypi/langgraph/1.2.15/json)                     | Exact package pin                                                      | The study uses core LangGraph, not LangChain HITL middleware                  |

The OpenAI adapter uses public approve/reject APIs and does not mutate private serialized
state to simulate argument editing. Its in-place edit probe is explicitly unsupported.
LangGraph's resume value carries the selected decision and optional edited action through
the application graph; the original external policy checks the resulting exact arguments.

These sources document runtime behavior. They do not establish vendor endorsement, hiring
criteria, grant acceptance or unmet market demand. The broader [industry map](../INDUSTRY_GAPS.md)
distinguishes public signals, prior art and Simurgh's remaining evidence gaps.
