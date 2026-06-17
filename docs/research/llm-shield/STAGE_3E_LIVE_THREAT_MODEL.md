<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-live — Threat Model

> A live provider call is an observed gateway event, not a proof of model safety.

Scope: the new live boundary between the Simurgh gateway and a real Anthropic endpoint. The
sealed 3A/3C input firewall and 3D containment boundaries are unchanged; this model covers only
what the live adapter adds.

## Boundary

`client → gateway (untrusted input + untrusted context) → [3A/3C input firewall] → [3D context guard] → bounded provider-safe context → Anthropic (untrusted text generator) → [3D tool gate + output firewall] → metadata-only receipt`

## Threats and controls

| #   | Threat (OWASP LLM)                             | Vector                                                   | Control                                                                                                                                                                                                                |
| --- | ---------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | LLM01 Prompt injection (direct)                | Malicious user input reaches the model                   | Input firewall (3A/3C) classifies before the call; output firewall scans the response before export                                                                                                                    |
| T2  | LLM01 Prompt injection (indirect)              | Poisoned `contexts[]` try to act as instructions         | 3D context provenance guard rejects authority-forging/secret-marked context (provider skipped); accepted context is demoted to a bounded `minimal_summary` with an explicit "untrusted data, not instruction" boundary |
| T3  | LLM06 Excessive agency                         | Model emits a tool call expecting execution              | No provider-side tools are ever requested; tool-shaped output is sanitized to hashed metadata, routed through the 3D tool gate, and **never executed**                                                                 |
| T4  | Sensitive information disclosure               | System prompt / secret / policy leakage in the response  | Output firewall runs on every response **including refusals**; blocked output is hashed, never stored                                                                                                                  |
| T5  | LLM10 Unbounded consumption (denial-of-wallet) | Floods of/oversized live calls                           | `liveCallLedger` per-session/minute/day caps + input/output/context char caps + request timeout (`AbortController`)                                                                                                    |
| T6  | Credential exfiltration                        | Client supplies an API key, or a key is logged/persisted | Keys accepted only from server env; client-supplied key fields rejected; receipts/audit/evidence carry only `*_recorded:false` booleans and hashes                                                                     |
| T7  | Supply-chain / accidental egress               | SDK pulled in or network used when not intended          | No static SDK import under the gateway; dynamic import only inside the adapter, reachable only after the env guard passes; mock remains the default; egress only on the validated live path                            |
| T8  | Audit tampering                                | Evidence altered after the fact                          | HMAC audit chain over additive live events; `/verify` confirms chain integrity                                                                                                                                         |

## Residual risk

The model itself may still produce unsafe content; Stage 3E-live does not prevent that. The
claim is strictly **consequence containment**: the gateway blocks execution/export and leaves
metadata-only evidence. Live correctness for unsafe-output handling is exercised via
`recorded_fixture`, not live exploit prompts.
