# Stage 3V-B Threat Model

## What 3V-B proves

- The signed bundle re-derives byte-for-byte from the committed frozen-capture replay artifact.
- The seven trusted-harness hashes, the Stage 3L corpus manifest, and the input manifest all
  recompute and match under `--reproduce`.
- The Ed25519 signature over `canonicalJson(bundle)` verifies against the committed public key.
- Downstream containment outcomes are invariant to the external advisory verdict (the containment
  tail reuses `evaluateStage3lCase(fixture)` read-only and never consumes the LG4 verdict).

## What 3V-B does NOT prove

- That the rented GPU actually executed Llama Guard 4 exactly as self-reported. The capture origin
  is self-reported; this is signed as `live_capture_origin_self_reported`.
- That the model weights are authentic. The verifier does not download or rehash weights
  (`model_weights_recomputed_by_verifier: false`); it verifies the evidence and the
  provenance/replay binding only.
- Any general accuracy benchmark or vendor ranking for Llama Guard 4.

## Adversary attempts and the gate that stops each

| Attempt                                                  | Stopped by                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Flip a metric / verdict in the signed bundle             | Signature over `canonicalJson(bundle)` (`external_verdict_flipped`).                  |
| Edit provenance (commit / snapshot digest)               | Signature + `capture_provenance_hash` (`provenance_edited`, `weights_digest_edited`). |
| Edit the input manifest hash                             | Signature + `--reproduce` recompute (`input_manifest_edited`).                        |
| Swap the committed capture file                          | `capture_file_hash` + signature (`capture_file_hash_edited`).                         |
| Sign with the wrong key                                  | Fingerprint + signature mismatch (`wrong_public_key`).                                |
| Inject raw model output into the bundle                  | Signature + `raw_output_in_bundle` counter (`raw_output_injected`).                   |
| Remove an evidence file                                  | Verifier fails closed (`file_removed`).                                               |
| Adapter supplies its own hash                            | Contract throws `adapter_supplied_hash_forbidden`.                                    |
| Echo a real prompt into committed evidence               | Capture-integrity preflight + privacy audit.                                          |
| Tag v2.6.0 from the sample                               | `assert-stage3vb-live-release.sh` (live + real-sha256 + non-1970).                    |
| Change `src/llmShield/**` under cover of a tooling stage | Policy-drift guard (`origin/main...HEAD`).                                            |

All tamper cases are exercised in `tests/e2e/llm_shield_stage3vb_tamper_runner.mjs`; counters for
must-not-happen classes stay zero.
