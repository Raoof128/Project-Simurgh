# Stage 3H Evidence

Metadata-only evidence for the Stage 3H AgentDojo benchmark harness (core).

- `metrics.json` — containment invariants (hard-gated) + measured signals (over-defence, latency,
  boundary distribution). AgentDojo-native utility/ASR are `measured_external_run_only` in the CI
  path; they are filled only by a real Layer-2 AgentDojo run.
- `agentdojo-run-manifest.json` — AgentDojo version pin, mode, Simurgh commit, `scorer_modified`.
- `canary/workspace-canary.json` — vendored 30-case workspace canary (synthetic only; no raw
  AgentDojo transcripts). Contexts use the gateway provenance schema.

All artifacts are metadata-only: no raw prompts, provider/tool output bodies, keys, or transcripts.
Enforced by `scripts/privacy-audit-llm-shield-stage3h.mjs`.
