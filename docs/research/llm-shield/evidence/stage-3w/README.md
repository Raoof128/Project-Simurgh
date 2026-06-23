# Stage 3W Evidence — Witnessed VCA Release Provenance

> **Crown:** Stage 3W does not claim the live model execution is independently reproducible. It
> demonstrates that a sealed VCA release can be independently witnessed, hash-bound, replay-verified,
> and signed as a provenance object — by two roots that never depend on each other.
>
> **Sacred non-claim:** 3W does **not** reduce `live_capture_origin_self_reported` (the 3V-B caveat
> stays signed and unchanged). 3W is orthogonal release/build provenance, not origin truth.

Two independent roots witness the same sealed Stage 3V-B (v2.6.0, merge `b645d80`) bytes:

- **Offline root (primary):** an in-toto Statement v1 release-witness bundle, signed with the 3W
  Ed25519 key, fully verifiable with the committed public key and **no network**.
- **Online root (additive):** `github-witness-verdict.json`, which a clean GitHub runner regenerates
  from **real command exit codes**, asserts byte-identical, and signs via
  `actions/attest-build-provenance` (OIDC/Sigstore). It is never a dependency of offline verification.

Corroboration is by **digest equality**, not signature nesting. The offline bundle binds the
witness-verdict **file** as a subject — never the online Sigstore attestation over it.

## File inventory

| File                                                   | What it is                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `attestation.bundle.json`                              | Offline in-toto release-witness statement (predicateType `…/vca-release-witness/v1`).                              |
| `attestation.signature.json`                           | Ed25519 signature over `canonicalJson(bundle)` (3W key).                                                           |
| `github-witness-verdict.json`                          | Deterministic CI verdict: `expected` + `ci_observed` + `expected_equals_observed` (mode `ci_observed_not_echoed`). |
| `provenance.json`                                      | Dual-root provenance summary.                                                                                      |
| `self-proof-results.json`                              | Tamper self-proof output (all rejected, counters zero).                                                            |
| `evidence-hashes.json`                                 | SHA-256 of every other evidence file (excludes itself; no Sigstore object).                                        |
| `keys/stage3w-public-key.json`, `keys/fingerprint.txt` | Public key + fingerprint (private key never committed).                                                            |

## Reproduce offline (no network)

```bash
scripts/reproduce-llm-shield-stage3w.sh
```

Re-derives the bundle byte-for-byte, recomputes every 3V-B subject digest and the witness-verdict
file digest, verifies the Ed25519 signature, and runs the tamper suite. **No Sigstore, no Rekor, no
`gh attestation`** — the offline root stands alone.

## Optional online confirmation (NOT required for offline verification)

After the v2.7.0 tag triggers the witness workflow, a reviewer may additionally confirm the
GitHub/Sigstore attestation:

```bash
gh attestation verify docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json \
  --repo Raoof128/Project-Simurgh
```

This is an additive second-root check. It is deliberately **outside** the core offline verifier.
