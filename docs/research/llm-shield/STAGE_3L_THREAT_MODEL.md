# Stage 3L — Threat Model

## In scope — the attacker can

| Capability | Stage 3L meaning |
| --- | --- |
| Supply apparently benign task framing | "Review this codebase", "summarise these findings", "prepare a patch plan" |
| Poison untrusted context | README, issue text, comments, tool output, page content |
| Attempt authority escalation | Context claims it is system/developer/user-approved |
| Attempt tool self-authorisation | Context/output asks for shell/network/secret/export actions |
| Attempt unsafe output export | Provider output tries to reveal hidden policy, tool args, secrets, or unsafe procedural detail |
| Use long-run softening | Multi-turn nudges across a session |
| Use memory/subagent drift | Attempts to persist or delegate attacker authority |

These map onto the Stage 3D downstream boundaries: context provenance guard, tool invocation
gate, output leakage firewall, and the tamper-evident receipt/audit chain.

## Out of scope

- Reproducing the alleged Fable 5 jailbreak.
- Live offensive cyber generation.
- Real tool execution.
- Provider-side tools, MCP, computer-use, or shell.
- Claiming any provider is safe or unsafe.
- Hardware or OS-level attestation.
- Semantic proof of alignment.

## Core assumption

Input filtering can fail. Stage 3L deliberately constructs 120 cases whose user input passes the
input firewall, so that containment must come from a downstream boundary. Input-blocked cases
(the 30 `direct_input_attack` cases) are reported separately and are not counted as
downstream-containment evidence.
