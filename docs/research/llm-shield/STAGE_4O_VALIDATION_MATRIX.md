# Stage 4O — VTSA Validation Matrix

**Motto: AnthropicSafe First, then ReviewerSafe.**

Every arm in the committed tamper matrix
(`tests/fixtures/llmShield/stage4o/expected-results/vtsa-matrix.json`), its evaluator, its
expected raw code, and where it is checked. The documented first-failure check order is
normative (not numeric): **55 → 56 → 57 → 64 → 65 → 58 → 59 → 60 → 61 → 62 → 63 → 66**.

## Arms

| Arm                               | Evaluator | Raw | Meaning                                                         |
| --------------------------------- | --------- | --- | --------------------------------------------------------------- |
| `missing-manifest`                | gate      | 55  | no commitment supplied                                          |
| `schema-invalid-manifest`         | gate      | 55  | commitment fails exact-key validation                           |
| `signature-mismatch`              | gate      | 56  | tool-manifest commitment signature invalid                      |
| `stale-manifest-replay`           | gate      | 57  | run epoch outside validity window                               |
| `server-toolset-change-genesis`   | gate      | 58  | recomputed toolset root ≠ committed (single genesis, re-signed) |
| `tool-added-post-approval`        | gate      | 59  | call's tool not in manifest                                     |
| `invalid-inclusion-proof`         | gate      | 59  | Merkle inclusion proof invalid                                  |
| `schema-changed`                  | gate      | 60  | tool schema digest differs                                      |
| `readonly-to-write`               | gate      | 61  | authority-class escalation                                      |
| `destructive-under-harmless-name` | gate      | 61  | authority raised, name digest preserved                         |
| `sink-expansion`                  | gate      | 62  | run-time sink not declared                                      |
| `receipt-binding-mismatch`        | gate      | 63  | action/manifest binding invalid                                 |
| `laundering-chain`                | gate      | 64  | broadening hidden inside claimed narrowings (delta recompute)   |
| `blind-reapproval`                | gate      | 65  | state-bound re-approval of a broadening                         |
| `timeline-root-mismatch`          | timeline  | 66  | timeline root ≠ committed chain head                            |
| `green-unchanged`                 | gate      | 0   | unchanged surface → accepted                                    |
| `green-state-narrowing`           | gate      | 0   | state-bound narrowing → accepted                                |
| `green-delta-broadening`          | gate      | 0   | delta-bound broadening → accepted                               |

Three GREEN accepts prove the gate is not reject-all (anti-theatre). Gate arms are also
run through the **Python** kernel and asserted to yield the same first raw code
(kernel↔verifier parity); the timeline arm (66) is attestation-level and verified by the
Node verifier, not the kernel gate.

## Where each is checked

- Node unit: `tests/unit/llmShield/stage4o/fixtures.test.js`
- Python parity: `tools/agentdojo-simurgh-adapter/tests/test_stage4o_parity.py`
- E2E net: `tests/e2e/llmShield/stage4o/vtsaFullNet.test.js`
- One-command: `scripts/reproduce-llm-shield-stage4o.sh`
