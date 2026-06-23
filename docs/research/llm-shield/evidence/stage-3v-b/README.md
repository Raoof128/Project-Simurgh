# Stage 3V-B Evidence — Live Llama Guard 4 External-Defence Containment Attestation

> **Crown:** Stage 3V-B does not claim Llama Guard 4 is reproducible. It claims the evidence is
> reproducible, the live capture is provenance-bound, and the committed frozen-capture replay
> artifact lets reviewers reproduce the signed attestation offline.
>
> **Steel thread:** An input-only guardrail can only judge the user turn. In the 120 input-miss
> cases the user task is benign and the attack lives downstream in untrusted context, tool
> requests, or provider output. Stage 3V-B measures that limitation honestly, then verifies
> whether Simurgh's consequence boundaries contain the unsafe path anyway. This is a boundary
> claim, not an anti-Llama-Guard claim.

Llama Guard 4 (`meta-llama/Llama-Guard-4-12B`) is run once, input-only, greedy, over the Stage 3L
180-case run-set. Its raw classifier verdicts are an UNTRUSTED ADVISORY signal. The Simurgh
trusted harness normalises the LG4 grammar, computes every hash itself (closing the 3U R2-B
residual), and signs the run offline. **The model is never re-executed in CI**
(`model_reexecuted_in_ci: false`); CI replays the committed frozen capture.

## File inventory

| File                                                    | What it is                                                                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `attestation.bundle.json`                               | The signed `simurgh.vca.external_defense_run.v1` bundle (stage `3V-B`).                                                                      |
| `attestation.signature.json`                            | Ed25519 signature over `canonicalJson(bundle)` (3V-B key).                                                                                   |
| `capture-replay/lg4-frozen-capture.json`                | Sanitised, privacy-audited frozen capture — `case_id` + raw LG4 classifier output + provenance only. The reproduce path's raw-output source. |
| `external-observations.json`                            | One normalised observation per case (no hashes, no raw output).                                                                              |
| `metrics.json`                                          | External + comparative metrics.                                                                                                              |
| `containment-summary.json`                              | Downstream containment outcomes (advisory-invariant).                                                                                        |
| `corpus-manifest.json`                                  | External-defence manifest (verdict histogram, case ids).                                                                                     |
| `input-manifest.json`                                   | Per-case `user_task` sha256 (binds the exact inputs; no prompt text).                                                                        |
| `capture-summary.json`                                  | One-glance reviewer summary of the run.                                                                                                      |
| `adapter-digests.json`                                  | The seven harness-computed hashes + the Stage 3L corpus manifest hash.                                                                       |
| `referenced-evidence.json`                              | Stage 3L manifest binding.                                                                                                                   |
| `privacy-report.json`                                   | Metadata-only declaration.                                                                                                                   |
| `evidence-hashes.json`                                  | SHA-256 of every other evidence file.                                                                                                        |
| `keys/stage3vb-public-key.json`, `keys/fingerprint.txt` | Public key + fingerprint (private key never committed).                                                                                      |

## Reproduce offline

```bash
scripts/reproduce-llm-shield-stage3vb.sh
```

This runs both preflights, re-derives the bundle byte-for-byte, recomputes the seven trusted
hashes + the Stage 3L corpus manifest + the input manifest, verifies the Ed25519 signature, and
runs the tamper suite. The verifier does **not** download or rehash Llama Guard 4 weights
(`model_weights_recomputed_by_verifier: false`): it verifies the evidence and the
provenance/replay binding, not the model.

## Known limitation (signed)

`live_capture_origin_self_reported` — offline verification can prove the signed attestation
reproduces over the frozen capture and that the capture is hash-bound to the provenance manifest.
It cannot independently prove that the rented GPU executed Llama Guard 4 exactly as self-reported.
