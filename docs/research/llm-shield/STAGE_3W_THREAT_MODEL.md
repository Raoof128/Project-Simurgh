# Stage 3W Threat Model

## What 3W proves

- The offline release-witness bundle re-derives byte-for-byte and its Ed25519 signature verifies
  against the committed public key, with no network.
- Every sealed 3V-B subject digest (attestation bundle, signature, frozen capture replay artifact,
  evidence-hashes) and the witness-verdict file digest recompute and match under `--reproduce`.
- An independent GitHub OIDC/Sigstore root signs a verdict that a clean runner computed from real
  command exit codes, byte-identical to the committed `github-witness-verdict.json`.

## What 3W does NOT prove

- That the original RunPod GPU capture occurred as self-reported (`live_capture_origin_self_reported`
  remains, unchanged). 3W is release/build provenance, not origin truth.
- That Llama Guard 4 was re-executed (it was not).
- Anything that requires the online layer for offline verification — Sigstore/Rekor are additive.

## Adversary attempts and the gate that stops each

| Attempt                                                 | Stopped by                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Edit a sealed 3V-B subject digest                       | Signature + `--reproduce` `subjects_recomputed` (`subject_digest_edited`).                                              |
| Edit `release_commit`                                   | Signature over canonical bundle (`release_commit_edited`).                                                              |
| Edit `tag`                                              | Signature (`tag_edited`).                                                                                               |
| Edit `github-witness-verdict.json` so its digest drifts | `--reproduce` `witness_verdict_recomputed=false` (`witness_verdict_file_edited`).                                       |
| Flip a `ci_observed` boolean                            | Changes the verdict file → bound subject digest mismatch (`ci_observed_flipped`); in CI, byte-identity assertion fails. |
| Tamper the offline signature                            | Signature verify fails (`signature_tampered`).                                                                          |
| Verify with the wrong key                               | Fingerprint + signature mismatch (`wrong_public_key`).                                                                  |
| Remove an evidence file                                 | Verifier fails closed (`file_removed`).                                                                                 |
| Inject a forbidden raw field                            | Signature mismatch + raw-field counter (`forbidden_raw_field_injected`).                                                |
| Leak a Sigstore object into offline evidence            | Security audit (Sigstore-bundle structure markers).                                                                     |
| CI echoes PASS without running gates                    | `ci_observed_not_echoed`: verdict built from real exit codes; byte-identity fails on divergence.                        |
| Change `src/llmShield` under cover of a tooling stage   | Policy-drift guard (`origin/main...HEAD`).                                                                              |

All tamper cases are exercised in `tests/e2e/llm_shield_stage3w_tamper_runner.mjs`; counters for
must-not-happen classes stay zero.
