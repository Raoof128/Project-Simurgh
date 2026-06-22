# LLM Shield Stage 3V-A — Recorded External-Signal Containment Attestation

## Steel-thread

Stage 3V-A does **not** claim any external OSS guardrail is unsafe, defeated, or inferior. It
demonstrates that an external safety verdict — supplied here by a **deterministic
recorded-fixture adapter** under a pinned, harness-hashed provenance — can be treated as an
**untrusted advisory signal**, replayed against the frozen Stage 3L consequence-containment
run-set, and converted into a **signed, metadata-only, offline-verifiable** containment
attestation (`simurgh.vca.external_defense_run.v1`).

> A recorded external verdict is an advisory observation, not an accusation, and not a live
> defence.

## What it is (and is not)

3V-A is the **instrument**. It proves the external-defence attestation machinery works and
closes the Stage 3U R2-B residual (opaque adapter hash) with **harness-computed hashes**. It
does **not** wrap a real live defence — the backing is a synthetic, deterministic recorded
fixture. Stage 3V-B (v2.6.0) points the same contract at a real Llama Guard run without any
contract change.

This is a **tooling-only** stage: zero `src/llmShield` changes (enforced by a fail-closed
policy-drift guard), additive modules only, fully offline and deterministic.

## The four run modes

| Mode | Purpose |
|---|---|
| `simurgh_reference` | Existing Simurgh-only 3L containment result |
| `external_observed` | Recorded-fixture external verdict only (external metrics) |
| `external_plus_simurgh` | External verdict followed by the Simurgh containment tail — **the release claim** |
| `tamper_negative` | The verifier must fail on edited evidence |

## Advisory-only rule (structural)

The Simurgh containment tail is the real Stage 3L boundary driver `evaluateStage3lCase()`,
which takes **only the fixture** — never the external verdict. So flipping the external verdict
(`block → allow`) cannot change any boundary outcome. Advisory-invariance is therefore
*structural*, not asserted by hope (`advisoryInvariance.test.js`).

## Gateway-computed hashes (closes 3U R2-B)

In 3V-A, **"gateway-computed" means computed by the trusted Simurgh harness/verifier path** —
never supplied by the adapter — and **no production gateway code is changed**. The helper is
`harnessHashExternalOutput.mjs`. The adapter contract carries no hash field; any observation
with a `*hash*`/`*digest*` key is rejected (`adapter_supplied_hash_forbidden`). The four
harness hashes are `external_raw_output_hash`, `external_normalised_verdict_hash`,
`adapter_config_hash`, `external_defense_manifest_hash`; the Stage 3L corpus is bound
separately as `run_set.stage3l_corpus_manifest_hash`. In `--reproduce` the verifier emits
explicit `trusted_harness_hashes_recomputed` and `stage3l_corpus_manifest_recomputed` checks.

## Privacy boundary

Raw recorded external outputs exist **only** in the committed fixture
(`tests/fixtures/stage-3v/recorded-external-outputs.json`) and are used solely for harness
hashing. They never appear in generated evidence, the bundle, metrics, audit output, or the
signed attestation. The privacy audit enforces this.

## Non-claims

3V-A does not claim Simurgh is jailbreak-proof; that external OSS defences are broken or
inferior; that Llama Guard / NeMo / Guardrails AI is inferior; that all prompt-injection is
contained; that live models are safe behind Simurgh; that the corpus is the full threat
universe; that signed evidence proves ground truth; or **that a real live defence was
exercised (it was not — recorded fixture only).**

## Coverage statement

100% **function** coverage on the pure 3V libs (adapter contract, verdict normaliser,
harness-hash helper, recorded-fixture adapter, metrics lib) **plus** branch tests on every
throw path. The verifier/runner CLIs are subprocess-covered by the smoke and audits (matching
the 3U precedent), not included in the strict function-coverage gate.

## Evidence + offline verification

All artifacts live under `docs/research/llm-shield/evidence/stage-3v/`. To verify offline:

```bash
node tools/simurgh-attestation/verify-stage3v-external-defense.mjs --reproduce
```

Own Stage 3V Ed25519 key; only the public key is committed.
