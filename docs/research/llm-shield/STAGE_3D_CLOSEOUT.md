<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3D — Closeout

Run every gate from the repository root; all must exit 0.

```bash
npm test
bash scripts/smoke-llm-shield.sh
bash scripts/smoke-llm-shield-bench.sh
bash scripts/smoke-llm-shield-stage3d.sh
bash scripts/security-audit-llm-shield.sh
bash scripts/security-audit-llm-shield-stage3d.sh
node scripts/privacy-audit-llm-shield.mjs
node scripts/privacy-audit-llm-shield-stage3d.mjs
npm audit --audit-level=high
npx prettier --check .
```

Tag on green:

```bash
git tag v0.6.0-stage-3d-llm-containment
```

## Deferred to later stages

- Live provider adapters (mock/anthropic/openai-compatible behind
  `SIMURGH_LIVE_PROVIDER_ENABLED`), HTTP gateway router, `openapi.json`, Docker →
  **Stage 3E (Industry Gateway)**.
- Live-model-specific exploits → **Stage 3F**.
