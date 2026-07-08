# Stage 5B VAR — Lane C (offline grounded-red-team capture)

**Motto: AnthropicSafe First, then ReviewerSafe.** Lane C is **offline and NEVER CI-gated.** It
produces the real `frozen_capture` tensors + lens + a sealed ceremony record; the deterministic
red-team then runs forever in Lane A against that precommitted readout.

`capture-workspace-readout.py` is **copied** from Stage 4Z (the frozen 4Z file stays
byte-untouched) with the **elided lens VJP completed here** — the `torch.autograd.grad` of each
lexicon token's post-final-norm logit w.r.t. each layer activation, averaged over the benign
corpus.

## Rails (frozen)

- Benign pinned corpus only; detection-side lexicon only.
- **No** elicitation, honeypots, misaligned organisms, or evasion search.
- Position rule is **total** (`all_positions`) — every token position is graded.
- Non-finite (NaN/±Inf) values **abort** the capture (no undefined `score_nano`).
- The attacked capture is **adversary-independent** (No Author's Map): the charter binds the 4Z
  **declaration_digest**, never a tensor-commitment root.

## Recipe (commodity CPU / Apple-Silicon — 1B needs no GPU)

```bash
export MODEL=meta-llama/Llama-3.2-1B-Instruct   # gated: huggingface-cli login + accept license
export REV=<pinned-revision-sha>                 # becomes the staleness receipt
pip install "transformers==<pinned>" "torch==<pinned>"
python capture-workspace-readout.py config.json > ceremony.json
```

`config.json`: `{ model_id, revision, corpus, lexicon, layers, out_dir, salt_seed,
declaration_digest }`. Layers ≈ `{2,5,8,11,13,15}` for the 16-layer 1B model.

## Byte-stability is MEASURED, not assumed

Run the capture **twice** and `cmp` the frozen tensors. If CPU float32 is bit-stable → the
primary lane is laptop-reproducible. If not → **hash-anchor** the tensors + sign the limitation
(`gpu_captures_are_hash_anchored_not_bitwise_reproducible_cpu_1b_primary_is_byte_stable`). A GPU
capture, if ever used, is always hash-anchored.

## Both-outcomes sealing

- **captured** → freeze the tensors into the `frozen_capture` fixture and run the mandatory
  rerun cascade (build fixtures → attestation → Lane B → Python parity → browser → K7/reproduce).
- **capture_failed** → the ceremony is sealed with a `reason`; the stage ships on the synthetic
  fixtures, honestly labelled. Honesty over heroics (3V-B / 4U / 5A precedent).

The ceremony JSON shape is validated in CI by `lanec.test.js` **without loading torch**
(`validateCeremony` in `ceremonyCore.mjs`).
