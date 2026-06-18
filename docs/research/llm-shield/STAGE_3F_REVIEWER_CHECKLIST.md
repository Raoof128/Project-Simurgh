# Stage 3F Reviewer Checklist

Run:

```bash
npm test
bash scripts/smoke-llm-shield.sh
bash scripts/smoke-llm-shield-bench.sh
bash scripts/smoke-llm-shield-stage3d.sh
bash scripts/smoke-llm-shield-stage3e.sh
bash scripts/smoke-llm-shield-stage3f.sh
bash scripts/security-audit-llm-shield.sh
bash scripts/security-audit-llm-shield-stage3d.sh
bash scripts/security-audit-llm-shield-stage3e.sh
bash scripts/security-audit-llm-shield-stage3f.sh
node scripts/privacy-audit-llm-shield.mjs
node scripts/privacy-audit-llm-shield-stage3d.mjs
node scripts/privacy-audit-llm-shield-stage3e.mjs
node scripts/privacy-audit-llm-shield-stage3f.mjs
npm audit --audit-level=high
npm run format:check
```

Review:

- `docs/research/llm-shield/evidence/stage-3f/metrics.json`
- `docs/research/llm-shield/evidence/stage-3f/corpus-manifest.json`
- `docs/research/llm-shield/evidence/stage-3f/detector-digests.json`
- `docs/research/llm-shield/evidence/stage-3f/receipt-samples/`
- `docs/research/llm-shield/evidence/stage-3f/audit-samples/`

Confirm that generated evidence is metadata-only and that all non-claims remain explicit.
