# Stage 4K (EBA) — Reviewer Checklist

You do not need to trust us; run these six things.

All commands assume Node 26 (`PATH=/opt/homebrew/bin:$PATH` on this machine — nvm's default
22 breaks byte-stability) and are run from the repository root.

| Test                               | Command                                                                                                                                                                                                                                                         | Expected                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **T1 — one-command reproduce**     | `bash scripts/reproduce-llm-shield-stage4k.sh; echo $?`                                                                                                                                                                                                         | prints `stage4k reproduce: ALL GREEN` then `0`                                       |
| **T2 — deterministic rebuild**     | `STAGE4K_FIXTURE_OUT=$(mktemp -d) node tools/simurgh-attestation/stage4k/build-stage4k-fixtures.mjs` then `cmp "$STAGE4K_FIXTURE_OUT/bundles/under-budget/extraction-ledger.json" tests/fixtures/llmShield/stage4k/bundles/under-budget/extraction-ledger.json` | identical (no output, exit `0`)                                                      |
| **T3 — signature is load-bearing** | copy a bundle to a temp dir, flip one base64 char in its `eba-manifest.json`, then `node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs --bundle <tmp> --pinned-pubkey tests/fixtures/llmShield/stage4k/eba-signer.pub; echo $?`                      | exits `1` (raw `25`)                                                                 |
| **T4 — Q8 fires on over-budget**   | `node tools/simurgh-attestation/stage4k/verify-stage4k-eba.mjs --bundle tests/fixtures/llmShield/stage4k/bundles/over-budget --pinned-pubkey tests/fixtures/llmShield/stage4k/eba-signer.pub --out /tmp/over.json; echo $?` then inspect `/tmp/over.json`       | exits `1`; report `rawCode` is `30`, `reason` `extraction_budget_exceeded`           |
| **T5 — fail-closed on deletion**   | delete `extraction-ledger.json` in a temp copy of a bundle, then run the verifier against it; `echo $?`                                                                                                                                                         | exits `3` (raw `29`), never `0`                                                      |
| **T6 — ledger is metadata-only**   | `grep -E "prompt\|transcript\|consumer_alpha\|session_a" tests/fixtures/llmShield/stage4k/bundles/under-budget/extraction-ledger.json`                                                                                                                          | no matches — plaintext ids exist ONLY in `events.json`, the declared synthetic input |

Raw `30` means EXACTLY `extraction_budget_exceeded`. Every other irregularity
(schema drift, tamper, missing file, wrong Node) is `29 → 3` or a 4H/4D band code — never
`30`. If T4's report shows `30` for a reason other than over-budget, that is a bug, not a
budget breach.
