# Stage 4O — VTSA Evidence Bundle

**Motto: AnthropicSafe First, then ReviewerSafe.**

Verifiable Tool-Surface Attestation over the Monotone Consent Law. This directory is the
public, byte-reproducible evidence bundle for Stage 4O.

## Files

| File | What it is |
| --- | --- |
| `vtsa-attestation.json` | Unsigned bundle body: decision corpus (every tamper-matrix arm's outcome), timeline record, constitutional alignment map, honesty ceiling, non-claims, known limitations. |
| `vtsa-manifest.json` | Signature envelope: `attestation_digest` + Ed25519 signature (attestation key), plus both signer public keys and fingerprints. |
| `clean-chain.json` | The committed 3-epoch commitment chain (genesis → delta-bound broadening → state-bound narrowing). |
| `exit-map.json` | (shared 4H ledger) run-level map including the 4O codes 55–66. |

## Reproduce

```bash
scripts/reproduce-llm-shield-stage4o.sh
```

Regenerates the fixtures into a temp dir and `cmp`s them byte-for-byte, runs the Node +
Python unit suites, the all-functions E2E net, and verifies this bundle offline. Requires
Node 26.

## Verify only

```bash
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --evidence docs/research/llm-shield/evidence/stage-4o
node tools/simurgh-attestation/stage4o/node/verify-stage4o.mjs --selective green-unchanged
```

## Keys

Two Ed25519 keypairs, kept in distinct roles so a manifest-commitment signature failure
(raw 56) can never be conflated with a bundle-signature failure:

- **manifest key** signs each tool-manifest commitment.
- **attestation key** signs this bundle.

This bundle is signed with the committed **fixture** attestation key
(`tests/fixtures/llmShield/stage4o/test-keys/INSECURE_FIXTURE_ONLY_*`), because Stage 4O
is Lane-A modelled (the normative manifest is modelled, not captured from a live MCP
server). The signing key is therefore deterministic and the bundle is byte-reproducible.
A production deployment swaps in a real key via `--attestation-key`; the verifier always
checks against the public key embedded in `vtsa-manifest.json`, so both verify.

## Non-claims (carried in the bundle)

`surface_bound_verifiable`, `not_tools_safe`, `not_mcp_server_safe`,
`not_protocol_rug_pull_prevention`, `not_proof_of_human_reading`,
`merkle_machinery_standard_crypto_novel_application`,
`not_constitutional_compliance_claim`, `not_incident_prevention_claim`.

> Infrastructure alignment is not model-value alignment. Stage 4O operationalises selected
> oversight and non-deception principles, but it does not claim constitutional compliance.
