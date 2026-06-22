# Stage 3V-A: Recorded External-Signal Containment Attestation — Design

**Status:** Approved design (brainstorm converged; user locked both scope decisions)
**Stage:** 3V-A (first half of Stage 3V; 3V-B = live Llama Guard, deferred to v2.6.0)
**Release target:** `v2.5.0-stage-3v-a-recorded-external-signal-attestation`
**Builds on:** [[project_stage-3l-fable5-reference-containment]] (run-set + real boundary drivers), [[project_stage-3m-verifiable-containment-attestation]] (Ed25519 VCA spine), [[project_stage-3u-red-team-hardened-extraction-attestation]] (closes R2-B hash-slot in the external path), [[project_vca-north-star]]

---

## 1. Steel-thread sentence

Stage 3V-A does **not** claim any external OSS guardrail is unsafe, defeated, or inferior. It demonstrates that an external safety verdict — supplied here by a **deterministic recorded-fixture adapter** under a pinned, gateway-hashed provenance — can be treated as an **untrusted advisory signal**, replayed against the frozen Stage 3L consequence-containment run-set, and converted into a **signed, metadata-only, offline-verifiable** containment attestation.

## 2. Banger release line

> Industry reports whether a guardrail said yes or no. Stage 3V-A records whether the unsafe consequence could still happen, whether Simurgh contained it *after* the external signal, and whether the evidence still verifies after export — with every external hash computed by the gateway, never trusted from the adapter.

## 3. Scope (locked decisions)

- **Backing (Q1 → Option 1):** Recorded-fixture adapter only. Build the entire evidence machine — adapter contract, gateway-computed hashes, schema, four run modes, signed bundle, offline + reproduce verifier, tamper suite, audits, docs — driven by a **deterministic recorded-fixture external signal**. Fully offline, CI-green, vendor-neutral. No GPU/cloud/API/live inference.
- **Adapter surface (Q2 → Option 1):** Generic `ExternalDefenseAdapter` contract **plus exactly one** working adapter (the recorded-fixture backing). **No** `llamaGuardAdapter` / `nemoGuardrailsAdapter` / `guardrailsAiAdapter` stubs. No "coming soon" modules. One real backing, one generic contract.
- **Explicit framing:** 3V-A proves the **instrument** (the external-defence attestation machinery) and closes 3U's R2-B with gateway-computed hashes. It does **not** claim to wrap a real live defence yet. 3V-B (v2.6.0) points the same contract at Llama Guard.

**Out of scope for 3V-A:** any live external defence, vendor ranking, model-quality evaluation, NeMo/Guardrails-AI adapters, the comparative `external_only_targeted_asr` vs `external_plus_simurgh_targeted_asr` headline framed against a *real* vendor (we report the metric over the recorded fixture, clearly labelled synthetic).

## 4. Tooling-only constraint

3V-A is a **tooling-only** stage in the pattern of 3M/3N/3O/3P/3Q/3S/3T/3U: **zero `src/llmShield` change**, enforced by a fail-closed policy-drift guard (three-dot `origin/main...HEAD`). It *reads* the real Stage 3L boundary drivers in-process for the containment tail but must not modify them or any `src/llmShield/**` file. (3R remains the only deliberate gateway-security-path exception in the ladder.)

## 5. Architecture

```text
Frozen Stage 3L run-set (180 cases: 120 input-miss malicious, 30 direct malicious, 30 benign hard-neg)
        |
        v
Recorded-fixture ExternalDefenseAdapter  ──►  normalised external verdict (allow|block|warn|abstain|error)
        |                                       (no raw prompt, no raw model output, no adapter-supplied hash)
        v
Gateway hash helper  ──►  gateway-computed: external_raw_output_hash, external_normalised_verdict_hash,
        |                                    adapter_config_hash, fixture_manifest_hash
        v
Simurgh containment tail = evaluateStage3lCase()  (external verdict is CONTEXT, never authority)
        |
        v
Metadata-only run evidence  ──►  metrics + containment summary
        |
        v
VCA bundle: simurgh.vca.external_defense_run.v1
        |
        v
Ed25519 signature over canonicalJson(bundle)  (own 3V key; canonical-not-bytes)
        |
        v
Two-tier verifier: portable (signature + digests) | --reproduce (re-derive everything in-process)
```

## 6. Critical design rule — external defence is advisory only

The external verdict **cannot**:

1. mark context as trusted,
2. authorise a tool,
3. bypass a Simurgh denial,
4. suppress output scanning,
5. write trusted evidence directly,
6. provide its own hash as authority.

The containment tail consumes the external verdict purely as an **input observation** alongside the case. Simurgh's boundary decisions are computed by `evaluateStage3lCase()` regardless of what the external verdict said. A test asserts that flipping the external verdict from `block` to `allow` for an input-miss malicious case does **not** change any Simurgh boundary outcome (containment is invariant to the advisory signal).

## 7. R2-B closure — gateway-computed hashes

Stage 3U signed the residual limitation `hash_fields_are_opaque_256bit_slots_verifier_cannot_confirm_preimage`. 3V-A closes this **in the external-defence path**:

**Invariant:** all external-defence hashes are **gateway-computed**, never adapter-supplied.

> **Terminology (Fix 1):** in 3V-A, "gateway-computed" means computed by the **trusted Simurgh harness / verifier path** — never supplied by the adapter. 3V-A is tooling-only and changes **no production gateway code** (`src/llmShield/**` untouched). The helper is named to reflect this (`harnessHashExternalOutput.mjs`, a *trusted-harness* hash helper); the invariant keeps the name "gateway-computed hashes" because that is the deployment rule 3V-B will inherit.

- The adapter may submit **raw external output** (local-only, fixture file reference inside the controlled evidence workspace) — never an authoritative hash.
- A dedicated trusted-harness hash helper (`harnessHashExternalOutput.mjs`) computes, from the raw bytes it is given:
  - `external_raw_output_hash`
  - `external_normalised_verdict_hash`
  - `adapter_config_hash`
  - `fixture_manifest_hash`
- The adapter contract schema has **no hash field**. A test asserts that any adapter payload carrying a `*_hash` / `digest` key is rejected (`adapter_supplied_hash_forbidden`).
- The verifier recomputes all four hashes from committed inputs; a tampered hash fails verification.

This is the strongest technical beat of 3V-A: 3U's documented weakness becomes 3V-A's enforced invariant.

## 8. Adapter contract

`simurgh.external_defense_adapter.v1` — one normalised observation per case:

```json
{
  "adapter_schema": "simurgh.external_defense_adapter.v1",
  "target": "recorded_fixture",
  "case_id": "stage3l-...",
  "raw_output_ref": "local-only",
  "normalised_verdict": "allow | block | warn | abstain | error",
  "confidence_bucket": "none | low | medium | high | not_reported",
  "latency_bucket_ms": "0-100 | 100-500 | 500-2000 | 2000+",
  "error_code": "none | adapter_error | target_error | timeout | malformed_output"
}
```

Rules: no raw prompt; no raw model output in generated evidence; no adapter-supplied hash; verdict label must be in the closed enum (else normalised to `error` with `error_code: malformed_output`). The contract is **generic** — `target` is a free string so 3V-B can set `"llama_guard"` without contract change. **No code path may hard-code `recorded_fixture`** as the only valid target.

**Fix 3 — 3V-B compatibility gate:** a unit test `contract_accepts_arbitrary_target_name_without_target_specific_code` asserts the contract validates an observation with `"target": "llama_guard"` (an adapter that does not yet exist) with no target-specific branching. This proves 3V-B can plug in without contract change and without ghost stubs.

**Fix 2 — raw-output privacy boundary:** raw recorded external outputs may exist **only** in fixture inputs / controlled test fixtures — **never** in generated evidence, exported bundles, metrics, audit outputs, or signed attestation JSON. The privacy audit (`privacy-audit-llm-shield-stage3v.mjs`) enforces this over every generated artifact.

## 9. Evidence schema — `simurgh.vca.external_defense_run.v1`

```json
{
  "type": "simurgh.vca.external_defense_run.v1",
  "stage": "3V-A",
  "target_defense": {
    "name": "recorded_fixture",
    "mode": "recorded_fixture",
    "fixture_provenance": "synthetic_deterministic",
    "adapter": "recordedFixtureExternalDefenseAdapter",
    "adapter_config_hash": "sha256:...",
    "live": false
  },
  "run_set": { "source": "stage-3l", "fixture_manifest_hash": "sha256:...", "counts": {} },
  "adapter_contract": { "schema": "simurgh.external_defense_adapter.v1" },
  "gateway_computed_hashes": {
    "external_raw_output_hash": "sha256:...",
    "external_normalised_verdict_hash": "sha256:...",
    "adapter_config_hash": "sha256:...",
    "fixture_manifest_hash": "sha256:..."
  },
  "metrics": {},
  "containment_summary": {},
  "privacy": { "metadata_only": true },
  "referenced_evidence": [ { "stage": "3L", "digest": "sha256:..." } ],
  "non_claims": [],
  "limitations": [],
  "modes": ["simurgh_reference", "external_observed", "external_plus_simurgh", "tamper_negative"]
}
```

Signature lives in a sidecar `attestation.signature.json` (Ed25519 over `canonicalJson(parse(bundle))`, canonical-not-bytes — prettier/merge-safe, the 3M discipline).

## 10. Run modes

| Mode | Purpose |
|---|---|
| `simurgh_reference` | Existing Simurgh-only 3L containment result (re-derived, must match committed 3L digests) |
| `external_observed` | Recorded-fixture external verdict only — external metrics, no Simurgh authority |
| `external_plus_simurgh` | External verdict followed by the Simurgh containment tail — **the release claim** |
| `tamper_negative` | Verifier must fail on edited evidence |

## 11. Metrics

External-defence (over the recorded fixture, labelled synthetic): `external_block_rate`, `external_allow_rate`, `external_error_rate`, `external_abstain_rate`, `external_over_defence_rate`, `external_detection_by_family`.

Simurgh containment: `external_miss_but_contained_rate`, `unsafe_tool_execution: 0`, `unsafe_output_export: 0`, `context_authority_escalation: 0`, `receipt_coverage`, `audit_coverage`, `evidence_leakage: 0`.

Comparative (clearly marked recorded-fixture, not a vendor benchmark): `external_only_targeted_asr`, `external_plus_simurgh_targeted_asr`, `over_defence_delta`, `verifier_reproduce: true`.

## 12. Hard gates

3V-A passes only if:

1. recorded-fixture provenance is pinned (`fixture_provenance: synthetic_deterministic`, `live: false`),
2. adapter config digest is gateway-computed and pinned,
3. Stage 3L fixture manifest hash matches the committed 3L corpus,
4. **gateway computes all four external hashes**,
5. **no adapter-supplied hash is accepted** (`adapter_supplied_hash_forbidden`),
6. external verdict cannot change any Simurgh boundary outcome (advisory-invariance test),
7. `unsafe_tool_execution == 0`,
8. `unsafe_output_export == 0`,
9. `context_authority_escalation == 0`,
10. receipt coverage complete,
11. audit coverage complete,
12. generated evidence contains **no raw prompts**,
13. generated evidence contains **no external raw model output**,
14. generated evidence contains **no secrets / API keys / emails**,
15. offline verifier passes,
16. `--reproduce` verifier passes,
17. tampered external verdict fails verification,
18. tampered gateway hash fails verification,
19. tampered metrics fail verification,
20. wrong public key fails verification,
21. contract validates `"target": "llama_guard"` with no target-specific code (3V-B compatibility, Fix 3),
22. no raw recorded external output appears in any generated/exported/signed artifact (Fix 2).

## 13. Tooling (additive; reuse only `canonicalise.mjs` + read-only 3L lib)

```text
tools/external-defense-adapters/
  externalDefenseAdapterContract.mjs      # schema + validateObservation (throws on forbidden hash/fields)
  recordedFixtureExternalDefenseAdapter.mjs
  harnessHashExternalOutput.mjs           # R2-B closer: trusted-harness ("gateway-computed") hashes; NOT production gateway code
  normaliseExternalVerdict.mjs            # closed-enum normaliser
  externalDefenseManifest.mjs             # fixture manifest + digest

tools/simurgh-attestation/
  sign-3v-attestation.mjs                 # own 3V Ed25519 key (~/.simurgh/3v-ed25519.pem, mode 0600)
  verify-stage3v-external-defense.mjs     # two-tier: portable | --reproduce

tests/e2e/
  llm_shield_stage3v_external_defense_runner.mjs
  llm_shield_stage3v_metrics_lib.mjs
  llm_shield_stage3v_tamper_runner.mjs

tests/unit/llmShield/stage3v/
  adapterContract.test.js                 # incl. contract_accepts_arbitrary_target_name_without_target_specific_code (Fix 3)
  normaliseExternalVerdict.test.js
  harnessComputedHashes.test.js           # trusted-harness ("gateway-computed") hashes + adapter_supplied_hash_forbidden
  advisoryInvariance.test.js              # external verdict cannot move a boundary
  metrics.test.js
  verifierExternalDefenseBundle.test.js

scripts/
  smoke-llm-shield-stage3v.sh             # uses a reserved 33xxx port (e.g. 33190)
  security-audit-llm-shield-stage3v.sh    # machine-artifact-scoped accusatory scan; no named labs; advisory-only invariants
  privacy-audit-llm-shield-stage3v.mjs    # forbidden tokens + email regex + metadata-only
  consistency-audit-llm-shield-stage3v.mjs# all digests re-derive; verifier signature verifies
  policy-drift-guard-llm-shield-stage3v.sh# fail-closed, three-dot, zero src/llmShield change
  reproduce-llm-shield-stage3v.sh
```

Wire smoke + audits + guards into `scripts/check.sh` after the 3U section.

## 14. Evidence folder

```text
docs/research/llm-shield/evidence/stage-3v/
  README.md
  target-defense-manifest.json
  corpus-manifest.json            # references the committed 3L corpus by digest
  adapter-digests.json
  external-observations.json      # normalised verdicts only (no raw output)
  metrics.json
  containment-summary.json
  privacy-report.json
  referenced-evidence.json
  attestation.bundle.json
  attestation.signature.json
  verifier-output.json
  reproduce-output.json
  self-proof-results.json
  keys/ { stage3v-public-key.json, fingerprint.txt }
  evidence-hashes.json            # computed AFTER prettier; excludes itself from the walk
  tamper-tests/
```

## 15. Threat model

**In scope:** external defence misses malicious cases; over-blocks benign/hard-neg; returns malformed/ambiguous labels; attempts metadata smuggling in the verdict; adapter attempts to alter labels or inject a hash; bundle edited after signing; gateway hash tampered; corpus manifest edited; Simurgh containment bypass-attempted via the advisory signal.

**Out of scope:** claiming any named OSS defence is unsafe; full benchmark of external configurations; live-provider safety claim; model-alignment claim; production-deployment claim; complete adaptive-robustness claim; vendor performance ranking; **and (3V-A-specific) any claim that this wraps a real live defence — the backing is a recorded fixture.**

## 16. Non-claims

3V-A does **not** claim: Simurgh is jailbreak-proof; external OSS defences are broken/inferior; Llama Guard / NeMo / Guardrails AI is inferior; all prompt-injection is contained; live models are safe behind Simurgh; the corpus is the full threat universe; signed evidence proves ground truth; external defences should be replaced; **or that a real external defence was exercised (it was not — recorded fixture only).**

3V-A claims **only**: a verdict in the closed enum {allow, block, warn, abstain, error}, supplied here by a deterministic recorded fixture under gateway-computed provenance, can be treated as an untrusted advisory signal, replayed against the frozen Stage 3L consequence-containment run-set, and included in a signed, metadata-only attestation that verifies offline and records whether unsafe consequences were contained.

## 17. Known limitations (signed into the bundle, 3U-style)

- `recorded_fixture_not_live_external_defence` — the backing is synthetic/deterministic; no real model or ruleset was run.
- `synthetic_reference_set_only` — Stage 3L corpus, not the full threat universe.
- `not_a_general_accuracy_benchmark` — no vendor comparison.
- `advisory_signal_is_observational_only` — by design the verdict has no authority; metrics about it describe the fixture, not a deployed defence.
- carry-forward of the 3L containment limitations by reference.

## 18. Self-proof / tamper suite

Deterministic, key-free where possible; the signature tamper cases use the committed public key. Must FAIL (verifier `ok:false`, never throw) when: external verdict flipped; gateway hash edited; adapter digest edited; fixture manifest edited; metrics edited; an evidence file removed; wrong public key used; a raw prompt or raw external output injected into generated evidence; an adapter payload carries a hash field. Self-proof emits counters all `0` for the must-not-happen classes.

## 19. Coverage discipline

100% **function** coverage on the pure v3 libs (`tools/external-defense-adapters/*`, verifier lib), **plus** targeted **branch** tests for every throw path (forbidden-hash rejection, malformed-verdict normalisation, advisory-invariance, verifier fail-closed). Never state "100% coverage" unqualified — say "100% function coverage on the pure libs + branch tests on rejection paths," honest about E2E/subprocess-covered code.

## 20. CI / port discipline

The new `smoke-llm-shield-stage3v.sh` binds a port in the reserved `33000–33999` band (e.g. `33190`); the workflow's `net.ipv4.ip_local_reserved_ports=33000-33999` reservation keeps it out of the ephemeral range. Route the server through the shared `boot_server` helper.

## 21. Implementation phases

0. **Fixture lock** — author the recorded-fixture observation set over the 3L case-ids (deterministic, synthetic, labelled).
1. **Adapter contract** — generic contract + validateObservation (forbidden-hash/field rejection).
2. **Gateway-computed hashes** — `gatewayHashExternalOutput.mjs` (closes R2-B).
3. **external_observed run** — normalised verdict metadata + gateway hashes only.
4. **external_plus_simurgh run** — verdict → `evaluateStage3lCase()` tail; advisory-invariance enforced.
5. **Signed VCA bundle** — `simurgh.vca.external_defense_run.v1`, own 3V key, canonical-not-bytes.
6. **Negative tamper suite** — all clauses in §18.
7. **Audits + guards + check.sh wiring + docs + release closeout.**

## 22. Carry-forward 3T/3U lessons

`sha256Hex` already prefixes `sha256:` (never double-prefix); run `write-hashes` AFTER prettier (prettier collapses short arrays; hash the final formatted bytes); scope the security-audit accusatory-word scan to machine artifacts (README/docs may negate); deep-freeze enum/grammar tables; split build from write-hashes; verifier fails closed (`ok:false`, never throws) via optional chaining.

## 23. Release closeout gate

```bash
npm test
scripts/smoke-llm-shield-stage3v.sh
scripts/security-audit-llm-shield-stage3v.sh
node scripts/privacy-audit-llm-shield-stage3v.mjs
node scripts/consistency-audit-llm-shield-stage3v.mjs
scripts/reproduce-llm-shield-stage3v.sh
scripts/policy-drift-guard-llm-shield-stage3v.sh
```

Then tag `v2.5.0-stage-3v-a-recorded-external-signal-attestation` and write the banger.

## 24. Reviewer docs

`LLM_SHIELD_STAGE_3V_A_RECORDED_EXTERNAL_SIGNAL_ATTESTATION.md`, `STAGE_3V_A_THREAT_MODEL.md`, `STAGE_3V_A_VALIDATION_MATRIX.md`, `STAGE_3V_A_REVIEWER_CHECKLIST.md`, `STAGE_3V_A_CLOSEOUT.md`, plus the evidence `README.md`.

## 25. Final positioning

> 3U proved the evidence layer survives red-team pressure. 3V-A proves the evidence layer can wrap an **external** signal — instrument first, with gateway-computed hashes turning 3U's residual into 3V-A's enforced invariant. 3V-B then points the same instrument at Llama Guard.
