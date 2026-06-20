# LLM Shield — Stage 3M: Verifiable Containment Attestation

**Release:** `v1.6.0-stage-3m-verifiable-containment-attestation`
**Type:** Evidence / tooling stage. No `src/llmShield/**` guard-logic changes.

## North-star sentence

> Stage 3M turns Simurgh's Stage 3L containment evidence into a run-set attestation: a canonical
> metadata-only bundle signed with Ed25519, verifiable offline with a public key, optionally
> reproducible from the deterministic Stage 3L producer, and honest about the fact that it signs
> the evidence that exists rather than upgrading that evidence into a stronger audit chain.

## Why this stage exists

The industry has converged on the four-layer agent defence (input validation, runtime filters,
tool/permission scoping, output validation + logging). Nobody owns the **proof**. Simurgh already
emits deterministic, metadata-only, HMAC-chained evidence per decision — but an HMAC chain is
_internal_ tamper-evidence: an outsider cannot verify it without the symmetric secret, and sharing
the secret destroys the proof. Stage 3M adds the missing **external** layer so any third party can
verify an exported evidence bundle offline, with a public key, without receiving any secret.

## Trust model

- **Internal layer (unchanged):** the HMAC audit chain (`src/audit/hmacChain.js`, `verifyChain`)
  remains the internal integrity record, verifiable only by an HMAC-key holder.
- **External layer (new):** a canonical, metadata-only bundle is hashed (SHA-256) and signed with
  an **Ed25519** private key. The public key is published; anyone verifies offline.

### What an Ed25519 attestation proves / does not prove

Proves: (1) the bundle was issued by the holder of the Simurgh attestation key; (2) the bundle was
not modified after signing; (3) the evidence inside can be checked deterministically by the
verifier. Does **not** prove: the server was uncompromised, the private key was never stolen, the
model is safe, or that all possible attacks were covered. These are encoded as machine-readable
`non_claims` fields inside the bundle itself.

> Stage 3M signs the Stage 3L evidence that exists. It does not upgrade a sample audit artifact
> into a full per-case HMAC chain.

## Artifact

One attestation attests to a **run-set** — the Stage 3L 180-case pack — not individual gateway
calls. Type `simurgh.vca.run_set.v1`. The bundle embeds the metrics, boundary breakdown,
recomputed gate results, policy digests, privacy report, and a hash-bound list of the seven
referenced Stage 3L evidence files; plus the `non_claims` object. The detached sidecar
(`simurgh.vca.signature.v1`) carries the Ed25519 signature over the canonical bundle bytes.

## Verifying (offline, two-tier)

```bash
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle      docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature   docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key  docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json \
  --expected-key-fingerprint sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798 \
  [--reproduce]
```

- **Portable (default):** schema, Ed25519 signature, bundle digest, public-key fingerprint
  (including the optional expected fingerprint), referenced-evidence file hashes, recomputed gate
  results + gate pass, and an evidence-leakage rescan of the bundle and referenced files. Requires
  no producer execution or source-code import — only the bundle, public key, sidecar, and the
  referenced evidence files on disk.
- **`--reproduce`:** additionally re-runs the deterministic Stage 3L producer and confirms the
  signed metrics, boundary breakdown, and privacy result match.

The signature covers `canonicalJson(parse(bundle))`, not the file bytes, so reformatting the
committed bundle (e.g. Prettier) never breaks verification.

## Key management

The Ed25519 **public** key is committed (`attestation.public-key.json`, SPKI PEM + SHA-256
fingerprint over the DER SPKI bytes; fingerprint
`sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798`). The **private** key is
never committed — the signer reads it from `SIMURGH_VCA_PRIVATE_KEY_PATH`. Signing is a deliberate,
local/manual release action; CI only verifies.

## Outcome

Portable and `--reproduce` verification both PASS with every check `true`; tamper tests cover
bundle edits, re-signed bad metrics, decorative gate results, edited referenced evidence, wrong
key, fingerprint mismatch, and leakage. `src/llmShield` untouched (policy-drift clean). See
`STAGE_3M_THREAT_MODEL.md`, `STAGE_3M_VALIDATION_MATRIX.md`, `STAGE_3M_REVIEWER_CHECKLIST.md`,
`STAGE_3M_CLOSEOUT.md`, and `evidence/stage-3m/`.
