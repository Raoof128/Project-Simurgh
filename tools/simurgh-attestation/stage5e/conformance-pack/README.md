# Simurgh Stage 5E VDA independent conformance kit

This self-contained kit verifies the Stage 5E Verifiable Deployed-detector Attestation over the
committed Meta Llama Prompt Guard 2 (86M) score table. Release: `v2.40.0-stage-5e-vda`.

## Requirements

- Node.js 20 or newer (Node 26 recommended)
- Python 3.10 or newer
- `bash`, `shasum`, and `unzip`

No npm install, model download, GPU, Hugging Face token, or network access is required.

## Run

```bash
unzip simurgh-vda-conformance.zip
cd simurgh-vda-conformance
bash run.sh
```

Success requires exit code `0`, every numbered gate to print its `OK` line, and the final line:

```text
== Stage 5E VDA reproduce: ALL PASS ==
```

The runner fails closed: a failed unit, K7, or Lean command stops the run and prevents `ALL PASS`.

## What this proves

The kit verifies the committed attestation at public and audit tiers, rebuilds it byte-identically,
recomputes deterministic facts in stdlib Python, exercises the Stage 5E unit suite and tamper matrix,
and runs the Lean proof when `lean` is installed.

## Scope boundary

This default run does not execute Prompt Guard. It verifies the deterministic arithmetic and geometry
over committed scores. A slip is a threshold miss on a pinned revision, not a detector "defeat" and
not evidence of downstream harm.

Optional independent score recapture requires access to the gated model plus `torch`, `transformers`,
`safetensors`, and `huggingface_hub`; see `tools/simurgh-attestation/stage5e/lanec/README.md`.
