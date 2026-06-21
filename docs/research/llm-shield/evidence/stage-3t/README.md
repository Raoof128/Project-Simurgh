# Stage 3T evidence — Offline Capability-Extraction Pattern Attestation

> Stage 3T does not detect attackers, prove intent, or confirm distillation. It proves
> that a frozen detector can be re-run over a committed synthetic metadata-only set to
> reproduce extraction-pattern decisions byte-for-byte, while benign-silence fixtures show
> that single phenomena do not escalate into findings.

All data here is **synthetic** (`set_provenance: "synthetic_reference"`), metadata-only,
and offline. No live traffic, identity data, or raw content.

## Files

| Path                                   | What it is                                                              |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `meta-set/metadata-set.json`           | Committed synthetic metadata-only reference set (hash-bound).           |
| `meta-set/metadata-set-manifest.json`  | Expected decision + distinct-family count for the set.                  |
| `meta-set/detector-config.json`        | Frozen detector identity: threshold rule, decision function, digests.   |
| `result/expected-detector-result.json` | The detector's reproduced output over the committed set.                |
| `result/attestation.json`              | Signed attestation (decision + bindings + rendered prose + non-claims). |
| `result/attestation.signature.json`    | Ed25519 signature sidecar over the canonical attestation.               |
| `self-proof/self-proof-results.json`   | 11-fixture benign-silence falsification harness output.                 |
| `keys/stage3t-public-key.json`         | Public key only (private key never committed).                          |
| `keys/fingerprint.txt`                 | Public key fingerprint.                                                 |
| `evidence-hashes.json`                 | Byte-hash manifest of the evidence (computed after formatting).         |

## Reproduce it yourself

```bash
node tools/simurgh-extraction/simurgh-extraction.mjs verify        # detector reproduces
node tools/simurgh-extraction/simurgh-extraction.mjs verify-hashes # evidence frozen
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce  # signature + bindings + reproduce
```

Public key fingerprint:
`sha256:886c2d2ae116da0a0d80a0242057462fc38b1187c6d241679244507c04228033`.
