# Stage 3K — Reviewer Checklist

## Measurement, not defence change

- [ ] No new defence logic added.
- [ ] No detector tuning on the adaptive variants.
- [ ] No new allow path in the gateway.
- [ ] No tool-policy widening.
- [ ] No context-trust widening.
- [ ] No output-firewall weakening / bypass.
- [ ] No provider-side tool execution.
- [ ] No live-provider path enabled by default.
- [ ] No new network egress in the committed CI path.
- [ ] `policy-drift-guard-llm-shield-stage3k.sh` passes (none of the following
      were modified, or each change is justified in the script ALLOWLIST):
  - `src/llmShield/contextProvenanceGuard.js`
  - `src/llmShield/contextCanonicalise.js`
  - `src/llmShield/promptContextGuard.js`
  - `src/llmShield/toolInvocationGate.js`
  - `src/llmShield/toolPolicy.js`
  - `src/llmShield/outputLeakageFirewall.js`
  - `src/llmShield/promptFirewall.js`
  - `src/llmShield/gateway/gatewayRouter.js`
  - `src/llmShield/gateway/liveProviderGuard.js`

## Evidence hygiene

- [ ] Generated evidence is hashes/enums/counts only (no raw mutation text).
- [ ] No raw task/injection ids; no forbidden keys (privacy audit green).
- [ ] Stage 3J provenance hashes in `manifest.json` are non-empty (Fix 1).

## Invariants

- [ ] `metrics_consistent == true`.
- [ ] `operator_asr_delta>0` does not coexist with clean hard gates.
- [ ] Mutation + action-open accounting sums match metrics (Fix 2).
- [ ] Stage 3K row tagging only adds lane/operator_id/category; Stage 3J row shape
      unchanged when stage != "3k" (Fix 4 regression test green).

## Closeout

- [ ] `STAGE_3K_CLOSEOUT.md` ends with an explicit Stage 3L decision line (Fix 5).
- [ ] Headline/tag derive only from 3K-A + 3K-B; any 3K-C/3K-D evidence is a
      non-claiming appendix.
