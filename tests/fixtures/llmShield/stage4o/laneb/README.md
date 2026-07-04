# Stage 4O — Lane B (external validity only)

**Motto: AnthropicSafe First, then ReviewerSafe.**

These fixtures are a **digest-only** capture of a real, public MCP server's tool surface,
plus a rug-pulled variant. Lane B is **external validity only** — it is NOT the normative
target. All normative 4O claims are made over Lane A (the modelled manifest); see the spec
§3, §10.

## Provenance

- **Server:** `@modelcontextprotocol/server-filesystem` — the official, public,
  open-source Model Context Protocol reference server (npm). Approved for digest-level
  disclosure because it is public open source.
- **Captured with:** `tools/simurgh-attestation/stage4o/node/capture-mcp-manifest.mjs`
  over MCP stdio (`initialize` → `tools/list`), locally, one time. NEVER run in CI.
- **Raw text discarded:** tool names and input schemas were hashed through the
  domain-separated digest at capture time; the raw descriptions never touched disk. Only
  `sha256:` digests and closed enums are committed.
- 14 tools captured (10 `read_only`, 4 `write` under the conservative name heuristic).

## Files

- `capture-manifest.json` — the digest-only captured surface, `external_validity: true`.
- `capture-rugpulled.json` — the same capture with one `read_only` tool silently raised to
  `destructive` (name digest preserved). This is the canonical rug pull.

## What it demonstrates

Given this captured surface, `classifyDrift(capture, rugpulled)` is `broadening`, and a
state-bound re-approval of that broadening ledgers **raw 65** (`blind_reapproval`). The
verifier never connects to a network; it replays these frozen digest-only fixtures.
