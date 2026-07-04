# Stage 4N — Extraction Seismograph: public evidence

> **Motto.** AnthropicSafe First, then ReviewerSafe.

This directory is the **public** side of the Stage 4N heartbeat — everything a third party
needs to recompute the verdict offline, and nothing that would leak linkable disclosure
material.

| Artifact | What it is |
| --- | --- |
| `genesis-policy.json` | The signed cadence + band + reveal-delay policy. All expected-record and leakage math derives from this alone. |
| `heartbeat-feed.jsonl` | The single append-only chain: 7 heartbeats + 5 delayed aggregate reveals (12 records) at `as_of = synthetic-0006`. |
| `stage4n-attestation.json` | Binds `as_of_window`, the genesis-policy digest, the feed root, the chain-head digest, record counts, and the 4K/4L/4M source roots. |
| `heartbeat-manifest.json` | Ed25519 signature over the attestation digest (domain-separated), plus the public-key fingerprint. |

Verify offline (no private key):

```bash
node tools/simurgh-attestation/stage4n/node/verify-stage4n.mjs \
  --feed docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl \
  --policy docs/research/llm-shield/evidence/stage-4n/genesis-policy.json \
  --as-of synthetic-0006 --out /tmp/stage4n-report.json
# -> exit 0, report rawCode 0
```

The public key is committed at `tests/fixtures/llmShield/stage4n/seismograph-signer.pub`;
the private key is never in the repo.

## Why there are no inclusion proofs here

Inclusion proofs are **bilateral** (`inclusion_proofs_are_bilateral_not_public`). They
travel inside 4M Tier-P/A/R bundles and are verified by the recipient *against* this public
feed. Publishing one would reveal that a Tier-R (respondent-facing) disclosure existed for a
given window — an audience-tier linkability leak. Gate Q16 fails any public artifact that
carries `proof_path`, `bundle_tier`, or `respondent_id_digest`, so their absence here is
enforced, not incidental.
