# Stage 4Q — VFR Reviewer Checklist

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

Every claim below is recomputable offline. Node 26 required
(`/opt/homebrew/opt/node@26/bin` locally; on PATH in CI). Run from the repo root.
No network, no wall clock.

## One command

```bash
bash scripts/reproduce-llm-shield-stage4q.sh
```

Runs all ten gates (env, unit suites, Python + parity, Lane A idempotency, Lane B
idempotency, offline attestation verify, BYO-approver, privacy scan, key audits,
K7 net) and exits through `stage4CodeForRawCode`.

## Per-claim recomputation

| Claim                                                        | Command                                                                                                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw codes 80–89 in the shared ledger, run-level 1            | `node --test tests/unit/llmShield/stage4q/constants.test.js`                                                                                                                                            |
| Frozen check order + 11 rails + variant binding              | same suite (constants module tests)                                                                                                                                                                     |
| Digest domain separation + replay/census digests             | `node --test tests/unit/llmShield/stage4q/digest.test.js`                                                                                                                                               |
| Exact-key validators incl. exemption + allowlist             | `node --test tests/unit/llmShield/stage4q/schemaCore.test.js`                                                                                                                                           |
| Run chain + census + refusal ledger (89)                     | `node --test tests/unit/llmShield/stage4q/chainCore.test.js`                                                                                                                                            |
| Pincer decision (16 arms, both paths)                        | `node --test tests/unit/llmShield/stage4q/pincerCore.test.js`                                                                                                                                           |
| Invention artifacts (source-map/projection/note)             | `node --test tests/unit/llmShield/stage4q/inventionCore.test.js`                                                                                                                                        |
| Lane A corpus replays to committed decisions                 | `node --test tests/unit/llmShield/stage4q/fixtures.test.js`                                                                                                                                             |
| Lane B capture replays; mandatory raw-86 arm present         | `node --test tests/unit/llmShield/stage4q/laneb.test.js`                                                                                                                                                |
| Attestation both tiers + tamper detection                    | `node --test tests/unit/llmShield/stage4q/attestation.test.js`                                                                                                                                          |
| Python kernel + JS↔Python parity                             | `PYTHONPATH=tools/agentdojo-simurgh-adapter python3 -m pytest tools/agentdojo-simurgh-adapter/tests/test_capability_kernel_friction.py tools/agentdojo-simurgh-adapter/tests/test_stage4q_parity.py -q` |
| Lean theorems (5) machine-check                              | `lean proofs/stage4q/FrictionPrecedence.lean`                                                                                                                                                           |
| Privacy scan (digests/enums/schemas/public keys only)        | `node scripts/privacy-audit-llm-shield-stage4q.mjs`                                                                                                                                                     |
| Private-key audits allowlist 4Q keys                         | `bash scripts/security-audit-llm-shield-stage3m.sh && bash scripts/security-audit-llm-shield-stage3o.sh`                                                                                                |
| K7 all-functions net (inventory + idempotency + cross-stage) | `node --test tests/e2e/llmShield/stage4q/allFunctions.e2e.test.js`                                                                                                                                      |
| Offline attestation verify (both tiers)                      | `node tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs docs/research/llm-shield/evidence/stage-4q/vfr-attestation.json`                                                                        |

## BYO-approver (be your own approver)

Mint your own approver key and confirm the evidence is DECISION-equivalent (same
per-case `{raw, reason}` — not byte-identical, which is cryptographically
impossible once the key changes):

```bash
node -e 'const c=require("node:crypto"),fs=require("node:fs");fs.writeFileSync("/tmp/my-approver.pem",c.generateKeyPairSync("ed25519").privateKey.export({type:"pkcs8",format:"pem"}));'
node tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs docs/research/llm-shield/evidence/stage-4q/vfr-attestation.json --approver-key /tmp/my-approver.pem
```

Expected: `stage4q verify: byo_decision_equivalent (raw 0)`.
