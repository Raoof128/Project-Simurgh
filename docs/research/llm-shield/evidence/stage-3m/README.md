# Stage 3M — Evidence (verifiable containment attestation)

This directory holds the offline-verifiable attestation over the Stage 3L 180-case run-set. It is
metadata-only: hashes, counts, gate booleans, enum codes, the public key, and an opaque signature.

| File | Contents |
| --- | --- |
| `attestation.bundle.json` | Canonical run-set bundle: metrics, boundary breakdown, recomputed gate results, policy digests, privacy report, hash-bound `referenced_evidence`, and machine-readable `non_claims`. |
| `attestation.signature.json` | Detached `simurgh.vca.signature.v1` sidecar: Ed25519 signature over the canonical bundle bytes, plus `bundle_sha256` and `public_key_fingerprint` anchors. |
| `attestation.public-key.json` | Ed25519 public key (SPKI PEM) + SHA-256 fingerprint over the DER SPKI bytes. |
| `verifier-output.txt` | Last verifier run output (not signed; an output of verification). |

## Public-key fingerprint (trust anchor)

```
sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798
```

## Verify (offline)

```bash
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle      docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature   docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key  docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json \
  --expected-key-fingerprint sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798 \
  --reproduce
```

Expected: `simurgh attestation verify: PASS` with every check `true`.

## Regenerate (release action; needs the private key)

```bash
SIMURGH_VCA_PRIVATE_KEY_PATH="$HOME/.simurgh/vca-private-key.pem" \
  node tools/simurgh-attestation/sign-attestation.mjs
```

The private key is **never** committed. Signing is a deliberate, local/manual release action; CI
only verifies.
