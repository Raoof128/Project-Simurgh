# Recovery design sources

Official sources retrieved 15 October 2026. [Retrieval metadata](evidence/sources.json)
records the URL, UTC retrieval time and SHA-256 of each response. Response bodies are not
archived in this repository; live pages may change. These sources describe prior mechanisms
and their assumptions, not an endorsement of Simurgh.

| Source                                                                                                                                       | Implication for this experiment                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html)                                                                             | SQLite's durability depends on filesystem, flush and hardware assumptions. A process-kill test is insufficient to establish power-loss safety.                  |
| [SQLite transactions](https://www.sqlite.org/lang_transaction.html)                                                                          | `BEGIN IMMEDIATE` starts a write transaction and can return busy when another writer exists. Test serialization and lock failure explicitly.                    |
| [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) | Dual writes can leave inconsistent state; duplicate delivery requires idempotent consumption. This local experiment is not a distributed outbox implementation. |
| [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)                                                         | The requested durable-execution URL redirects here. Checkpointers retain workflow state; this phase tests executor restart, not complete workflow restoration.  |

SQLite transactions, stable idempotency keys and replay/reconciliation are prior art. The
increment here is a reproducible crash-window contract and measured cases for Simurgh's
local effect sink. No claim says that other frameworks lack durability controls. The broader
[industry map](../INDUSTRY_GAPS.md) remains the source for public needs and remaining gaps.
