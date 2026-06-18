# Stage 3F Closeout

Stage 3F adds a 240-case benchmark for measuring whether prompt-injection attempts can cause unauthorised system consequences across input, context, tool, output, risk, receipt, and audit boundaries.

The benchmark reports detection quality honestly while hard-gating only containment invariants: zero unsafe tool execution, zero unsafe output export, zero context authority escalation, complete receipt coverage, complete audit verification, valid corpus manifest, frozen detector digests, and metadata-only generated evidence.

## Evidence

- Metrics: `docs/research/llm-shield/evidence/stage-3f/metrics.json`
- Corpus manifest: `docs/research/llm-shield/evidence/stage-3f/corpus-manifest.json`
- Detector digests: `docs/research/llm-shield/evidence/stage-3f/detector-digests.json`
- Receipt samples: `docs/research/llm-shield/evidence/stage-3f/receipt-samples/`
- Audit samples: `docs/research/llm-shield/evidence/stage-3f/audit-samples/`

## Verification

```bash
node --test tests/unit/llmShield/stage3fBenchmarkLib.test.js
node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs
bash scripts/smoke-llm-shield-stage3f.sh
bash scripts/security-audit-llm-shield-stage3f.sh
node scripts/privacy-audit-llm-shield-stage3f.mjs
```

Release tag target:

```bash
git tag v0.8.0-stage-3f-agentic-prompt-injection-benchmark
```
