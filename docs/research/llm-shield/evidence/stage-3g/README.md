# Stage 3G — Live Provider Shadow Evaluation — Evidence

Stage 3G does not evaluate model alignment or claim live-provider jailbreak immunity. It evaluates whether the Stage 3F containment invariants still hold when an external live provider is placed behind the LLM Shield gateway in shadow mode.

This directory contains metadata-only evidence for the 60-case Stage 3G shadow protocol. The cases are selected from the Stage 3F corpus and expanded across `mock`, `recorded_fixture`, and `live_shadow` modes.

## Layout

| Path                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `metrics.json`                | Hard-gate and measured shadow metrics              |
| `live-shadow-manifest.json`   | Hash-only selected-case manifest                   |
| `provider-output-hashes.json` | Provider output hashes for each shadow observation |
| `receipt-samples/`            | Metadata-only receipt samples                      |
| `audit-samples/`              | Metadata-only audit sample                         |
| `generated/`                  | Runner status output                               |

No raw provider transcript, provider body, API key, tool arguments, or direct provider output is stored in generated evidence.

## Reproduce

```bash
node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs
bash scripts/smoke-llm-shield-stage3g.sh
bash scripts/security-audit-llm-shield-stage3g.sh
node scripts/privacy-audit-llm-shield-stage3g.mjs
```

Optional live-provider execution is not part of key-free CI. Run it only with the
Stage 3E-live env configured:

```bash
SIMURGH_RUN_LIVE_PROVIDER_TESTS=true \
SIMURGH_LIVE_PROVIDER_ENABLED=true \
SIMURGH_LLM_PROVIDER=anthropic \
SIMURGH_LIVE_PROVIDER_MODEL=<model> \
ANTHROPIC_API_KEY=<server-side-key> \
node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs --run-live
```
