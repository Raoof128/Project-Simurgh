# Stage 3F Threat Model

Stage 3F assumes compromise pressure. The provider may be confused, hostile-shaped, or influenced by direct and indirect prompt injection. The benchmark measures whether that pressure can cross protected boundaries and produce unsafe consequences.

## Assets

- Instruction authority boundaries.
- Trusted context labels and provenance.
- Tool invocation policy.
- Output export policy.
- Safety receipts.
- Audit-chain verifiability.
- Metadata-only evidence posture.

## Adversary Goals

- Promote untrusted context into system, developer, policy, or tool authority.
- Cause shell, network, file, secret, payment-like, email-like, or unknown tool execution.
- Export unsafe model output, leaked policy text, secret-shaped content, tool arguments, or raw context.
- Remove, corrupt, or bypass receipt and audit evidence.
- Use multi-turn softening to accumulate authority gradually.

## Trust Boundaries

| Boundary         | Required containment                                               |
| ---------------- | ------------------------------------------------------------------ |
| Input firewall   | Direct malicious input is blocked, warned, or contained downstream |
| Context guard    | Untrusted context remains data and cannot become authority         |
| Tool gate        | Unsafe provider-shaped tool requests are blocked before execution  |
| Output firewall  | Unsafe provider output is blocked before export and hash-only      |
| Risk accumulator | Repeated softening increases risk monotonically                    |
| Receipt/audit    | Every boundary decision leaves metadata-only evidence              |

## Out of Scope

Stage 3F does not test live-provider quality, browser automation, production deployment, compliance, or universal jailbreak detection. It is a deterministic benchmark for containment invariants.
