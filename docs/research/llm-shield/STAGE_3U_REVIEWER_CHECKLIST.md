# Stage 3U — Reviewer Checklist

## Scope & posture

- [ ] Tooling-only: zero `src/llmShield` change (`stage3u policy-drift: PASS`).
- [ ] Additive: no Stage 3T v1 module or `stage-3t/` evidence changed; 3T still reproduces
      (`stage3u v1-freeze: PASS` + `verify-stage3t --reproduce`).
- [ ] Offline: no gateway run, no network, no live traffic, no identity.
- [ ] Reference threat (named labs) appears ONLY in explanatory docs — never in evidence.

## A10 fix (volume contextual)

- [ ] `extraction_pattern_observed` requires ≥2 STRONG families; volume is contextual.
- [ ] A10 regression set → `single_signal_observed`; `single_strong_plus_volume_escalations: 0`.

## A9 fix (metadata grammar)

- [ ] Every string field matches a strict enum/regex; payloads/invalid hashes/timestamps rejected.
- [ ] `METADATA_GRAMMAR` deep-frozen (rules + enum arrays).

## The sacred non-claim

- [ ] Present verbatim in renderer output + attestation `non_claims[]`:
      _"A detector match is not an accusation. It is a reproducible metadata-pattern result for manual review."_

## Documented limitation (honesty)

- [ ] `known_limitations[]` includes `benign_mono_task_plus_shared_template_can_present_two_strong_families`.
- [ ] `strong-plus-strong-benign-collision` fixture exists and _expects_ extraction (not a failure).

## Identity & reproducibility

- [ ] `detector_id = stage3u_extraction_detector_v2`, `previous_detector_id = stage3t_frozen_detector_v1`.
- [ ] Threshold / family-strength / grammar changes require a new id (config locks).
- [ ] `verify-stage3u-attestation.mjs --reproduce` → all checks true (both result digests bound, both reproduce, self-proof passes, attestation byte-identical).
- [ ] Only the public key committed; no `.pem` in the repo.

## Coverage

- [ ] Pure v2 libs at 100% function coverage + targeted branch tests for grammar throws; full `npm test` green.
