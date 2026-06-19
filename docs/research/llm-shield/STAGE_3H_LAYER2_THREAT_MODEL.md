# Stage 3H-L2 Threat Model

Stage 3H-L2 evaluates Simurgh in an external AgentDojo loop. The main risks are benchmark drift,
scorer modification, post-hoc replay masquerading as in-loop defence, raw trajectory leakage,
provider/model mismatch between baseline and defended runs, and over-defence hiding as security
improvement.

Mitigations:

- pinned `agentdojo==0.1.30` dependency and `v1.2.1` workspace benchmark version
- committed sample manifest with SHA-256 recorded in the run manifest
- unchanged AgentDojo scorer requirement
- baseline and defended runs under identical sample, benchmark, attack, and provider conditions
- Simurgh receipt mapping for every defended run
- metadata-only evidence writer and privacy audit
- consistency audit for counts, gateway contact, receipt coverage, and audit verification

Stage 3H-L2 does not defend the model itself and does not claim adaptive-attack robustness. The
defended deterministic run shows high over-defence, which is recorded as a measured finding.
