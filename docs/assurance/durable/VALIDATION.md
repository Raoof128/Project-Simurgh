# Durability validation record

Executed 15 October 2026 on Linux x86_64, Node 24.19.0, Python 3.12.14 and SQLite 3.53.1.
The SDK probes reuse openai-agents 0.23.1 and langgraph 1.2.15 from the existing hash lock.

| Check                                              | Result                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Durability unittest discovery                      | 16 passed, including the reviewer-found encoded-size regression                           |
| Existing SDK unittest discovery                    | 31 passed                                                                                 |
| Full `PYTHONDONTWRITEBYTECODE=1 npm test`          | 5,122 tests: 5,119 passed, zero failed, three skipped (Chrome/Lean unavailable)           |
| Durability report in the clean pip SDK environment | All 26 named cases reproduced; complete source-bound verification passed                  |
| Original SDK, lab and OpenAI saved reports         | All three verified; original sources and report bytes unchanged                           |
| CLI negative checks                                | Existing output refused without changing bytes; omitted-case report rejected, both exit 1 |
| Workflow census/finding-ledger checks              | 23 tests passed after re-deriving the mutable current set; immutable baseline remains 19  |
| Python lint/format and changed-document formatting | Passed                                                                                    |

Tests were written before the store, process harness and study implementations and observed
failing on their missing modules. The resulting suites exercise real processes and files:
SIGKILL at four declared boundaries, fresh worker retries, an eight-worker start gate, exact
argument checks, immutable authority, read-back, corrupt/missing storage, lock timeout,
native SDK pauses/resumes, full report replay and modified report rejection.

A fresh reviewer independently ran the original 15 tests and checked that conflicting
unreceipted bytes remain unchanged and worker startup failure cannot count as an injected
kill. The review found one important issue: six valid 256-character control-string fields
produce a 9,344-byte JSON effect, exceeding the reader's original 8,193-byte cap. A new test
failed on immediate observation, then passed after reading the expected encoded length plus
one byte. The regression covers creation, observation, cached replay and trailing-byte
rejection. The complete 16-test durability suite passed after the fix. No other material
finding or new deferred minor was reported.

The first full repository suite failed because the new CI step added one `unclassifiable_step`
to the historical workflow census. Its standing lifecycle explicitly requires re-deriving
`current` for later workflow changes. The current identity set increased from 26 to 27, with
exactly the new durability step added and nothing removed. The frozen baseline, finding
measurement and classifier behavior were preserved. The final full suite passed; the
classifier limitation remains disclosed rather than being represented as a repaired finding.

CI now runs durability tests plus fresh verification of generated and committed reports in
the pinned SDK job. Commands were executed locally; hosted Actions success is not claimed.
The report omits scheduling order, temporary paths, process IDs and elapsed times. It retains
distinct-worker counts, outcomes, before/after file and receipt observations and source hashes.
Temporary files left by injected kills are inspected within disposable study directories and
removed when those directories close; they are not durable file effects.

Source identity and deterministic replay are not a signature, independent witness or proof
against malicious modification of code and evidence together. No power-loss/storage-device
test, distributed service, real connector, end-to-end SDK checkpoint restart, authenticated
approval, revocation, held-out corpus, outside operator, live model call, latency benchmark,
deployment or submission was executed. The [result limits](README.md) govern all claims.
