# Stage 4M / VXD — Reviewer Checklist

_AnthropicSafe First, then ReviewerSafe._ Carries the 4L non-claims
(`not_sybil_closure`, `not_structuring_closure_without_provider_binding`).

One command per acceptance gate. Run on **Node 26**.

| Gate  | Requirement                                                            | Command                                                                                                        |
| ----- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| M-G1  | lattice: coarsening-only, non-inflation, chain integrity               | `node --test tests/unit/llmShield/stage4m/mergeLattice.test.js`                                                |
| M-G2  | monotonicity: proved, property-tested, verifier-enforced               | `node --test tests/unit/llmShield/stage4m/antiMonotonicity.property.test.js`                                   |
| M-G3  | re-score truth: V-CROWN reveals exactly one cluster + contradiction    | `node --test tests/unit/llmShield/stage4m/retroScore.test.js`                                                  |
| M-G4  | disclosure: chain-position binding, closed world, pincer slot null     | `node --test tests/unit/llmShield/stage4m/disclosure.test.js`                                                  |
| M-G5  | respondent: contest + acknowledgement, invalid rejected                | `node --test tests/unit/llmShield/stage4m/respondent.test.js`                                                  |
| M-G6  | projection: recomputable-slots-only, byte-stable, signed non-claims    | `node --test tests/unit/llmShield/stage4m/attestation.test.js`                                                 |
| M-G7  | byte stability: two full runs byte-identical; clean tree               | `bash scripts/reproduce-llm-shield-stage4m.sh` (run twice)                                                     |
| M-G8  | offline: no network/model/clock; ordering by chain position only       | (reproduce step 1 pins env; verifier runs under `runOffline`)                                                  |
| M-G9  | honesty: non-claims + signed limitations; overclaim scan clean         | `node --test tests/unit/llmShield/stage4m/closeout.test.js`                                                    |
| M-G10 | E2E net: full-chain green; 4L/4K/4H byte-unchanged; zero-src guard     | `node --test --test-concurrency=1 tests/e2e/llmShield/stage4m/vxdFullNet.test.js`                              |
| M-G11 | proof + parity: Lean CI green; browser verdicts identical to node      | `.github/workflows/stage-4m-lean-proof.yml` + `node --test tests/unit/llmShield/stage4m/browserParity.test.js` |
| M-G12 | dual safety: Tier-P verifies alone; equivocation fails; per-window V21 | reproduce steps 7–9 (V19/V20/V21)                                                                              |
| M-G13 | docs accuracy: every doc claim verified against shipped code           | `bash scripts/check.sh && bash scripts/check-e2e.sh`                                                           |

Whole-stage gate: `bash scripts/check.sh && bash scripts/check-e2e.sh` (the 4M reproduce runs on
the Node-26 e2e step, alongside 4D–4L).
