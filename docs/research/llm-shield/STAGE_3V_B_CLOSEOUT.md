# Stage 3V-B Closeout

## Status

SHIPPED. The signed v2.6.0 live bundle was produced from a real RunPod Llama Guard 4 12B capture
(input-only, 8-bit, greedy) over the Stage 3L 180-case run-set. Headline: LG4 allowed 168 / blocked
12; missed 138 of 150 malicious; Simurgh contained 138/138; external-plus-Simurgh targeted ASR
0/150; zero unsafe tool/output/context outcomes. Capture determinism verified by three
byte-identical greedy runs. Transformers preview build per Meta's model card
(`v4.51.3-LlamaGuard-preview`); live-release gate enforces real provenance digests.

## What shipped

- LG4 grammar parser, adapter, seven harness-computed hashes, sample capture generator.
- Runner (stage 3V-B bundle), local signer + own Ed25519 key, two-tier verifier, tamper suite.
- Feedable-input + capture-integrity preflights; smoke (port 33200) + security/privacy/consistency
  audits + policy-drift guard + reproduce + release gate; wired into `check.sh`.
- RunPod transport-only Python capture harness.
- Reviewer docs + evidence README.

## Invariants held

- Zero `src/llmShield/**` change (policy-drift fail-closed).
- 100% function coverage on the pure libs (grammar, adapter, hashes); CLI tails subprocess-covered.
- All seven hashes harness-computed; `adapter_supplied_hash_forbidden` enforced.
- Advisory-invariance structural; raw prompts and raw output never exported.
- `model_reexecuted_in_ci: false`; self-reported origin signed as a known limitation.

## Release rule

Build with sample, release with real. `assert-stage3vb-live-release.sh` blocks any v2.6.0 tag whose
evidence is still the sample or whose provenance digests are not real `sha256:` values.

## Next

Tag + release v2.6.0 after the real RunPod capture lands and CI is green on the merge commit.
