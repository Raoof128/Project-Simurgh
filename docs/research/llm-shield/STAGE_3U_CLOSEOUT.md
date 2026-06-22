# Stage 3U — Closeout

**Status:** complete. **Tag:** v2.4.0. **Branch:**
`main-stage-3u-red-team-hardened-extraction-attestation`.

> Stage 3U does not claim perfect extraction detection, attacker intent, attribution, or
> prevention. It proves that red-team-discovered false-fire and metadata-smuggling
> weaknesses were converted into a frozen detector-v2 identity, grammar-enforced metadata
> validation, regression self-proof fixtures, and signed evidence that reproduces offline.

## Delivered

- Additive v2 modules in `tools/simurgh-extraction/` (v1/3T untouched, only `canonicalise.mjs`
  reused): `signalFamiliesV2`, `metadataGrammar`, `metaSetV2`, `detectorV2`, `rendererV2`,
  `selfProofV2`, `simurgh-extraction-v2` CLI, `sign-3u-attestation`, `verify-stage3u-attestation`.
- Detector v2 (`stage3u_extraction_detector_v2`): volume contextual, ≥2 STRONG families →
  extraction (A10 fix). Metadata grammar enforced (A9 fix).
- Two committed sets: main → `extraction_pattern_observed` across 3 strong families; A10
  regression → `single_signal_observed`. Attestation binds both result digests.
- Self-proof with benign-heavy, A10 regressions, A9 rejections, version locks, and the
  documented-limitation fixture that intentionally escalates.
- Audits (security/privacy/consistency-via-verifier), policy-drift guard, **v1-freeze
  guard** (3T frozen + reproduces), smoke, check.sh wiring.

## Walls held

Tooling-only (policy-drift PASS); additive (v1-freeze PASS, 3T reproduces); volume cannot
corroborate; metadata grammar enforced; sacred non-claim + no named labs; documented
limitation signed not hidden; both detector results + attestation reproduce byte-for-byte;
signature + all bindings verify.

## Verification

`npm test` green; pure v2 libs 100% function coverage; `scripts/smoke-llm-shield-stage3u.sh`
PASS under `CI=true`; 3T historical evidence still reproduces.

Stage 3U public key fingerprint:
`sha256:2b990056b174eb69211181fcc473b4aed987203565ac1a16d217871e3ab31dd1`.

## Out of scope (deliberate)

Live gateway/telemetry integration; general FP/FN benchmark; adaptive-evasion resistance;
multi-set campaign registry. **The external OSS-defense reproduction run is Stage 3V.**
