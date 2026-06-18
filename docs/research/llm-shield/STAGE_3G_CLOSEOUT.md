# Stage 3G Closeout

Stage 3G introduces a 60-case live-provider shadow evaluation protocol derived from the Stage 3F corpus. Each selected case is represented across `mock`, `recorded_fixture`, and `live_shadow` modes, with committed metadata-only evidence for 180 shadow observations.

Stage 3G does not evaluate model alignment or claim live-provider jailbreak immunity. It evaluates whether the Stage 3F containment invariants still hold when an external live provider is placed behind the LLM Shield gateway in shadow mode.

## Evidence

- Metrics: `docs/research/llm-shield/evidence/stage-3g/metrics.json`
- Manifest: `docs/research/llm-shield/evidence/stage-3g/live-shadow-manifest.json`
- Provider output hashes: `docs/research/llm-shield/evidence/stage-3g/provider-output-hashes.json`
- Receipt samples: `docs/research/llm-shield/evidence/stage-3g/receipt-samples/`
- Audit samples: `docs/research/llm-shield/evidence/stage-3g/audit-samples/`

## Verification

```bash
node --test tests/unit/llmShield/stage3gLiveShadowLib.test.js
node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs
bash scripts/smoke-llm-shield-stage3g.sh
bash scripts/security-audit-llm-shield-stage3g.sh
node scripts/privacy-audit-llm-shield-stage3g.mjs
```

Optional live-provider execution is intentionally separate from CI:

```bash
SIMURGH_RUN_LIVE_PROVIDER_TESTS=true \
SIMURGH_LIVE_PROVIDER_ENABLED=true \
SIMURGH_LLM_PROVIDER=anthropic \
SIMURGH_LIVE_PROVIDER_MODEL=<model> \
ANTHROPIC_API_KEY=<server-side-key> \
node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs --run-live
```
