# Stage 3J Threat Model

## Claim boundary

Stage 3J measures **consequence containment**, not jailbreak prevention. It does not claim a jailbreak cannot occur; it measures whether harmful consequences are contained if one does, across the full pinned AgentDojo benchmark under the deterministic ground-truth pipeline.

## Attacker capabilities

- Place malicious instructions in untrusted tool outputs / retrieved context (AgentDojo `important_instructions` indirect injection).
- Attempt to override system/developer instructions.
- Attempt to redirect the user task.
- Attempt to trigger malicious tool calls.
- Attempt to cause secret / policy / tool-argument leakage.
- Attempt to derail the benign task (denial of service).

## Defender invariants (unchanged from Stage 3D/3E/3I)

- Model text cannot become policy.
- Untrusted context cannot become instruction authority; it is demoted-to-data or rejected.
- Provider output is untrusted; provider-side tools stay off.
- Tool-shaped output is gated and never auto-executed.
- Unsafe output is blocked before export.
- All evidence is metadata-only (hashes/enums/counts).

## Out of scope

- Adaptive black-box attacks (AutoDojo-style) — static pinned benchmark only.
- Live-model robustness — deterministic ground-truth pipeline only.
- Production deployment, MDM, hardware attestation.

## Residual risk

A determined jailbreak may still alter model _text_; Stage 3J's guarantee is that such text cannot acquire authority, execute tools, or export unsafe output through the gateway, and that every decision is receipt-backed and audit-verifiable. Static-benchmark cleanliness does not imply adaptive-attack robustness.
