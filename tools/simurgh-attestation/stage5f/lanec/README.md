# Stage 5F VMP — Lane C: fresh non-CI dual-detector offline pinned-weight capture

**Status: HARNESS PRESENT, CAPTURE NOT YET EXECUTED.** This is the Frontier lever. The committed
evidence pack is a *synthetic structural demonstration* over the two real detector identities; a real
capture requires **Prompt Guard 2 86M + Llama Guard 4 12B offline on a droplet** (PG2 runs on CPU; LG4
12B needs a GPU + 8-bit). Until this runs, the closeout scores Frontier down honestly (5A/5C precedent).

Offline pinned weights ≠ a hosted endpoint (carries `live_endpoint_attestation_deferred`).

## AnthropicSafe

The shared corpus extends 5E's already-published safe base families (**inputs only**, no new potent
attack strings; detectors score inputs; no target model generates). LG4's output is a bounded allow/block
token — no free-form generation is preserved. Transcript-free metadata-and-verdict evidence.

## Acquisition lifecycle (frozen — never download inside the ceremony)

1. Acquire the pinned model snapshots (`hf download <model> --revision <rev>`).
2. Verify their manifest digests.
3. `export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`.
4. Capture entirely from the verified cache.

## Run (isolated envs so PG2 and LG4 never share a transformers pin)

```bash
python3 -m venv .venv-pg2 && .venv-pg2/bin/pip install -r requirements-pg2.lock
.venv-pg2/bin/python capture_pg2.py shared-corpus.json frag-pg2.json      # CPU

python3 -m venv .venv-lg4 && .venv-lg4/bin/pip install -r requirements-lg4.lock
.venv-lg4/bin/python capture_lg4.py shared-corpus.json frag-lg4.json      # GPU droplet, 8-bit

python3 merge_capture_census.py shared-corpus.json capture-census.json frag-pg2.json frag-lg4.json
```

The merge asserts **both members evaluated the exact shared corpus** (identical case IDs), then the JS
builder folds the census into the signed attestation.
