# VFC Foreign-Capture Pack (Stage 5G, Lane C)

A **self-contained** kit a _separately-reported external actor_ runs to produce a real, rung-1
(`challenge_bound`) foreign capture of **Prompt Guard 2 86M**. Simurgh does not run it and receives no
private material — that separation is the point (VFC's "No Self-Dealing" law).

## What you receive

`challenge-receipt.json`, `verifier-identity.json`, `verifier-pin.json`, `shared-corpus.json`,
`detector-snapshot-manifest.json`. You supply your **own** Ed25519 `actor-key.pem`.

## Frozen offline lifecycle

1. Acquire the exact pinned PG2 snapshot (`revision a8ded8e6…`); verify the manifest revision.
2. `pip install -r requirements.lock`.
3. `export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1` (the pack sets these) — do **not** let capture
   silently download a different model.
4. `./run.sh challenge-receipt.json verifier-identity.json verifier-pin.json shared-corpus.json \
detector-snapshot-manifest.json actor-key.pem`
5. Return **only** `capture-package.json` (see `OUTPUT_CONTRACT.md`).

## Honest bound

This proves **distinct-key, challenge-bound** production by a separately-reported actor. It does **not**
prove organisational non-control (rung-1). Real keyless-Sigstore anchoring (rung-2) is future work.
