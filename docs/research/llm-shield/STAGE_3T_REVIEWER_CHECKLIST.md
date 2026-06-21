# Stage 3T — Reviewer Checklist

Tick each before approving.

## Scope & posture

- [ ] Tooling-only: zero `src/llmShield` change (`stage3t policy-drift: PASS`).
- [ ] Offline: no gateway run, no network, no live traffic, no identity data.
- [ ] Reference threat (named labs) appears ONLY in explanatory docs — never in
      `metadata-set.json`, `expected-detector-result.json`, `attestation.json`, renderer
      prose, or `self-proof-results.json`.

## The sacred non-claim

- [ ] Present verbatim in the renderer output and the attestation `non_claims[]`:
      _"A detector match is not an accusation. It is a reproducible metadata-pattern result
      for manual review."_

## Privacy / metadata-only

- [ ] `set_provenance: "synthetic_reference"`, `live_traffic_used/identity_data_used/
  raw_content_used` all `false`.
- [ ] No raw prompts/outputs, IPs, emails, account IDs, full timestamps, API keys, or
      chain-of-thought text in any evidence file (`stage3t privacy: PASS`).

## Detector integrity

- [ ] Decision counts **distinct families**, not booleans.
- [ ] Threshold (≥2) and family map are part of `detector_id`; changing either needs a new
      id (`threshold_change_requires_new_detector_id: true`).
- [ ] Benign-heavy and single-phenomenon fixtures do NOT escalate (self-proof counters all
      `0`).

## Reproducibility & signature

- [ ] `verify-stage3t-attestation.mjs --reproduce` prints all checks true, including
      `detector_result_reproduces`, `attestation_reproduces`, `self_proof_passes`.
- [ ] `meta_set_digest_binding` and `detector_id_binding` true.
- [ ] Only the public key is committed; no `.pem` in the repo.

## Coverage

- [ ] Pure libs at 100% function coverage; full `npm test` green.
