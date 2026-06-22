# Stage 3U evidence — Red-Team-Hardened Capability-Extraction Attestation

> Stage 3U does not claim perfect extraction detection, attacker intent, attribution, or
> prevention. It proves that red-team-discovered false-fire and metadata-smuggling
> weaknesses were converted into a frozen detector-v2 identity, grammar-enforced metadata
> validation, regression self-proof fixtures, and signed evidence that reproduces offline.

All data here is **synthetic** (`set_provenance: "synthetic_reference"`), metadata-only,
grammar-enforced, and offline. No live traffic, identity data, or raw content. Synthetic
hashes are `sha256Hex(canonicalJson(label))` — never human-readable fakes.

## Files

| Path                                       | What it is                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `meta-set/metadata-set-v2.json`            | Main synthetic set → `extraction_pattern_observed` (≥2 strong, no volume). |
| `meta-set/redteam-a10-regression-set.json` | A10 regression set (shared template + volume) → `single_signal_observed`.  |
| `meta-set/detector-config.json`            | Frozen detector v2 identity: threshold, family strength, digests.          |
| `meta-set/metadata-grammar.json`           | Human-readable mirror of the grammar (binding digest in config).           |
| `result/expected-detector-result-v2.json`  | Main detector result.                                                      |
| `result/redteam-regression-result.json`    | A10 regression detector result.                                            |
| `result/attestation.json`                  | Signed attestation (binds both result digests + red_team_hardening).       |
| `result/attestation.signature.json`        | Ed25519 signature sidecar.                                                 |
| `comparison/*.json`                        | v1 false-fire classes vs v2 hardening summary.                             |
| `self-proof/self-proof-results.json`       | Falsification harness output (A10/A9 regressions + limitation).            |
| `keys/stage3u-public-key.json`             | Public key only (private key never committed).                             |
| `evidence-hashes.json`                     | Byte-hash manifest (computed after formatting).                            |

## Reproduce it yourself

```bash
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify        # both detector results reproduce
node tools/simurgh-extraction/simurgh-extraction-v2.mjs verify-hashes # evidence frozen
node tools/simurgh-extraction/verify-stage3u-attestation.mjs --reproduce  # signature + bindings + reproduce
node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce  # Stage 3T (v1) still reproduces
```

The README intentionally describes the hardening in plain terms (it does not name
attackers); machine artifacts carry no accusatory wording.

Public key fingerprint:
`sha256:2b990056b174eb69211181fcc473b4aed987203565ac1a16d217871e3ab31dd1`.
