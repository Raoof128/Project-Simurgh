# Stage 3T — Offline Capability-Extraction Pattern Attestation — Design

**Status:** Approved (design) — 2026-06-22
**Tag target:** v2.3.0
**Branch (to create at execution):** `main-stage-3t-offline-capability-extraction-attestation`

## Crown sentence

> Stage 3T proves that capability-extraction-shaped traffic can be attested without
> live traffic or intent claims: a frozen detector is re-run over a committed synthetic
> metadata-only set, distinct signal-family decisions reproduce byte-for-byte, and
> benign-silence fixtures prove the detector has brakes, not just a horn.

## Final sign-off sentence (use verbatim in README + closeout)

> Stage 3T does not detect attackers, prove intent, or confirm distillation. It proves
> that a frozen detector can be re-run over a committed synthetic metadata-only set to
> reproduce extraction-pattern decisions byte-for-byte, while benign-silence fixtures
> show that single phenomena do not escalate into findings.

## Reference threat vs attested claim (keep these distinct)

- **Reference threat:** Anthropic-style capability-extraction / distillation-abuse
  campaigns (Feb 2026 disclosure: DeepSeek/Moonshot/MiniMax, ~24,000 fraudulent
  accounts, >16M Claude exchanges; detection via behavioural fingerprints and
  coordinated-traffic patterns).
- **Attested claim:** a deterministic extraction-pattern match over a metadata-only
  reference set, reproducible byte-for-byte by any third party.

3T uses "distillation-style" only as the reference threat, never as the claim.

## Where 3T sits on the ladder

```
3R: fallback suspicion cannot become bypass        (deliberate gateway-security-path change)
3S: narrative generation cannot become unsupported claims
3T: extraction suspicion cannot become unverifiable accusation
```

3T returns to the tooling-only attestation pattern used by 3M, 3N, 3O, 3P, 3Q, and 3S,
while 3R remains the deliberate gateway-security-path exception.

---

## Scope statement (reviewer-safe wording)

> Stage 3T is a tooling-only, offline attestation stage. It does not process live traffic
> and does not modify the gateway. It uses a committed synthetic metadata-only reference
> set to prove that a frozen detector and total decision function can be re-run by third
> parties to reproduce capability-extraction-pattern decisions exactly. In production,
> equivalent metadata fields could be emitted by gateway telemetry, but that deployment
> integration is explicitly out of scope.

## Invariants (each is a gate)

1. **Tooling-only / policy-drift:** zero `src/llmShield/**` change. Fail-closed policy-drift
   guard. (CI now checks out with `fetch-depth: 0`, so the guard resolves a real base ref
   and verifies the branch range for real — no warn-pass degradation.)
2. **Offline / no gateway:** no gateway run, no live traffic, no network, no identity data.
3. **Metadata-only wall:** forbidden tokens — raw prompts, raw outputs, IP addresses,
   emails, account IDs, full timestamps, API keys, provider secrets, chain-of-thought
   text. Enforced by a privacy-audit scan over all stage-3t evidence (3S-style).
4. **Non-claim wall:** no intent, no attribution, no "distillation confirmed", no
   complete-prevention claim. Forbidden accusatory vocabulary rejected by the renderer
   and the security audit.
5. **Sacred non-claim (verbatim):**
   > A detector match is not an accusation. It is a reproducible metadata-pattern result
   > for manual review.

   This sentence appears in: this spec, the renderer output, the attestation
   `non_claims[]`, and the reviewer checklist.
6. **Production deferred (out-of-scope invariant):**
   > Production telemetry integration is deferred. Stage 3T proves the detector and
   > attestation contract offline before any gateway telemetry fields are added.
7. **Frozen-decision invariant:** the threshold and family map are part of the detector
   identity; changing either requires a new `detector_id`. No post-hoc tuning.
8. **Determinism invariant:** the detector is order-independent; re-running it over the
   committed set reproduces the result byte-for-byte regardless of input row ordering.

---

## Falsifiability model (the core of 3T)

3T attests a **judgment about traffic** (a detector decision) — the most overclaim-prone
artifact class on the ladder. It is grounded as:

- **Base:** frozen detector re-run. The attestation states "detector `vN`, re-run over this
  committed hash-bound metadata-only set, produced these exact signal-family matches and
  this exact total decision." A verifier re-runs the detector and must reproduce them
  byte-for-byte. Falsifiable = deterministic recomputation. Intent never claimed.
- **Decision wall (dual-family):** `extraction_pattern_observed` requires firing in **≥2
  distinct signal families**, never 2 raw booleans — so a single phenomenon cannot
  masquerade as corroboration.
- **Benign-silence self-proof:** a falsification harness (NOT an FP/FN benchmark) proving
  the detector stays silent on benign-heavy traffic and single phenomena. We do not claim
  general detector quality; we prove the decision machinery behaves honestly on known
  edge cases.

The labelled-corpus FP/FN benchmark posture is **explicitly out of scope** for the
attestation basis: it would turn 3T into a "we built a better detector" claim, off-crown.
Only the *silence* half survives, as the self-proof above.

---

## Signal families (frozen map; `family_map_digest` part of detector identity)

| Family           | Example member signals                                    |
| ---------------- | -------------------------------------------------------- |
| **Structural**   | repeated normalized-prompt-hash cluster, template-prefix cluster |
| **Behavioural**  | CoT-elicitation flag, answer-format harvesting shape     |
| **Targeting**    | narrow-capability concentration, repeated task taxonomy  |
| **Coordination** | hashed actor cluster, multi-session hydra shape          |
| **Volume**       | burst time-bucket, high request-count bucket             |

Decision uses `distinct_signal_families` (count of families with ≥1 firing member),
NOT `matched_boolean_count`.

## Total decision function (frozen, versioned)

```
0 distinct families  → decision: no_pattern_observed          attestation_claim: none
1 distinct family    → decision: single_signal_observed       attestation_claim: manual_review_only
≥2 distinct families → decision: extraction_pattern_observed  attestation_claim: manual_review_recommended
```

`decision` and `attestation_claim` are both part of the frozen output and are reproduced
byte-for-byte by the verifier.

---

## Components

Pure libraries are gated at 100% function coverage; CLI/sign/verify are exercised by the
smoke + E2E (honest subprocess coverage). All under `tools/simurgh-extraction/`.

### `metaSet.mjs`
- `META_SET_SCHEMA = "simurgh.capability_extraction.meta_set.v1"`.
- `validateMetaSet(set)` — asserts `set_provenance:"synthetic_reference"`,
  `live_traffic_used:false`, `identity_data_used:false`, `raw_content_used:false`, and
  that every row carries only allowed metadata-only fields (no forbidden tokens).
- `metaSetDigest(set)` — canonical row sort (by `run_id`) → `canonicalJson` → `sha256Hex`
  (prefix `sha256:`). Order-independent.
- Row shape (all synthetic, metadata-only):
  ```json
  {
    "run_id": "s3t_run_001",
    "actor_cluster_hash": "sha256:synthetic_actor_a",
    "session_cluster_hash": "sha256:synthetic_session_a",
    "normalized_prompt_hash": "sha256:...",
    "prompt_template_hash": "sha256:...",
    "task_family": "code_generation",
    "capability_tag": "tool_use",
    "input_tokens_bucket": "1k-2k",
    "output_tokens_bucket": "2k-4k",
    "time_bucket": "bucket_001",
    "cot_elicitation_flag": true,
    "tool_use_request_shape": false
  }
  ```
- Set header:
  ```json
  {
    "type": "simurgh.capability_extraction.meta_set.v1",
    "set_id": "stage3t_reference_set",
    "set_provenance": "synthetic_reference",
    "live_traffic_used": false,
    "identity_data_used": false,
    "raw_content_used": false,
    "runs": [ ... ]
  }
  ```

### `signalFamilies.mjs`
- `FAMILY_MAP` — frozen object mapping family → member-signal ids (the five families above).
- `familyMapDigest()` — `sha256Hex(canonicalJson(FAMILY_MAP))`.
- `distinctFamilies(matchedSignals)` — given the set of fired signal ids, returns the set
  of distinct families.

### `detector.mjs`
- `DETECTOR_ID = "stage3t_frozen_detector_v1"`.
- `matchSignals(set)` — deterministic per-set signal evaluation producing
  `matched{ <signal_id>: bool }` (e.g., `repetition_cluster`, `template_prefix_cluster`,
  `cot_elicitation`, `capability_targeting`, `task_taxonomy_repeat`, `hydra_cluster`,
  `volume_burst`). Pure functions of the committed metadata (cluster thresholds frozen in
  `detector-config.json`).
- `decide(distinctFamilyCount)` — total function → one of the three decisions.
- `runDetector(set)` → `detector-result.json` shape:
  ```json
  {
    "type": "simurgh.capability_extraction.detector_result.v1",
    "detector_id": "stage3t_frozen_detector_v1",
    "meta_set_digest": "sha256:...",
    "matched": { "repetition_cluster": true, "cot_elicitation": true, "hydra_cluster": false, "capability_targeting": true, "volume_burst": false },
    "distinct_family_count": 3,
    "matched_families": ["structural", "behavioural", "targeting"],
    "decision": "extraction_pattern_observed",
    "attestation_claim": "manual_review_recommended",
    "non_claims": ["no_intent_claim", "no_attribution_claim", "no_complete_distillation_prevention_claim", "metadata_only", "match_is_not_accusation"]
  }
  ```

### `detector-config.json` (committed, digest-bound)
```json
{
  "detector_id": "stage3t_frozen_detector_v1",
  "threshold_rule": "distinct_signal_families >= 2",
  "decision_function": {
    "0": "no_pattern_observed",
    "1": "single_signal_observed",
    "2_or_more": "extraction_pattern_observed"
  },
  "family_map_digest": "sha256:...",
  "threshold_change_requires_new_detector_id": true
}
```

### `selfProof.mjs`
Falsification harness with the required fixtures and summary counters.

| Fixture                                  | Expected outcome                                          |
| ---------------------------------------- | -------------------------------------------------------- |
| `benign-heavy-power-user`                | `no_pattern_observed` or at most `single_signal_observed` |
| `benign-repetition-only`                 | `single_signal_observed`, not extraction                 |
| `benign-volume-only`                     | `single_signal_observed`, not extraction                 |
| `benign-targeting-only`                  | `single_signal_observed`, not extraction                 |
| `structural-double-count-trap`           | structural family count = 1, not 2                       |
| `extraction-structural-plus-behavioural` | `extraction_pattern_observed`                            |
| `extraction-targeting-plus-coordination` | `extraction_pattern_observed`                            |
| `threshold-version-lock`                 | changing threshold changes detector id or fails          |
| `intent-language-rejected`               | no accusatory/attribution/intent wording renders         |

Summary:
```json
{
  "benign_escalation_failures": 0,
  "single_family_escalations": 0,
  "distinct_family_double_count_failures": 0,
  "intent_claims_rendered": 0,
  "decision_reproduction_failures": 0,
  "all_passed": true
}
```

### `renderer.mjs`
- `renderAttestationProse(detectorResult)` — emits review-oriented prose from the decision
  only. Appends the sacred non-claim sentence. Throws on any forbidden accusatory wording
  (`distillation attack confirmed`, `abusive actor`, `stolen`, `fraudulent`, `malicious
  campaign`, attribution to any named lab).

### CLI + signing + verifier
- `simurgh-extraction.mjs` — subcommands: `build [--update]` (validate set → run detector →
  write `expected-detector-result.json` + render), `hash`, `verify` (re-derive digest +
  re-run detector + compare byte-for-byte), `verify-hashes`.
- `sign-3t-attestation.mjs` — reads `SIMURGH_3T_PRIVATE_KEY_PATH`
  (default `~/.simurgh/3t-ed25519.pem`, mode 0600, never committed); signs
  `canonicalJson(parse(attestation))`; writes signature sidecar. Reuses
  `tools/simurgh-attestation/canonicalise.mjs` + `keygen.mjs`. Dedicated 3T key
  (3S key untouched). Only the public key is committed.
- `verify-stage3t-attestation.mjs` — two-tier:
  - **portable:** `bundle_digest_match`, `key_fingerprint_match`, `signature_valid`,
    `meta_set_digest_binding`, `decision_present`, `no_intent_claim`, `match_is_not_accusation`.
  - **`--reproduce`:** additionally re-runs the detector over the committed set and asserts
    the result + decision are byte-identical to the committed `expected-detector-result.json`.

---

## Evidence layout — `docs/research/llm-shield/evidence/stage-3t/`

```
meta-set/
  metadata-set.json
  metadata-set-manifest.json
  detector-config.json
result/
  expected-detector-result.json
  attestation.json
  attestation.signature.json
self-proof/
  self-proof-results.json
keys/
  stage3t-public-key.json
  fingerprint.txt
evidence-hashes.json
README.md
```

## Data flow

```
committed synthetic meta-set (hash-bound, provenance=synthetic_reference)
  → validateMetaSet → metaSetDigest
  → runDetector (matchSignals → distinctFamilies → decide)
  → expected-detector-result.json
  → render attestation prose (+ sacred non-claim)
  → Ed25519-signed attestation (own 3T key; public key committed)
  → two-tier verifier: portable (sig/digest/decision/non-claim) + --reproduce (re-run detector → byte-identical)
```

## Determinism & verify (3T-specific)

Unlike 3S (whose gateway receipt carries per-run timestamp/session id), 3T has no per-run
nondeterminism: the detector is a pure, order-independent function of committed metadata.
Therefore CI verify **does** re-run the detector and asserts byte-identity against the
committed `expected-detector-result.json`, in addition to signature + digest binding +
non-claim wall checks.

## Error handling

- Schema/provenance violations → typed throws (`meta_set_invalid`, `meta_set_provenance_invalid`,
  `forbidden_metadata_field`).
- Forbidden accusatory wording in renderer → throw (`intent_language_rejected`).
- Threshold/family-map drift without a new `detector_id` → `detector_identity_drift` failure
  (exercised by `threshold-version-lock` fixture).
- Verifier failures are explicit per-check booleans; any false → non-zero exit.

## Testing & gates

- Unit (100% fn coverage on pure libs): `metaSet`, `signalFamilies`, `detector`, `selfProof`,
  `renderer`.
- CLI / signer / verifier / E2E exercised by the smoke (honest subprocess coverage).
- `scripts/` additions: `smoke-llm-shield-stage3t.sh`,
  `security-audit-llm-shield-stage3t.mjs` (no accusatory/intent wording, sacred non-claim
  present, `intent_claims_rendered:0`), `privacy-audit-llm-shield-stage3t.mjs` (no forbidden
  raw tokens; provenance flags assert synthetic/offline), `consistency-audit-llm-shield-stage3t.mjs`
  (digest re-derives, detector result reproduces, signature verifies, `family_map_digest`
  matches config), `policy-drift-guard-llm-shield-stage3t.sh` (fail-closed, three-dot base).
- `check.sh` wired: 3T smoke + helper-coverage + the four audits, after the 3S steps.
- Tag `v2.3.0` on merge; banger release; memory entry.

## Out of scope (deliberate)

- Live gateway/telemetry integration (production deferred invariant).
- FP/FN benchmark claims of general detector quality.
- Any intent, attribution, or "distillation confirmed" assertion.
- Campaign-wide multi-set catalogues (single committed reference set for this cut; a
  catalogue could follow in a later stage, mirroring 3P).
