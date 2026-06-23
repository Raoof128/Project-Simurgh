# Stage 3V-B — Live Llama Guard 4 External-Defence Containment Attestation

## Summary

Stage 3V-A proved the external-defence attestation instrument with a recorded fixture. Stage 3V-B
points that same instrument at a real, live Llama Guard 4 (`meta-llama/Llama-Guard-4-12B`). The
model is captured once in a controlled GPU environment, its raw classifier verdicts are frozen,
hash-bound, and signed, and the attestation reproduces byte-identically offline. The model is
never re-executed in CI.

**Crown.** Stage 3V-B does not claim Llama Guard 4 is reproducible. It claims the evidence is
reproducible, the live capture is provenance-bound, and the committed frozen-capture replay
artifact lets reviewers reproduce the signed attestation offline.

**Headline (real, live Llama Guard 4 12B, input-only, 8-bit, greedy).** Over the Stage 3L
180-case run-set, Llama Guard 4 allowed 168 and blocked 12. Of the 150 malicious cases it missed
138 (it caught 12 of the 30 direct-input attacks and, as an input-only content-safety classifier,
could not see any of the 120 downstream-injection cases). Simurgh contained all 138 it missed
(`external_miss_but_contained 138/138`), the external-plus-Simurgh targeted attack-success rate is
0/150, and there were zero unsafe tool executions, output exports, or context escalations. The
capture is deterministic: three independent greedy runs produced byte-identical case content.

## Method

1. **Input (Option A).** Each Stage 3L case exposes a non-empty `user_task`. A fail-closed
   preflight asserts 180/180 feedable inputs; no synthetic fallback. That string is wrapped in the
   official Llama Guard 4 chat template as a single `user` turn — exactly what an input-only
   guardrail sees in production.
2. **Capture (transport-only, RunPod).** A Python harness runs LG4 greedy
   (`do_sample=false, temperature=0, max_new_tokens=64`) and writes raw classifier outputs plus a
   self-reported provenance manifest (HF commit, snapshot-manifest digest, tokenizer-config digest,
   chat-template hash, runtime versions, GPU class, timestamp). It performs no normalisation, no
   hashing of evidence, and no signing.
3. **Attest (trusted harness, local).** The Mac JS harness parses the LG4 grammar, normalises to
   the closed verdict enum, computes all seven hashes itself, builds the bundle, and signs it with
   a 3V-B Ed25519 key whose private half never leaves the machine.
4. **Reproduce.** CI replays the committed frozen-capture replay artifact and verifies the signed
   attestation. It never runs the model.

## The boundary thesis (steel thread)

An input-only guardrail can only judge the user turn. In the 120 input-miss cases the user task is
benign and the attack lives downstream in untrusted context, tool requests, or provider output, so
an input filter structurally cannot see it. The 30 direct-input cases carry the payload in the
user turn, so a competent input guardrail should catch most of them. Stage 3V-B reports whatever
Llama Guard 4 actually does, then verifies whether Simurgh's context, tool, and output boundaries
contain the unsafe path regardless. This is a boundary claim, not a claim that Llama Guard 4 is
weak.

## Provenance binding (seven harness-computed hashes)

`external_raw_output_hash`, `external_normalised_verdict_hash`, `adapter_config_hash`,
`capture_provenance_hash`, `capture_file_hash`, `capture_script_hash`, `prompt_rendering_hash`.
All are computed by the trusted harness — never supplied by the adapter
(`adapter_supplied_hash_forbidden`), continuing the Stage 3U R2-B closure. `capture_file_hash`
binds the committed replay artifact; `capture_script_hash` binds the exact capture harness;
`input_manifest_hash` binds the exact `user_task` strings without exporting any prompt.

## Build-with-sample, release-with-real

The machine is developed and CI-tested against a deterministic, CI-safe sample capture in real LG4
grammar (`live: false`). The signed v2.6.0 release is produced only from the real RunPod capture
(`live: true`, `capture_environment: runpod_gpu`). A dedicated release gate
(`scripts/assert-stage3vb-live-release.sh`) refuses to let the tag ride on the sample and requires
every provenance digest to be a real `sha256:` value.

## Honesty

`model_reexecuted_in_ci: false` is stated in the bundle. The self-reported capture origin is
signed into `known_limitations` as `live_capture_origin_self_reported`. The verifier does not
download or rehash model weights. No vendor ranking; no claim that the external defence is unsafe
or inferior; the advisory verdict is observational only.
