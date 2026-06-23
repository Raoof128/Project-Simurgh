# Stage 3W — Witnessed VCA Release Provenance

## Summary

Stage 3V-B sealed a real, live Llama Guard 4 capture into a signed, replay-reproducible containment
attestation. Stage 3W notarises that **sealed release** with a second, independent provenance root —
without pretending to prove anything it cannot.

**Crown.** Stage 3W does not claim the live model execution is independently reproducible. It
demonstrates that a sealed VCA release can be independently witnessed, hash-bound, replay-verified,
and signed as a provenance object — by two roots that never depend on each other.

## What 3W is (and is not)

3W proves **release/build provenance** over the sealed 3V-B evidence, not **origin truth** over the
live model capture. Specifically it does NOT:

- reduce `live_capture_origin_self_reported` (the 3V-B caveat stays signed and unchanged);
- prove the original RunPod GPU capture occurred as self-reported;
- re-execute Llama Guard 4;
- make Sigstore/Rekor part of offline verification.

## The two roots

1. **Offline Simurgh Ed25519 root (primary).** An in-toto Statement v1 release-witness bundle binds
   the sealed 3V-B subject digests (attestation bundle, signature, frozen capture replay artifact,
   evidence-hashes) plus the deterministic witness-verdict file. It is signed locally and verifies
   with a committed public key and **no network**.
2. **GitHub OIDC/Sigstore root (additive).** A clean GitHub runner re-runs the 3V-B offline gates,
   builds `ci_observed` from **real command exit codes** (never echoed), asserts the regenerated
   `github-witness-verdict.json` is byte-identical to the committed file, then signs it via
   `actions/attest-build-provenance`.

The two roots corroborate by **digest equality**, not signature nesting — no circular dependency,
no second commit. The offline bundle binds the witness-verdict **file**, never the Sigstore
attestation over it.

## Why this is the real second-root value

3V-B's CI already re-verifies the evidence on every push. 3W's new contribution is not
re-verification — it is a verdict signed by an identity that is **not the developer's key**: GitHub's
OIDC-minted, transparency-log-backed signature over a verdict that the runner computed from actual
command exits. The `ci_observed_not_echoed` invariant is what makes the booleans evidence rather
than decoration: if reality diverged from the committed verdict, the byte-identity assertion fails
and the workflow fails before attesting.

## Honesty discipline

The sacred non-claim `does_not_reduce_live_capture_origin_self_reported` is carried in both the
offline bundle and the witness verdict. The offline verifier never touches the network; the Sigstore
layer is additive and `gh attestation verify` lives in reviewer docs, not the core verifier.
