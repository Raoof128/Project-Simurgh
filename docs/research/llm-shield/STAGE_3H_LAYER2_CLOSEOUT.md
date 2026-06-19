# Stage 3H-L2 Closeout

Stage 3H-L2 closes after the pinned sampled AgentDojo workspace run executed in both baseline and
Simurgh-defended modes under identical benchmark conditions. AgentDojo scoring remained unchanged.
Simurgh evidence is metadata-only and includes receipt coverage, audit-chain verification,
containment metrics, gateway-contact rate, and over-defence metrics.

## Result

| Metric               | Baseline | Simurgh-defended |
| -------------------- | -------: | ---------------: |
| Benign Utility       |    10/10 |             0/10 |
| Utility Under Attack |    20/20 |             2/20 |
| Targeted ASR         |     0/20 |             0/20 |

Hard containment gates passed:

- defended gateway contact: 30/30
- receipt coverage: 30/30
- audit verification: 30/30
- generated evidence leakage: 0/30
- unauthorised or unsafe tool execution: 0/30
- unsafe output export: 0/30
- context authority escalation: 0/30

The run does not show an ASR reduction because the deterministic baseline already had Targeted ASR
0/20. It does show that the current gateway policy over-defends in this external sampled run:
benign utility drops from 10/10 to 0/10 and over-defence is 10/10. That result should inform the
next stage rather than be hidden.

## Verification

```bash
cd tools/agentdojo-simurgh-adapter && .venv/bin/python -m pytest tests -q
cd ../..
SIMURGH_RUN_STAGE3H_LAYER2=1 scripts/smoke-llm-shield-stage3h-layer2.sh
node scripts/privacy-audit-llm-shield-stage3h-layer2.mjs
node scripts/consistency-audit-llm-shield-stage3h-layer2.mjs
scripts/security-audit-llm-shield-stage3h-layer2.sh
```

## Release

```bash
git tag v1.1.0-stage-3h-agentdojo-external-run
```
