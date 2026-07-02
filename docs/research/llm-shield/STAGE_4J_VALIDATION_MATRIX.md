# Stage 4J PCTA — Validation Matrix

One row per gate. Every row is exercised by a committed fixture, replayed by
`tests/unit/llmShield/stage4j/verifier.test.js`, `tests/e2e/llmShield/stage4jFullSmoke.test.js`,
and `scripts/reproduce-llm-shield-stage4j.sh`; the observed results live in
`evidence/stage-4j/p-gate-results.json` and are refused at emission time if they disagree with
this table.

| Gate   | Falsifies                                                                                               | Fixture                  | Raw | Typed |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------------------ | --- | ----- |
| P0     | clean authorized call must exit 0 (anti-over-rejection)                                                 | clean-authorized.json    | 0   | 0     |
| P1     | no proof for a recorded-allowed action                                                                  | missing-proof.json       | 31  | 1     |
| P2     | forged signature or unpinned key                                                                        | forged-sig.json          | 32  | 1     |
| P3     | stale epoch outside the pack-local window                                                               | stale-proof.json         | 33  | 1     |
| P4-pre | stored cert fails the mandatory 4H recompute (dirty flow)                                               | dirty-cert-reverify.json | 24  | 1     |
| P4     | authority sourced from untrusted context (declaration ignored)                                          | untrusted-authority.json | 34  | 1     |
| P5     | applied ≠ authorized ≠ receipt digest (4H digest space)                                                 | action-mismatch.json     | 35  | 1     |
| P6     | enforcement required ∧ not applied-supported                                                            | enforcement-gap.json     | 36  | 1     |
| P7     | policy / DFI-certificate digest mismatch                                                                | digest-mismatch.json     | 37  | 1     |
| P8     | high-consequence action with `authority_sink:false` (own signed substrate that passes the 4H re-verify) | sink-underdeclared.json  | 38  | 1     |

Ordering note: P8 runs **before** P4 by design — sink membership in the certificate's claims
derives from the same `authority_sink` flag P8 cross-checks, so an under-declared
high-consequence action has no sink claim and a P4-first order would report the generic 34;
38 is the correct root-cause diagnosis. A bogus/no-receipt `action_id` skips P8 via the receipt
null-guard and stays fail-closed at 34 (`no_authority_sink_claim`) — pinned by a regression
test.
