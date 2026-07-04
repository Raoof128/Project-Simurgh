# Stage 4O — VTSA Threat Model

**Motto: AnthropicSafe First, then ReviewerSafe.**

Stage 4O — Verifiable Tool-Surface Attestation — verifies that tool execution was gated
through a manifest-bound kernel entry point, and that silent tool-surface swaps are
rejected or evidenced as verifier failures. It does **not** make tools safe, prove an MCP
server safe, or prevent rug pulls at the protocol layer. This document names the
adversaries and maps each to the raw code that contains it.

## Trust boundary

All 4O claims apply ONLY to calls routed through `authorise_with_manifest` (the fourth,
additive Capability Kernel entry point; the frozen three are byte-unchanged). The verifier
is offline and recomputes every digest, root, delta, and signature from bundle bytes; it
never trusts a claimed value.

## Adversaries and containment

| Adversary               | Move                                                              | Contained by                                                         | Raw |
| ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- | --- |
| **Rug-puller**          | swaps the tool surface after approval                             | recomputed toolset Merkle root ≠ committed                           | 58  |
|                         | substitutes a different tool under a call                         | tool-name digest not in the manifest / inclusion proof invalid       | 59  |
|                         | silently replaces a tool's schema                                 | committed schema digest ≠ recorded                                   | 60  |
|                         | escalates a tool's authority (read_only→write→egress→destructive) | authority-class rank increase vs committed entry                     | 61  |
|                         | expands a tool's egress sinks                                     | run-time sink set ⊄ declared sinks                                   | 62  |
| **Launderer**           | hides a broadening inside a chain of claimed narrowings           | recomputed per-step + direct drift classification is inconsistent    | 64  |
| **Blind approver**      | re-approves a broadening without binding the delta                | broadening/incomparable step with `consent_binding = "state"`        | 65  |
| **Forger**              | forges or replays a manifest commitment                           | commitment Ed25519 signature invalid                                 | 56  |
|                         | replays a stale manifest outside its window                       | `run_epoch` outside `[valid_from_epoch, valid_until_epoch]`          | 57  |
| **Launderer (binding)** | authorises one entry but records another call                     | receipt action/manifest binding ≠ decision                           | 63  |
| **Retro-rewriter**      | rewrites the committed surface after an incident                  | timeline root ≠ committed chain head / referenced 4N position absent | 66  |
| **Omitter**             | supplies no or malformed commitment                               | fail-closed                                                          | 55  |

Verifier artifact/internal failures route through the existing harness path (raw 29 →
run-level 3); they never allocate a new 4O code.

## What 4O does not defend against (signed non-claims)

`surface_bound_verifiable`, `not_tools_safe`, `not_mcp_server_safe`,
`not_protocol_rug_pull_prevention`, `not_proof_of_human_reading`,
`merkle_machinery_standard_crypto_novel_application`,
`not_constitutional_compliance_claim`, `not_incident_prevention_claim`.

Delta-bound consent proves the approval artifact **cryptographically bound the change**,
not that a human read it. Digest privacy is metadata-minimisation, not secrecy against
dictionary inference over low-entropy tool names. Timeline anchoring binds at attestation
time, not in real time.
