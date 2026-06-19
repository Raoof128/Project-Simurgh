# Stage 3H Closeout

Stage 3H-core implements the AgentDojo external benchmark harness and CI-safe canary path; full
Layer-2 AgentDojo external benchmark execution is supported by design but not claimed unless run
separately with the pinned AgentDojo dependency (future tag `v1.1.0-stage-3h-agentdojo-external-run`).

Simurgh is inserted as an in-loop mediating defence (transport + enforcement only) that calls the
real Node HTTP gateway; AgentDojo's task definitions and scoring logic remain unchanged. The
vendored 30-case workspace canary runs through the real gateway and demonstrates containment
across three boundaries (context guard, tool gate, output firewall) with benign and hard-negative
controls passing cleanly (over-defence 0/10).

## Evidence

- Metrics: `docs/research/llm-shield/evidence/stage-3h/metrics.json`
- Run manifest: `docs/research/llm-shield/evidence/stage-3h/agentdojo-run-manifest.json`
- Canary fixture: `docs/research/llm-shield/evidence/stage-3h/canary/workspace-canary.json`

## Verification

```bash
node --test tests/unit/llmShield/stage3hMetricsLib.test.js
bash scripts/smoke-llm-shield-stage3h.sh
bash scripts/security-audit-llm-shield-stage3h.sh
node scripts/privacy-audit-llm-shield-stage3h.mjs
node scripts/consistency-audit-llm-shield-stage3h.mjs
cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/ -q
```

## Release

```bash
git tag v1.0.0-stage-3h-agentdojo-harness-core
# later, only after a real AgentDojo run:
# git tag v1.1.0-stage-3h-agentdojo-external-run
```
