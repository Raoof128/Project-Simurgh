# Stage 3H Threat Model

Stage 3H places Simurgh as an in-loop defence inside an external benchmark loop. The threat model
covers the seam between AgentDojo and the real gateway.

## Assets

- Containment invariants (no unauthorised tool execution, no unsafe output export, no context
  authority escalation).
- The metadata-only evidence chain (receipts + HMAC audit chain).
- The integrity of the external benchmark claim (scorer unmodified; in-loop, not replay).

## Adversaries and entry points

- **Untrusted AgentDojo tool output** carrying injected instructions → enters as untrusted
  context; must be demoted or rejected by the context provenance guard, never become authority.
- **Agent-proposed unsafe tool calls** (driven by injection) → must be blocked at the tool gate
  before execution.
- **Leakage-seeking final outputs** → must be blocked at the output firewall before export.
- **Adapter tampering** — a bug or change that lets Python reinterpret, downgrade, or fabricate a
  verdict. Mitigation: the adapter is transport + enforcement only; the gateway verdict is
  authoritative; the security gate re-runs the canary and re-verifies invariants.
- **Evidence exfiltration** — raw prompts/outputs/keys leaking into committed evidence.
  Mitigation: metadata-only contract enforced by the privacy audit over the whole evidence dir
  and by `assertNoEvidenceLeakage`.
- **Benchmark drift** — silent AgentDojo version change invalidating comparisons. Mitigation: the
  version pin is recorded in the manifest and enforced by the consistency gate.

## Explicit non-goals

Stage 3H does not defend the model itself, does not claim a completed external benchmark result in
CI, and does not provide capability-based (provable) isolation. Detection by the gateway's
heuristics is incomplete by construction.
