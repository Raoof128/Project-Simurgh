# Stage 3V-A — Validation Matrix

Each hard gate maps to the test/script/evidence that enforces it.

| # | Hard gate | Enforced by |
|---|---|---|
| 1 | recorded-fixture provenance pinned (`live:false`, `synthetic_deterministic`) | `bundle.test.js`, `security-audit-llm-shield-stage3v.sh` |
| 2 | adapter config digest harness-computed + pinned | `harnessComputedHashes.test.js`, runner `deriveForVerify` |
| 3 | Stage 3L corpus manifest hash matches committed corpus | `bundle.test.js` (distinct hash), consistency audit (`--reproduce`) |
| 4 | harness computes all four external hashes | `harnessComputedHashes.test.js`, `verifier` reproduce check |
| 5 | no adapter-supplied hash accepted | `adapterContract.test.js`, `harnessComputedHashes.test.js`, tamper `adapter_supplied_hash` |
| 6 | external verdict cannot change a boundary outcome | `advisoryInvariance.test.js` |
| 7 | `unsafe_tool_execution == 0` | `metrics.test.js`, security audit |
| 8 | `unsafe_output_export == 0` | `metrics.test.js`, security audit |
| 9 | `context_authority_escalation == 0` | `metrics.test.js`, security audit |
| 10 | receipt coverage complete | `metrics.test.js` |
| 11 | audit coverage complete | `metrics.test.js` |
| 12 | no raw prompts in generated evidence | `privacy-audit-llm-shield-stage3v.mjs` |
| 13 | no raw external model output in generated evidence | `privacy-audit-llm-shield-stage3v.mjs` |
| 14 | no secrets / API keys / emails in evidence | `privacy-audit-llm-shield-stage3v.mjs` |
| 15 | offline verifier passes | `verifierExternalDefenseBundle.test.js`, smoke |
| 16 | `--reproduce` verifier passes | `verifierExternalDefenseBundle.test.js`, reproduce script |
| 17 | tampered external verdict fails verification | tamper `external_verdict_flipped` |
| 18 | tampered harness hash fails verification | tamper `gateway_hash_edited` |
| 19 | tampered metrics fail verification | tamper `metrics_edited` |
| 20 | wrong public key fails verification | tamper `wrong_public_key`, verifier test |
| 21 | contract validates `target:"llama_guard"` with no target-specific code (3V-B compat) | `adapterContract.test.js` (Fix 3) |
| 22 | no raw recorded external output in any generated/exported/signed artifact (Fix 2) | `privacy-audit-llm-shield-stage3v.mjs`, tamper `raw_output_injected` |
