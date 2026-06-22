# Stage 3V-A evidence

Metadata-only evidence for the Recorded External-Signal Containment Attestation. All artifacts
are deterministic and offline-reproducible. Raw external outputs are **not** here — they live
only in `tests/fixtures/stage-3v/recorded-external-outputs.json` and are used solely for
harness hashing.

## Files

| File | Description |
|---|---|
| `attestation.bundle.json` | The signed VCA bundle (`simurgh.vca.external_defense_run.v1`). |
| `attestation.signature.json` | Ed25519 sidecar over `canonicalJson(bundle)` (canonical-not-bytes). |
| `external-observations.json` | Normalised external verdicts only (no raw output). |
| `metrics.json` | External + comparative metrics. |
| `containment-summary.json` | Simurgh containment metrics (zero unsafe outcomes). |
| `corpus-manifest.json` | External-defence manifest (verdict histogram + case ids). |
| `adapter-digests.json` | The four harness-computed hashes. |
| `referenced-evidence.json` | Cross-reference to the Stage 3L run-set. |
| `privacy-report.json` | Metadata-only attestation (`raw_output_in_evidence: false`). |
| `self-proof-results.json` | Tamper suite — every case rejected, counters zero. |
| `verifier-output.json` / `reproduce-output.json` | Portable + reproduce verifier results. |
| `keys/stage3v-public-key.json`, `keys/fingerprint.txt` | Public key + fingerprint (private key never committed). |
| `evidence-hashes.json` | SHA-256 of every other file (computed after formatting). |
| `tamper-tests/` | Reserved for materialised tamper artifacts. |

## Verify offline

```bash
# portable (signature + structural gates)
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs

# reproduce (re-derives bundle in-process; emits explicit recompute checks)
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs --reproduce

# full offline reproduction (verifier + hashes + tamper suite)
scripts/reproduce-llm-shield-stage3v.sh
```

A recorded external verdict is an advisory observation, not an accusation, and not a live defence.
