# Stage 3U — Red-Team-Hardened Capability-Extraction Attestation

> **Crown.** Stage 3U proves capability-extraction attestation can harden under red-team
> pressure: benign heavy-use patterns no longer escalate through volume alone, metadata-only
> fields are grammar-enforced, and the signed detector-v2 result still reproduces offline.

> **Final sign-off.** Stage 3U does not claim perfect extraction detection, attacker intent,
> attribution, or prevention. It proves that red-team-discovered false-fire and
> metadata-smuggling weaknesses were converted into a frozen detector-v2 identity,
> grammar-enforced metadata validation, regression self-proof fixtures, and signed evidence
> that reproduces offline.

> **One line.** The detector now has brakes under pressure, not just a horn.

## Why 3U exists

A red-team sweep of the Stage 3T attestation core ran tamper, key-swap, meta-set-swap,
canonical-laundering, digest-collision, cross-stage-replay, self-proof-mutation, and
policy-drift attacks. **The VCA trust root held on every one.** Two real weaknesses were
found — both in detector semantics and metadata validation, not in the cryptographic spine:

- **A10 (HIGH):** detector v1 let `volume` act as an independent corroborating family, so
  benign heavy use false-fired (`structural + volume`, `targeting + volume`,
  `behavioural + volume` → extraction). Normal power-user behaviour (shared boilerplate
  template; single-capability workload; burst window) tripped it.
- **A9 (MEDIUM):** `validateMetaSet` whitelisted field _names_ but accepted arbitrary
  free-text in allowed string fields, so raw payloads could hide in a tag.

3U converts both into frozen, signed, reproducible evidence — without touching any Stage 3T
code or evidence (the v1-freeze guard proves 3T still reproduces).

## The fixes

**A10 → strong vs contextual families.** Families are split: STRONG = {structural,
behavioural, targeting, coordination}; CONTEXTUAL = {volume}. `extraction_pattern_observed`
now requires **≥2 distinct STRONG families**. Volume can raise review context but never
corroborates.

```
0 strong, 0 contextual  → no_pattern_observed
0 strong, ≥1 contextual → single_signal_observed   (review context)
1 strong, any contextual→ single_signal_observed
≥2 strong, any          → extraction_pattern_observed
```

| Pattern                  | v1 (3T)    | v2 (3U)    |
| ------------------------ | ---------- | ---------- |
| structural + volume      | extraction | **single** |
| targeting + volume       | extraction | **single** |
| behavioural + volume     | extraction | **single** |
| structural + behavioural | extraction | extraction |
| targeting + coordination | extraction | extraction |

**A9 → metadata grammar.** Every field matches a strict enum/regex (`run_id` `^s3u_run_[0-9]{3}$`,
hashes `^sha256:[0-9a-f]{64}$`, `task_family`/`capability_tag`/token-bucket enums,
`time_bucket` `^bucket_[0-9]{3}$`, booleans). Payloads in tags, invalid hashes, and full
timestamps are rejected. Metadata-only is now enforced as a grammar, not a convention.

## The honest limit (R1)

3U fixes the **volume false-fire class only.** It does **not** make benign heavy use safe
in general: a benign mono-task power user with a shared template still presents
`structural + targeting` = two strong families → `extraction_pattern_observed`. This is
named in the attestation `known_limitations[]`, asserted by a self-proof fixture
(`strong-plus-strong-benign-collision`, which _expects_ extraction), and stated here. We do
not hide the boundary; we sign it.

A second red-team round (round 2) hit the v2 hardening directly. The crypto core held again
and the self-proof was confirmed to have teeth (reintroducing volume-as-strong made it fail
with 3 escalations). Two residual limitations are now named in `known_limitations[]`:

- **R2-A (breadth):** the limitation above is broad — ANY two strong families can co-occur
  in benign heavy use (researcher CoT+task, developer template+task, CoT+template), not just
  the mono-task+template case.
- **R2-B (hash slots):** the metadata grammar bounds hash fields to sha256 _shape_, not
  authenticity. A verifier without the preimage cannot confirm a hash is a real digest, so
  each hash field is an opaque 256-bit slot. A9's grammar closes free-text-in-tags; in a real
  deployment the gateway (not the client) must compute these hashes.

A round-2 robustness nit was also fixed: `verifyExtractionV2` now returns `ok:false` on a
malformed attestation (missing `red_team_hardening`/`non_claims`/`known_limitations`) instead
of throwing.

## Architecture (additive)

New v2 modules sit beside the frozen 3T modules in `tools/simurgh-extraction/`
(`signalFamiliesV2`, `metadataGrammar`, `metaSetV2`, `detectorV2`, `rendererV2`,
`selfProofV2`, `simurgh-extraction-v2`, `sign-3u-attestation`,
`verify-stage3u-attestation`); only `canonicalise.mjs` is reused. Detector identity:
`stage3u_extraction_detector_v2` (previous: `stage3t_frozen_detector_v1`). Changing the
threshold, family-strength split, or grammar requires a new id.

The attestation binds **both** the main extraction result and the A10 regression result, so
the verifiable claim includes "the A10 regression set no longer escalates."

## Verification

- `npm test` green incl. the new extractionV2 suite; **3T still reproduces** (`verify-stage3t --reproduce`).
- Pure v2 libs (`signalFamiliesV2`, `metadataGrammar`, `metaSetV2`, `detectorV2`,
  `rendererV2`, `selfProofV2`) at **100% function coverage** + targeted branch tests for the
  grammar-rejection throw paths.
- `scripts/smoke-llm-shield-stage3u.sh` — build / verify / verify-hashes /
  verify-attestation `--reproduce` / policy-drift / **v1-freeze** / privacy / consistency /
  security, all PASS.
- Main set → `extraction_pattern_observed` across 3 strong families (no volume); A10
  regression set → `single_signal_observed`.

Stage 3U public key fingerprint:
`sha256:2b990056b174eb69211181fcc473b4aed987203565ac1a16d217871e3ab31dd1`.
