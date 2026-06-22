# Stage 3U — Red-Team-Hardened Capability-Extraction Attestation — Design

**Status:** Approved (design) — 2026-06-22
**Tag target:** v2.4.0
**Branch (to create at execution):** `main-stage-3u-red-team-hardened-extraction-attestation`
**Stage type:** tooling-only red-team hardening stage

## Crown sentence

> Stage 3U proves capability-extraction attestation can harden under red-team pressure:
> benign heavy-use patterns no longer escalate through volume alone, metadata-only fields
> are grammar-enforced, and the signed detector-v2 result still reproduces offline.

## Final sign-off sentence (verbatim in README + closeout)

> Stage 3U does not claim perfect extraction detection, attacker intent, attribution, or
> prevention. It proves that red-team-discovered false-fire and metadata-smuggling
> weaknesses were converted into a frozen detector-v2 identity, grammar-enforced metadata
> validation, regression self-proof fixtures, and signed evidence that reproduces offline.

## One-line identity

> The detector now has brakes under pressure, not just a horn.

---

## 1. Why 3U exists — the red-team findings

A red-team sweep of the 3T attestation core ran tamper, key-swap, meta-set-swap,
canonical-laundering, digest-collision, cross-stage-replay, self-proof-mutation, and
policy-drift attacks. **The VCA trust root held on every one.** Two real weaknesses were
found — both in detector semantics and metadata validation, not in the cryptographic spine:

- **A10 (HIGH):** detector v1 let `volume` act as an independent corroborating family, so
  benign heavy use false-fired: `structural + volume → extraction_pattern_observed` and
  `targeting + volume → extraction_pattern_observed`. Those occur in normal power-user
  behaviour (shared boilerplate template; single-capability workload; burst window). This
  did not break the attestation; it broke the strength of the benign-silence story.
- **A9 (MEDIUM):** `validateMetaSet` whitelisted field *names* but accepted arbitrary
  free-text inside allowed string fields (`task_family`, `capability_tag`, `*_bucket`,
  `time_bucket`), so raw prompt-like payloads could hide inside a tag while passing schema
  validation. Metadata-only was a convention, not a grammar.

3U converts both into frozen, signed, reproducible evidence.

## 2. The honest scope of the A10 fix (R1 — load-bearing)

3U fixes the **volume false-fire class only.** It does **NOT** make benign heavy use safe
in general. A benign mono-task power user with a shared template can still present two
*strong* families — e.g. a developer who always codes with one boilerplate trips
`structural` (template cluster) + `targeting` (capability dominance) = 2 strong families →
`extraction_pattern_observed`, with no volume involved.

Therefore the 3U claim is precisely *"volume can no longer act as a corroborating family"*
— never *"benign heavy use no longer escalates."* This limitation is named explicitly in
the attestation `known_limitations[]`, the README, and the closeout. Naming it ourselves is
the credibility move; hiding it would re-earn the A10 critique under a new number.

## 3. Invariants (each a gate)

1. **Tooling-only / policy-drift:** zero `src/llmShield/**` change, fail-closed,
   three-dot base. (CI `fetch-depth: 0` already in place.) Continues the 3M/3N/3O/3P/3Q/
   3S/3T tooling pattern; 3R remains the deliberate gateway-security exception.
2. **Additive invariant (R2):** Stage 3U is additive. It MUST NOT modify any Stage 3T (v1)
   module or any Stage 3T evidence artifact. Detector v1 remains reproducible as historical
   evidence (`verify-stage3t --reproduce` must still pass); detector v2 produces new Stage
   3U evidence under a new detector identity. The only v1 code reused as-is is
   `canonicalise.mjs`. A new `rendererV2.mjs` is required because v2 distinguishes strong
   from contextual families and the prose must expose that distinction.
3. **Detector identity invariant:** `DETECTOR_ID = "stage3u_extraction_detector_v2"`,
   `previous_detector_id = "stage3t_frozen_detector_v1"`. Changing the family map, family
   strength classification, threshold rule, decision function, metadata grammar, or signal
   thresholds requires a new detector id. No silent mutation, no post-hoc tuning.
4. **Offline / deterministic:** no gateway run, no network, no live traffic, no identity.
5. **Metadata grammar invariant:** every string field matches a strict enum or regex;
   payload-like text in allowed fields is rejected. Metadata-only is enforced as a grammar.
6. **Non-claim invariant + sacred sentence (verbatim in attestation `non_claims[]`,
   renderer, README, reviewer checklist, release notes):**
   > A detector match is not an accusation. It is a reproducible metadata-pattern result
   > for manual review.
7. **No named labs in machine artifacts / evidence outputs** — named third-party labs may
   appear only in explanatory documentation when discussing the public reference threat.
8. **Red-team regression invariant:** the exact A10 and A9 failures become permanent
   self-proof fixtures; a future detector cannot regress without a gate failing.
9. **Synthetic-hash invariant (R/edit-3):** every `sha256:`-prefixed field in v2 evidence
   is generated deterministically from a stable label via `sha256Hex(canonicalJson(label))`
   (or a fixed local helper). No human-readable synthetic hash labels (e.g.
   `sha256:synthetic_actor_a`) are allowed — they would fail the v2 grammar
   `^sha256:[0-9a-f]{64}$` and undermine the A9 fix.
10. **Byte-reproducibility invariant (R/edit-4):** Stage 3U evidence artifacts MUST NOT
    contain generated timestamps, hostnames, usernames, absolute local paths, or any
    environment-dependent value. Any such field breaks byte-reproducibility (the verifier
    requires the attestation to regenerate byte-identically) and is out of scope.

---

## 4. Detector v2 — strong vs contextual families

| Family       | Strength       | Member signals                              |
| ------------ | -------------- | ------------------------------------------- |
| structural   | **strong**     | repetition_cluster, template_prefix_cluster |
| behavioural  | **strong**     | cot_elicitation                             |
| targeting    | **strong**     | capability_targeting, task_taxonomy_repeat  |
| coordination | **strong**     | hydra_cluster                               |
| volume       | **contextual** | volume_burst, high_request_count            |

`volume` is contextual because high volume is common in benign heavy use (CI jobs, batch
workflows, translators, researchers, accessibility flows). It can raise review *context*
but can never independently corroborate extraction.

Signal-matching thresholds are unchanged from 3T (frozen constants: CLUSTER_MIN 3,
DOMINANCE 0.6, COT_MAJORITY 0.5, VOLUME_BURST_FRACTION 0.6, HIGH_REQUEST_COUNT 10,
HYDRA_MIN_ACTORS 3). Only the *decision* changes.

### Total decision function (frozen, versioned)

```
0 strong, 0 contextual            → no_pattern_observed          (claim: none)
0 strong, ≥1 contextual           → single_signal_observed       (claim: manual_review_only)
1 strong, any contextual          → single_signal_observed       (claim: manual_review_only)
≥2 strong, any contextual         → extraction_pattern_observed  (claim: manual_review_recommended)
```

`extraction_pattern_observed` requires **≥2 distinct STRONG families**. Volume never counts
toward the extraction threshold.

| Pattern                          | v1 (3T)   | v2 (3U)       |
| -------------------------------- | --------- | ------------- |
| volume only                      | single    | single        |
| structural only                  | single    | single        |
| structural + volume              | extraction| **single**    |
| targeting + volume               | extraction| **single**    |
| behavioural + volume             | extraction| **single**    |
| structural + behavioural         | extraction| extraction    |
| targeting + coordination         | extraction| extraction    |
| behavioural + targeting + volume | extraction| extraction    |

---

## 5. Components (additive, in `tools/simurgh-extraction/`)

Pure libs gated at 100% function coverage + targeted branch tests for throw paths (R3);
CLI/sign/verify exercised by subprocess smoke.

- **`signalFamiliesV2.mjs`** — `FAMILY_MAP_V2` (deep-frozen), `FAMILY_ORDER_V2`,
  `STRONG_FAMILIES`/`CONTEXTUAL_FAMILIES` (frozen sets), `familyMapDigestV2()`,
  `signalToFamilyV2(id)`, `splitFamilies(firedSignalIds) -> {strong[], contextual[]}`
  (each sorted by FAMILY_ORDER_V2).
- **`metadataGrammar.mjs`** — `METADATA_GRAMMAR` (per-field regex/enum, deep-frozen),
  `metadataGrammarDigest()`, `validateRowGrammar(row) -> true | throws`. Field rules:
  - `run_id`: `^s3u_run_[0-9]{3}$`
  - `actor_cluster_hash` / `session_cluster_hash` / `normalized_prompt_hash` /
    `prompt_template_hash`: `^sha256:[0-9a-f]{64}$`
  - `task_family`: enum `{code_generation, data_analysis, summarisation, translation, qa,
    planning, other}`
  - `capability_tag`: enum `{tool_use, coding, reasoning, translation, summarisation,
    general}`
  - `input_tokens_bucket` / `output_tokens_bucket`: enum `{0-1k, 1k-2k, 2k-4k, 4k-8k,
    8k-plus}`
  - `time_bucket`: `^bucket_[0-9]{3}$`
  - `cot_elicitation_flag` / `tool_use_request_shape`: boolean
- **`metaSetV2.mjs`** — `META_SET_SCHEMA_V2 = "simurgh.capability_extraction.meta_set.v2"`,
  `validateMetaSetV2(set)` (provenance flags + unique run_id + `validateRowGrammar` per row,
  rejecting unknown fields and payload-in-tag), `normaliseMetaSetV2(set)`,
  `metaSetDigestV2(set)` (full-header, order-independent; `sha256Hex(canonicalJson(...))`).
- **`detectorV2.mjs`** — `DETECTOR_ID`, `PREVIOUS_DETECTOR_ID`, `THRESHOLD_STRONG = 2`,
  `matchSignalsV2(set)` (same frozen thresholds as 3T), `firedSignalIds(matched)`,
  `decideV2({strongCount}) -> {decision, attestation_claim}`, `runDetectorV2(set) ->`
  detector-result.v2 (includes `matched_strong_families`, `matched_contextual_families`,
  `strong_family_count`, `contextual_family_count`).
- **`rendererV2.mjs`** — `SACRED_NON_CLAIM`, `FORBIDDEN_WORDING`,
  `renderAttestationProseV2(result)` → prose that names strong vs contextual families and
  the *reason* for the decision (see §6), appends the sacred non-claim, throws
  `intent_language_rejected` on forbidden wording.
- **`selfProofV2.mjs`** — `runExtractionSelfProofV2()` with the fixtures in §8.
- **`simurgh-extraction-v2.mjs`** — CLI `build [--update] | hash | verify | write-hashes |
  verify-hashes` over `stage-3u/` (same determinism discipline as 3T: build/verify compare
  via `stable()`; `write-hashes` runs AFTER prettier).
- **`sign-3u-attestation.mjs`** — local-only signer, `SIMURGH_3U_PRIVATE_KEY_PATH` default
  `~/.simurgh/3u-ed25519.pem` (mode 0600, never committed); dedicated 3U key.
- **`verify-stage3u-attestation.mjs`** — `verifyExtractionV2({attestation, sidecar,
  publicKeyPem, set, detectorConfig})` two-tier (§13).

## 6. rendererV2 prose (the fix made visible)

Extraction case:
> Matched strong families: structural, behavioural. Matched contextual families: volume.
> Decision: extraction_pattern_observed because at least two strong families matched. A
> detector match is not an accusation. It is a reproducible metadata-pattern result for
> manual review.

A10 regression case:
> Matched strong families: structural. Matched contextual families: volume. Decision:
> single_signal_observed because volume is contextual and cannot independently corroborate.
> A detector match is not an accusation. It is a reproducible metadata-pattern result for
> manual review.

## 7. detector-config.json (committed, digest-bound)

```json
{
  "detector_id": "stage3u_extraction_detector_v2",
  "previous_detector_id": "stage3t_frozen_detector_v1",
  "threshold_rule": "strong_signal_families >= 2",
  "volume_role": "contextual_only",
  "decision_function": {
    "0_strong_0_contextual": "no_pattern_observed",
    "0_strong_with_contextual": "single_signal_observed",
    "1_strong_any_contextual": "single_signal_observed",
    "2_or_more_strong_any_contextual": "extraction_pattern_observed"
  },
  "family_strength": {
    "structural": "strong", "behavioural": "strong", "targeting": "strong",
    "coordination": "strong", "volume": "contextual"
  },
  "threshold_change_requires_new_detector_id": true,
  "family_strength_change_requires_new_detector_id": true,
  "metadata_grammar_change_requires_new_detector_id": true,
  "family_map_digest": "<sha256 filled by build>",
  "metadata_grammar_digest": "<sha256 filled by build>"
}
```

## 8. Self-proof fixtures (§ regression invariant)

| Fixture                                             | Expected                                            |
| --------------------------------------------------- | --------------------------------------------------- |
| benign-heavy-power-user                             | not extraction                                      |
| benign-repetition-only                              | single_signal_observed                              |
| benign-volume-only                                  | single_signal_observed                              |
| benign-targeting-only                               | single_signal_observed                              |
| **benign-template-plus-volume** (A10)               | single_signal_observed (not extraction)             |
| **benign-single-capability-plus-volume** (A10)      | single_signal_observed (not extraction)             |
| **benign-behavioural-plus-volume** (A10)            | single_signal_observed (not extraction)             |
| structural-double-count-trap                        | structural family count = 1                         |
| extraction-structural-plus-behavioural              | extraction_pattern_observed                         |
| extraction-targeting-plus-coordination              | extraction_pattern_observed                         |
| extraction-behavioural-plus-targeting-plus-volume   | extraction_pattern_observed                         |
| **strong-plus-strong-benign-collision** (R1 honesty)| extraction_pattern_observed — documents that v2 still escalates benign mono-task+template; asserts the known limitation is real, not hidden |
| **metadata-payload-in-capability-tag-rejected** (A9)| rejected                                            |
| **metadata-payload-in-task-family-rejected** (A9)   | rejected                                            |
| **metadata-payload-in-bucket-rejected** (A9)        | rejected                                            |
| **invalid-hash-value-rejected** (A9)                | rejected                                            |
| **full-timestamp-time-bucket-rejected** (A9)        | rejected                                            |
| threshold-version-lock                              | THRESHOLD_STRONG == 2 && id == v2                   |
| family-strength-version-lock                        | volume is contextual (not strong) in frozen config  |
| intent-language-rejected                            | no accusatory wording renders                       |
| duplicate-run-id-rejected                           | rejected                                            |
| decision-reproduction                               | byte-identical result twice                         |

Summary counters (all `0`, `all_passed: true`):
```json
{
  "benign_escalation_failures": 0,
  "single_family_escalations": 0,
  "single_strong_plus_volume_escalations": 0,
  "volume_corroboration_failures": 0,
  "distinct_family_double_count_failures": 0,
  "metadata_payload_acceptance_failures": 0,
  "invalid_bucket_acceptance_failures": 0,
  "invalid_hash_acceptance_failures": 0,
  "intent_claims_rendered": 0,
  "decision_reproduction_failures": 0,
  "duplicate_run_id_failures": 0,
  "all_passed": true
}
```

> Note: `strong-plus-strong-benign-collision` is the R1 honesty fixture. It is NOT a
> failure — it asserts that v2 *still* escalates a benign mono-task+shared-template set
> (structural+targeting), proving the documented limitation is faithfully reported rather
> than silently "fixed." It does not increment any failure counter.

## 9. Evidence layout — `docs/research/llm-shield/evidence/stage-3u/`

```
meta-set/{metadata-set-v2.json, redteam-a10-regression-set.json, detector-config.json, metadata-grammar.json}
result/{expected-detector-result-v2.json, redteam-regression-result.json, attestation.json, attestation.signature.json}
comparison/{v1-known-false-fire-summary.json, v2-hardening-summary.json}
self-proof/self-proof-results.json
keys/{stage3u-public-key.json, fingerprint.txt}
evidence-hashes.json
README.md
```

Two committed metadata sets: (a) **main v2 set** → `extraction_pattern_observed` with
`strong_family_count ≥ 2` (e.g. structural+behavioural+targeting, no volume needed);
(b) **red-team A10 regression set** containing benign-template-plus-volume,
benign-single-capability-plus-volume, benign-behavioural-plus-volume, volume-only-heavy —
each → `single_signal_observed`. The regression set is a proof, not a benchmark.

## 10. Signed attestation v2

`schema: "simurgh.capability_extraction.attestation.v2"`, `stage: "3U"`,
`detector_id`, `previous_detector_id`, `hardening_reason: "red_team_a10_a9"`,
`meta_set_digest`, `metadata_grammar_digest`, `family_map_digest`,
`redteam_regression_result_digest`, decision/claim, strong/contextual family arrays + counts,
`red_team_hardening{a10_volume_contextualised, a9_metadata_grammar_enforced,
benign_volume_escalations:0, metadata_payload_acceptance_failures:0}`,
`non_claims[]`, `known_limitations[]`, `rendered_summary`.

`known_limitations[]` MUST include:
```
"dilution_can_avoid_thresholds"
"synthetic_reference_set_only"
"not_a_live_gateway_detector"
"not_a_general_accuracy_benchmark"
"benign_mono_task_plus_shared_template_can_present_two_strong_families"
```

## 11. Determinism & verify

Same as 3T: detector v2 is pure + order-independent. CI verify re-runs detectorV2 over both
committed sets and byte-compares; `write-hashes` runs after prettier; build/verify compare
via `stable()` so on-disk formatting is irrelevant to them.

## 12. Two-tier verifier

**Portable:** signature valid; key fingerprint match; bundle digest match; `detector_id`
is v2 and `previous_detector_id` is v1; `meta_set_digest` / `metadata_grammar_digest` /
`family_map_digest` bindings; non_claims + sacred non-claim present; `intent_claim_made`
false; no named labs / accusatory wording.

**`--reproduce`:** re-run detectorV2 over main set → byte-match `expected-detector-result-v2`;
re-run over regression set → byte-match `redteam-regression-result`; re-run self-proof →
all counters 0; attestation regenerates byte-identically.

## 13. Audits + check.sh + coverage (R3)

- `scripts/{security,privacy,consistency}-audit-llm-shield-stage3u.mjs`,
  `policy-drift-guard-llm-shield-stage3u.sh`, `smoke-llm-shield-stage3u.sh`.
- **v1-freeze guard** (`scripts/v1-freeze-guard-llm-shield-stage3u.sh`, wired into the
  smoke + check.sh): FAILS if any Stage 3T v1 module
  (`tools/simurgh-extraction/{metaSet,signalFamilies,detector,renderer,selfProof,
  simurgh-extraction,sign-3t-attestation,verify-stage3t-attestation}.mjs`) changed in the
  branch range, or if any `docs/research/llm-shield/evidence/stage-3t/**` artifact changed;
  and runs `node tools/simurgh-extraction/verify-stage3t-attestation.mjs --reproduce` to
  prove the 3T historical evidence still verifies. Protects the "we did not rewrite
  history" claim. (Same three-dot base resolution as the policy-drift guard.)
- Security audit scopes the accusatory-word scan to **machine artifacts (.json)**; named
  third-party labs are forbidden in machine artifacts and evidence outputs and may appear
  only in explanatory documentation when discussing the public reference threat; sacred
  non-claim present; `single_strong_plus_volume_escalations` must be 0.
- Privacy audit: forbidden raw tokens + email regex + provenance flags + grammar validates.
- Consistency audit: all digests re-derive; both detector results reproduce; signature
  verifies.
- `check.sh`: add 3U smoke + 3U helper-coverage steps after the 3T helper-coverage step.
- Coverage: **100% function coverage on pure helpers + targeted branch tests for the
  grammar-rejection throw paths.** Never state "100% coverage" unqualified.

## 14. Out of scope (deliberate)

Live gateway/telemetry integration; production abuse monitoring; identity correlation;
account-level enforcement; general FP/FN benchmark; adaptive-evasion resistance;
multi-set campaign registry. **The external OSS-defense reproduction run is Stage 3V, not 3U.**
