# Native workflow recovery sources

Official documentation retrieved **15 October 2026 UTC**. The [source register](evidence/sources.json)
records requested/final URLs, status, retrieval time and response SHA-256. Raw bodies are kept only
in `/tmp/simurgh-workflow-phase/`; the register cannot reconstruct them and live pages may change.

| Source                                                                                                        | Implication                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI Agents SDK human-in-the-loop guide](https://openai.github.io/openai-agents-python/human_in_the_loop/) | RunState supports serialization/restoration. Serialized state controls resumed execution and must be trusted; strict context does not sanitize untrusted snapshots. The guide recommends version markers for pending tasks |
| [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)                          | Native checkpoints retain graph state and thread identity. SQLite is a local development backend. The requested durable-execution URL redirected to this page                                                              |
| [Official SQLite checkpointer package](https://pypi.org/project/langgraph-checkpoint-sqlite/3.1.2/)           | Version 3.1.2 requires langgraph-checkpoint ≥4.3,<5, aiosqlite and sqlite-vec. Resolution preserved the earlier SDK dependency pins; installation used wheel hashes                                                        |

The implementation also inspected the installed 3.1.2 `SqliteSaver` and uses its documented
context manager, native graph interrupts, `get_state` and `Command(resume=...)`. SQLite checkpoint
connections are closed after a WAL checkpoint before snapshot bytes are retained. No pickle-based
application snapshot is introduced. Trusted native SDK deserialization remains part of the boundary.

The [prior industry map](../INDUSTRY_GAPS.md) covers broader 2026 public technical needs, prior art
and standards. This phase closes Simurgh's executor-only evidence gap. Native persistence and
idempotent replay are already provided or documented by upstream projects; this is an experiment
using them, not a claim that these companies lack recovery or have endorsed Simurgh.
