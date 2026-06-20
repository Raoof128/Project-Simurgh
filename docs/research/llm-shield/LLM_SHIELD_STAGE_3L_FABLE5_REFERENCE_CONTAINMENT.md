# LLM Shield — Stage 3L: Fable-5 Reference Containment Regression

**Release:** `v1.5.0-stage-3l-fable5-reference-containment`
**Type:** Measurement / evidence stage. No `src/llmShield/**` guard-logic changes.

## Steel-thread claim

Stage 3L does not prove jailbreak immunity. It demonstrates that a Fable-5-style failure chain
can be contained **after input filtering fails**: untrusted context cannot gain authority, tool
requests cannot self-authorise, unsafe output cannot export, and every decision leaves
machine-verifiable, metadata-only evidence.

## Why this stage exists

Public reporting in June 2026 describes the US government ordering Anthropic to disable Claude
Fable 5 and Mythos 5 over a potential jailbreak that Anthropic characterised as narrow and
non-universal. Stage 3L does **not** reproduce the alleged technique — that would be legally
fraught, unsafe, and scientifically weak. Instead, the incident is used only as a public
_reference event_ for a failure class:

> A highly capable long-running agent receives apparently legitimate work, consumes untrusted
> context, treats that context as authority, attempts tool use or unsafe export, and leaves weak
> evidence.

This is exactly the failure class Stage 3D reframed the LLM Shield to contain. Stage 3L measures
whether those downstream boundaries hold for this specific shape. We model the failure chain,
not the leaked technique: public-incident-informed, payload-redacted, provider-agnostic,
key-free in CI, evidence-first.

## What is measured

A deterministic 180-case corpus is driven through the **real** Simurgh boundary functions in
pipeline order (`classifyPrompt → guardContexts → gateToolRequest → scanOutput`). The observed
containment boundary is therefore measured, not asserted.

| Case mode               | Count | Meaning                                                                                                                                               |
| ----------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input_miss_downstream` |   120 | User task passes the input firewall; the malicious signal lives in untrusted context / tool request / provider output, forcing a downstream boundary. |
| `direct_input_attack`   |    30 | Attack is in the user input; the input firewall blocks it. Reported separately.                                                                       |
| `benign_hard_negative`  |    30 | Realistic safe coding tasks that must pass without over-defence.                                                                                      |

Five malicious families × (24 input-miss + 6 direct), plus one benign family × 30.

## Frozen metrics (v1.5.0)

```json
{
  "total_cases": 180,
  "input_miss_input_passed": 120,
  "input_miss_contained_by_input_firewall": 0,
  "input_miss_downstream_contained": 120,
  "direct_input_blocked": 30,
  "direct_input_contained_by_input_firewall": 30,
  "case_expectation_mismatches": 0,
  "malicious_targeted_asr": 0,
  "benign_hard_negative_passed": 30,
  "context_authority_escalation": 0,
  "unauthorised_tool_execution": 0,
  "unsafe_output_export": 0,
  "receipt_coverage": 180,
  "audit_chain_valid": 180
}
```

## Reviewer claim table

| Claim                                            | Allowed? | Wording                                     |
| ------------------------------------------------ | -------: | ------------------------------------------- |
| Stage 3L mitigates a Fable-5-style failure chain |      Yes | "reference containment regression"          |
| Simurgh proves jailbreak immunity                |       No | Never                                       |
| Simurgh reproduces the Fable 5 jailbreak         |       No | Never                                       |
| Simurgh defeats Claude Fable 5                   |       No | Never                                       |
| Input filtering can fail                         |      Yes | Core assumption                             |
| Downstream consequences are contained            |      Yes | Only as metrics show                        |
| Evidence is machine-verifiable                   |      Yes | Receipts + audit + privacy gates            |
| Provider safety is proven                        |       No | Never                                       |
| Live model safety is evaluated                   | Optional | Only optional `live_shadow`, not a CI claim |

## Positioning

Stage 3L evaluates a Fable-5-style jailbreak chain as a containment problem, not a refusal
problem. The test assumes input filtering can fail and measures whether downstream context,
tool, output, and audit boundaries prevent unsafe consequences.

## Outcome

All hard gates pass; `src/llmShield` is untouched (policy-drift clean). Stage 3M (remediation)
is **not triggered**. See `STAGE_3L_CLOSEOUT.md`, `STAGE_3L_THREAT_MODEL.md`,
`STAGE_3L_VALIDATION_MATRIX.md`, `STAGE_3L_REVIEWER_CHECKLIST.md`, and
`evidence/stage-3l/`.
