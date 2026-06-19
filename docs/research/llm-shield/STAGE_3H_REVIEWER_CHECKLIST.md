# Stage 3H Reviewer Checklist

Run these and confirm each passes:

```bash
bash scripts/smoke-llm-shield-stage3h.sh                 # 30 canary cases, chain valid
bash scripts/security-audit-llm-shield-stage3h.sh        # invariants + verify-only
node scripts/privacy-audit-llm-shield-stage3h.mjs        # metadata-only
node scripts/consistency-audit-llm-shield-stage3h.mjs    # pin + scorer-unmodified + invariants
cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/ -q   # adapter logic
```

Confirm by inspection:

- [ ] `tools/agentdojo-simurgh-adapter/` contains no safety classification — only transport,
      mapping, enforcement, and evidence writing.
- [ ] The Python adapter forwards every decision to the real gateway; the gateway verdict is
      authoritative and never reinterpreted.
- [ ] `docs/research/llm-shield/evidence/stage-3h/metrics.json` reports AgentDojo-native metrics
      as `measured_external_run_only` (not fabricated) in the CI path.
- [ ] `agentdojo-run-manifest.json` records the AgentDojo version pin and `scorer_modified: false`.
- [ ] No claim of jailbreak immunity, provable security, or a completed external benchmark run.
- [ ] Over-defence rate is reported (0/10) — benign and hard-negative controls are not over-blocked.
