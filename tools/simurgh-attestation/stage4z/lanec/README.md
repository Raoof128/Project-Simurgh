# Stage 4Z VWA — Lane C (offline workspace-readout capture)

**Motto: AnthropicSafe First, then ReviewerSafe.** Lane C is **offline and NEVER CI-gated.**
It produces the real `frozen_capture` tensors + a sealed ceremony record; the deterministic
post-processing then runs forever in Lane A.

## Rails (frozen)

- Benign pinned corpus only; detection-side lexicon only.
- **No** elicitation, honeypots, misaligned organisms, or evasion search.
- Position rule is **total** (`all_positions`) — every token position is graded, so
  **No Silent Cell** binds.
- Non-finite (NaN/±Inf) tensor values **abort** the capture (no undefined `score_nano`).

## Recipe (RunPod single GPU, cu128 lineage)

```bash
# pinned open weights — record the exact revision; it becomes the staleness receipt
export MODEL=meta-llama/Llama-3.2-1B-Instruct
export REV=<pinned-revision-sha>
pip install "transformers==<pinned>" "torch==<pinned-cu128>"
python capture-workspace-readout.py config.json > ceremony.json
```

`config.json`: `{ model_id, revision, corpus, lexicon, layers, out_dir, salt_seed,
declaration_digest, lens_digest }`. Layers ≈ `{2,5,8,11,13,15}` for the 16-layer 1B model
(early/workspace/motor bands). Compute ≈ 1–2 GPU-hours (`|lexicon| × |corpus|` backward passes).

## Both-outcomes sealing

- **captured** → freeze the tensors into the stage4z `frozen_capture` fixture and run the
  **mandatory rerun cascade** (Task 13): `build-stage4z-fixtures → attestation → Lane B →
  Python parity → browser parity → K7/reproduce`. Otherwise the shipped artifacts prove the
  synthetic placeholder, not the capture.
- **capture_failed** → the ceremony is sealed with a `reason`; the stage ships on the synthetic
  fixtures, honestly labelled. Honesty over heroics (3V-B / 4U precedent).

The ceremony JSON shape is validated in CI by `lanec.test.js` **without loading torch**
(`validateCeremony` in `../core/captureCore.mjs`), so a malformed ceremony cannot ship while
the compute stays offline.
