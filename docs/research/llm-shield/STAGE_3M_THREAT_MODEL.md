# Stage 3M — Threat Model

## In scope — what the attestation defends against

| Threat | Stage 3M defence |
| --- | --- |
| Bundle tampering after signing | Ed25519 signature over canonical bundle bytes; any edit fails `signature_valid` + `bundle_digest_match` |
| Referenced evidence file swapped/edited | `referenced_evidence[].sha256` re-checked against on-disk files (`evidence_file_hashes_match`) |
| Decorative / lying gate results | `gate_results` must equal recomputed `evaluateGateResults(metrics)` (`gate_results_match`) and pass (`declared_gates_pass`) |
| Wrong / substituted signing key | `signature_valid` fails under a different public key; `--expected-key-fingerprint` pins the trust anchor |
| Accidental raw-data leakage into evidence | leakage rescan of the canonical bundle + referenced files (`evidence_leakage_zero`) |
| Non-reproducible numbers (deterministic run-sets) | `--reproduce` re-runs the Stage 3L producer and matches signed metrics/breakdown/privacy |

## Out of scope

- Proving the server was uncompromised at signing time.
- Proving the private key was never stolen (a stolen key can sign a valid-looking bundle — this is
  why the public-key fingerprint is published as a trust anchor and rotation is a manual action).
- Proving model safety or jailbreak immunity.
- Content-harm / refusal classification (the layer that failed in the Fable 5 incident).
- Per-gateway-call attestation (run-set only in v1).
- Upgrading the Stage 3L audit sample into a full per-case HMAC chain.

## Trust anchor

A signature is only meaningful if the verifier trusts the public key. The committed public-key
fingerprint (`sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798`) is recorded
in the stage docs, evidence README, and release notes, and can be pinned with
`--expected-key-fingerprint`.
