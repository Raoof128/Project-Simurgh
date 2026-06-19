# Stage 3H-L2 Reviewer Checklist

```bash
cd tools/agentdojo-simurgh-adapter && .venv/bin/python -m pytest tests -q
cd ../..
node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs
node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs
scripts/security-audit-llm-shield-stage3h-layer2.sh
SIMURGH_RUN_STAGE3H_LAYER2=1 scripts/smoke-llm-shield-stage3h-layer2.sh
```

- [ ] `sample-manifest.json` has 10 benign task IDs and 20 security case IDs.
- [ ] `run-manifest.json` records the sample SHA-256.
- [ ] Baseline and defended metrics have raw numerator/denominator counts.
- [ ] Baseline Simurgh metrics are `not_applicable`.
- [ ] Every defended run has a receipt ID or explicit non-call reason.
- [ ] Privacy audit passes over all committed evidence.
- [ ] The closeout does not claim ASR improvement; it reports the high over-defence finding.
