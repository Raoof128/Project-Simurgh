# Stage 4T VIC — Lane B live capture

**MOTTO: AnthropicSafe First, then ReviewerSafe.**

`capture.json` is a **live, two-OS-process MCP-stdio delegation ceremony** projected
into a dual-template Incident Capsule with three tiered audience views.

- **Real hop.** The parent process spawns the Stage 4S `delegatee-mcp-server.mjs` as
  a second OS process and performs a genuine JSON-RPC 2.0 `initialize → tools/list →
  tools/call` handshake over stdio (`transport: mcp_stdio_jsonrpc2`). The A→B hop is
  co-signed live by the delegatee.
- **Ephemeral keys.** Both the delegation keys and the capsule signing key are
  generated in-memory and never written to disk. Therefore this capture is
  **re-verified, never regenerated** — `reproduce` runs `--verify` only.
- **Honest framing (staged contained near-incident).** The recorded chain verdict is
  the real verdict of the live delegation window. The capsule projects it as
  `chain_of_events`; the **seriousness classification and narrative sections are
  `requires_human_input`** — the capsule refuses to invent a legal classification, and
  that refusal is the rail demonstrated in the flagship artifact.
- **No Two Stories.** All three views (`regulator` full, `insurer` identity-reduced,
  `public` redacted) carry the **same capsule root**; the public view differs from the
  regulator view only by ledgered redactions — provably one story.

Re-verify:

```
node tools/simurgh-attestation/stage4t/laneb/run-laneb-incident-ceremony.mjs --verify
```

The deterministic **Lane A** corpus (`tests/fixtures/llmShield/stage4t/expected-results/laneA/`)
carries the incident-species coverage, including a real Stage-4S over-scoped crossing
(verdict 108); Lane B is the live, additive demonstration of a genuine agent-to-agent hop.
