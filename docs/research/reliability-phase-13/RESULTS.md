# Phase 13: bounded reliability results

16 October 2026. One retained execution after the reviewed protocol/source freeze
at `6b35f696`, with 102 source bindings. The run, its mandatory fresh schedule
validation, and a separate verification invocation all passed. Separate invocation
means another local process under the same operator, not independent custody.

**60 fixtures; 210 final native calls; 10 initial lost-ack calls; 600 raw snapshots.**
Six schedules × five repetitions × two controls. Both controls observed all five
ordinary reopened deliveries and all twenty duplicate retry calls; each retry fixture
created exactly one receiver effect.

| Schedule (five fixtures per control) | Credential-only new effects | Composed new effects |
| ------------------------------------ | --------------------------: | -------------------: |
| Authorized reopen                    |                           5 |                    5 |
| Four concurrent retries              |                           5 |                    5 |
| Concurrent sibling routes            |                          10 |                    5 |
| Queued work after stop               |                          10 |                    0 |
| Restart after killed update process  |                          10 |                    0 |
| Reopen after lost acknowledgment     |                           5 |                    0 |
| **Total**                            |                      **45** |               **15** |

Each control also retains five initial effects with unknown acknowledgment. Those
are excluded from new-effect counts. Composed sibling calls share one reservation;
unknown reservations remain spent. The actually killed update child leaves a durable
hold. Call results, route/effect relationships, gateway intents, reservations, signal
state and interrupted-update events are checked against complete raw snapshots.

Final calls: credential-only 95 observed/10 unknown; composed 35 observed/60 blocked/
10 unknown. These totals mix useful and restricted schedules and are not a utility
score. Host-observed final-call median/p95 latency was 106.6/175.9 ms for credential-only
and 103.8/162.3 ms for composed (105 calls each). Other checks shared this host; these
measurements do not establish a performance advantage or deployment latency guarantee.
Initial-call latency was not measured.

## Reproduce and inspect

See the [tool instructions](../../../tools/assurance-reliability/README.md),
[protocol](protocol.json), [report](report.json), [archive](evidence.zip),
[pinned root](ROOT.sha256), [mandatory receipt](receipt.json), and
[separate receipt](separate-verification.json).

Root: `4fbe9f50dc2dcb23c3f89c86d1dcbd8f010995bdbe809895e31978c2ed70e3cd`.
All 12 focused tests pass. Whole-change review found two Important verifier defects;
five negative regressions failed before the fix and passed after it. No Critical
finding. One Minor timing ambiguity was resolved by restricting latency claims to
final calls; no deferred implementation finding.

## Limits

Owned synthetic receiver, four queued threads, five repetitions and fixed fixture clock 100. The study does not establish sustained load, lease expiry under real time, real
provider alert delivery, or interruption of work already admitted before a stop.
Fresh execution validates the same schedule invariants, not identical timing, ordering
or winner. Digests and consistent local observations do not attest truthful timing,
complete execution provenance or independent observation. No new model inference,
paid API use, external probing or real personal data was involved.
