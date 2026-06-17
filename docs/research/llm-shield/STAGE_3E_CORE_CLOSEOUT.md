<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — Closeout

Run every gate from the repository root; all must exit 0 (docker may SKIP).

```bash
npm test
bash scripts/smoke-llm-shield.sh
bash scripts/smoke-llm-shield-bench.sh
bash scripts/smoke-llm-shield-stage3d.sh
bash scripts/security-audit-llm-shield.sh
bash scripts/security-audit-llm-shield-stage3d.sh
node scripts/privacy-audit-llm-shield.mjs
node scripts/privacy-audit-llm-shield-stage3d.mjs
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/security-audit-llm-shield-stage3e.sh
node scripts/privacy-audit-llm-shield-stage3e.mjs
bash scripts/docker-smoke-llm-shield-stage3e.sh   # skips if Docker absent
npm audit --audit-level=high
npx prettier --check .
```

Tag on green (after merge to `main`): `v0.7.0-stage-3e-core-industry-gateway`.

## Deferred to Stage 3E-live (separate spec)

`anthropicProviderAdapter.js` (lazy `@anthropic-ai/sdk` import only inside the live
branch after `SIMURGH_LIVE_PROVIDER_ENABLED=true`), the live context-to-provider
text rule, optional live tests (skipped unless `SIMURGH_RUN_LIVE_PROVIDER_TESTS=true`),
active denial-of-wallet live-call limits, and any OpenAI-compatible adapter
(later / fail-closed stub). 3E-live may call Anthropic only after merged 3E-core
passes all gates.
