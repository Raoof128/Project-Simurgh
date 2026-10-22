# Connector design sources

Official sources checked on **15 October 2026**. The [source register](evidence/sources.json)
records requested URLs, SHA-256 of retrieved responses and response-file modification timestamps
from this research pass. It does not record verified HTTP response headers or redirects. Raw
bodies remain outside the checkout in `/tmp/simurgh-connector-phase/`; the committed hashes cannot
reconstruct those bodies and live URLs can change.

| Source                                                                                          | Relevance                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Redis 8.10.2 release](https://github.com/redis/redis/releases/tag/8.10.2)                      | Latest-release API returned this version, published 17 September 2026; security-fix release used for the fixture                                       |
| [Official Redis hashes](https://github.com/redis/redis-hashes)                                  | Published source archive digest pinned in the installer and source lock; verified before extraction/build                                              |
| [SET command](https://redis.io/docs/latest/commands/set/)                                       | NX only sets a missing key; success returns OK and an unmet condition returns null. This conditional write is established service behavior             |
| [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) | AOF logs writes; `appendfsync always` flushes before replies. The fixture tests process SIGKILL/restart, not actual power failure or the storage stack |

The source archive is `redis-8.10.2.tar.gz`, SHA-256
`b9ffee226b5eecdba98a679260dad764b2a4ebd90dce4ad5ac9e9f3eef9c02b3`.
The build uses libc allocation, no TLS and no systemd. Redis listens only on its private Unix
socket, with TCP disabled. These build choices are for the local test fixture, not a remote-service
security recommendation. Runtime version checks do not independently attest the binary.

The [earlier SQLite/outbox sources](../durable/SOURCES.md) and
[2026 industry mapping](../INDUSTRY_GAPS.md) supply the broader rationale. This work demonstrates
conditional-write and reconciliation behavior in Simurgh, not a new idempotency protocol or a
claim that OpenAI, Redis or other companies lack these controls. No source is an endorsement.
