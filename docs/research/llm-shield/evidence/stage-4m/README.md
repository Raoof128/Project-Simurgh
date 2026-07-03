# Stage 4M / VXD — Evidence

_AnthropicSafe First, then ReviewerSafe._ Carries the 4L non-claims
(`not_sybil_closure`, `not_structuring_closure_without_provider_binding`).

Verifiable eXternal Disclosure: signed merge-only cluster-graph evolution + retroactive
re-scoring (anti-monotonicity lemma) + disclosure binding + respondent contest path + Article-73
projection, all offline and tier-aware. Synthetic fixtures only.

## Contents

- `verify-stage4m.html` — the single-file offline browser verifier. Drag a bundle's `.json`
  files onto the page, paste the pinned signer key (`vxd-signer.pub`), pick a tier, click verify.
  No network, no upload, no framework. Byte-generated from the `core/` modules; its digest is
  recorded in the closeout and its determinism is gated by `browserParity.test.js`.
  sha256 `76860c0b7a0542610d7ad7adb3fd940d944e139e5c1f83db774c18249ad8a445`.

## Bundle layout (`tests/fixtures/llmShield/stage4m/bundles/<name>/`)

`windows.json`, `merge-events.json`, `rescore-records.json`, `disclosure.json`, `chain.json`,
`contest.json`, `contest-ack.json`, `respondent-clusters.json`, `article73-projection.json`,
`vxd-attestation.json`, `vxd-manifest.json`. Top level: `vxd-signer.pub`,
`respondent-signer.pub`, `expected-results/vxd-matrix.json`.

## Audience tiers

- **Tier P (public):** the attestation (roots + aggregates) + chain + disclosure + manifest. Run
  `verify-stage4m.mjs --tier p`; ledger-level checks report `not_in_tier`.
- **Tier A (auditor):** the full bundle. Every Tier-P root recomputes from the ledgers.
- **Tier R (respondent):** seeded (sorted-leaf Merkle roots); slice machinery is the follow-up
  stage.

## Reproduce (Node 26)

```
bash scripts/reproduce-llm-shield-stage4m.sh
```

ALL GREEN, exit 0, byte-idempotent, clean tree after. To run the browser verifier: open
`verify-stage4m.html` in any browser (offline), drop a bundle, paste `vxd-signer.pub`.
