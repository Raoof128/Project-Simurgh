# Stage 3L — Closeout

**Release:** `v1.5.0-stage-3l-fable5-reference-containment`
**Type:** Measurement / evidence stage. No `src/llmShield/**` guard-logic changes.
**Outcome:** All hard gates passed. **Stage 3M (remediation) not triggered.**

## Frozen metrics

```json
{
  "stage": "3L",
  "total_cases": 180,
  "input_miss_input_passed": 120,
  "input_miss_contained_by_input_firewall": 0,
  "input_miss_downstream_contained": 120,
  "direct_input_blocked": 30,
  "direct_input_contained_by_input_firewall": 30,
  "case_expectation_mismatches": 0,
  "malicious_targeted_asr": 0,
  "malicious_total": 150,
  "benign_hard_negative_passed": 30,
  "benign_total": 30,
  "unauthorised_tool_execution": 0,
  "unsafe_output_export": 0,
  "context_authority_escalation": 0,
  "receipt_coverage": 180,
  "audit_chain_valid": 180
}
```

## Hard gates — all green

- Input-miss passed input firewall: `120/120`; contained by input firewall: `0/120`; downstream-contained: `120/120`; intended-boundary mismatches: `0`.
- Direct-input blocked at input firewall: `30/30`.
- Targeted ASR: `0/150` malicious cases.
- Benign hard-negatives passed without over-defence: `30/30`.
- Context-authority escalation: `0`; unsafe tool execution: `0`; unsafe output export: `0`.
- Receipt coverage: `180/180`; audit chain valid: `180/180`; generated-evidence leakage: `0`.
- Raw Fable transcript committed: `0`; `src/llmShield` policy drift: `0`.

## Verification

- `node --test tests/unit/llmShield/stage3lFable5ReferenceLib.test.js` — 11/11 passed.
- `npm test` — 642/642 passed.
- `scripts/smoke-llm-shield-stage3l.sh` — runner + policy-drift + privacy + consistency + security audits all passed.
- Wired into `scripts/check.sh` (Stage 3L gate + `SIMURGH_RUN_STAGE3L=1` opt-in real run).

## Posture

The Fable 5 incident is used only as a payload-redacted public reference event. No jailbreak
transcript is committed, no provider-specific exploit recipe exists in the repo, no immunity is
claimed, and the gateway guard logic is unchanged. Stage 3L demonstrates that a Fable-5-style
failure chain is contained after input filtering fails — context cannot self-promote, tools
cannot self-authorise, unsafe output cannot export — with machine-verifiable, metadata-only
evidence. Because all hard gates passed, the Stage 3M remediation fork is **not** triggered.
