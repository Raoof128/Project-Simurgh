# Stage 3M — Verifiable Containment Attestation — Design

**Status:** Approved design (brainstorming output). Next step: implementation plan.
**Date:** 2026-06-20
**Release target:** `v1.6.0-stage-3m-verifiable-containment-attestation`
**Branch:** `main-stage-3m-verifiable-containment-attestation`
**Type:** Evidence/tooling stage. No `src/llmShield/**` guard-logic changes.
**North star:** `docs/research/llm-shield/NORTH_STAR_VERIFIABLE_CONTAINMENT_ATTESTATION.md`

## 1. North-star sentence

> Stage 3M turns Simurgh's Stage 3L containment evidence into a run-set attestation: a canonical
> metadata-only bundle signed with Ed25519, verifiable offline with a public key, optionally
> reproducible from the deterministic Stage 3L producer, and honest about the fact that it signs
> the evidence that exists rather than upgrading that evidence into a stronger audit chain.

## 2. Why 3M exists

The industry has converged on the four-layer defence (input validation, runtime filters,
tool/permission scoping, output validation + logging). Nobody owns the **proof**. Simurgh already
emits deterministic, metadata-only, HMAC-chained evidence per decision; that chain is excellent
_internal_ tamper-evidence but cannot be verified by an outsider without the symmetric secret —
and sharing the secret destroys the proof. Stage 3M closes that gap: it adds an **external**
attestation layer so any third party can verify an exported evidence bundle offline, with a
public key, without receiving any secret.

## 3. Trust model

Stage 3M separates internal tamper-evidence from external attestation:

- **Internal layer (unchanged):** the existing HMAC audit chain (`src/audit/hmacChain.js`,
  `verifyChain`) remains the internal integrity record, verifiable only by an HMAC-key holder.
- **External layer (new):** a canonical, metadata-only **bundle** is hashed (SHA-256) and signed
  with an **Ed25519** private key. The public key is published. Anyone verifies the bundle offline
  with the public key — no symmetric secret shared.

### What an Ed25519 attestation proves / does not prove

Proves: (1) the bundle was issued by the holder of the Simurgh attestation key; (2) the bundle was
not modified after signing; (3) the evidence inside can be checked deterministically by the
verifier. Does **not** prove: the server was uncompromised, the private key was never stolen, the
model is safe, or that all possible attacks were covered.

## 4. Granularity (v1)

One attestation bundle attests to a **run-set** — the whole Stage 3L 180-case evidence pack — not
individual gateway calls. Type: `simurgh.vca.run_set.v1`. The crypto core
(`canonicalise → digest → sign → verify`) is generic; only the run-set type is exposed in v1. A
future `simurgh.vca.gateway_call.v1` can reuse the same core without polluting 3M.

## 5. Envelope format

**Custom minimal v1:** canonical JSON bundle + a **detached** Ed25519 signature sidecar, using
`node:crypto` native Ed25519 — **zero new dependencies**. (JWS/EdDSA is a possible later migration
if external interop is ever required; out of scope for v1.)

Canonicalisation: `simurgh.canonical-json.v1` — recursively sort object keys, arrays preserved in
order, serialise with stable separators, UTF-8 bytes. The signature covers the **canonical bytes
of `attestation.bundle.json`**, never the sidecar.

## 6. The bundle — `attestation.bundle.json`

Self-contained (enough for portable verification) **and** hash-bound to the real Stage 3L files.

```json
{
  "attestation_type": "simurgh.vca.run_set.v1",
  "stage": "3M",
  "attested_run": {
    "source_stage": "3L",
    "run_id": "stage3l-fable5-reference-containment",
    "case_count": 180
  },
  "metrics": { "...": "verbatim from stage-3l/metrics.json" },
  "boundary_breakdown": { "...": "verbatim from stage-3l/boundary-breakdown.json" },
  "gate_results": { "all_hard_gates_passed": true, "gates": { "...": "key: pass/fail" } },
  "policy_digests": { "...": "verbatim from stage-3l/detector-digests.json" },
  "privacy_report": { "generated_evidence_leakage": 0 },
  "referenced_evidence": [
    { "path": "docs/research/llm-shield/evidence/stage-3l/metrics.json", "sha256": "..." },
    { "path": "docs/research/llm-shield/evidence/stage-3l/corpus-manifest.json", "sha256": "..." },
    {
      "path": "docs/research/llm-shield/evidence/stage-3l/boundary-breakdown.json",
      "sha256": "..."
    },
    { "path": "docs/research/llm-shield/evidence/stage-3l/detector-digests.json", "sha256": "..." },
    { "path": "docs/research/llm-shield/evidence/stage-3l/receipt-sample.json", "sha256": "..." },
    { "path": "docs/research/llm-shield/evidence/stage-3l/audit-sample.json", "sha256": "..." },
    {
      "path": "docs/research/llm-shield/evidence/stage-3l/generated-evidence-privacy-report.json",
      "sha256": "..."
    }
  ],
  "non_claims": {
    "does_not_prove_model_safety": true,
    "does_not_prove_jailbreak_immunity": true,
    "does_not_prove_server_uncompromised": true,
    "does_not_prove_private_key_never_stolen": true,
    "does_not_upgrade_audit_sample_to_full_chain": true,
    "attests_only_to_referenced_run_set": true
  }
}
```

> Stage 3M signs the Stage 3L evidence that exists. It does not upgrade a sample audit artifact
> into a full per-case HMAC chain.

`verifier-output.txt` is **not** part of the signed bundle or `referenced_evidence` — it is an
output of verification, generated after the fact (avoids the verify-its-own-output loop).

## 7. The signature sidecar — `attestation.signature.json`

```json
{
  "signature_type": "simurgh.vca.signature.v1",
  "algorithm": "Ed25519",
  "canonicalisation": "simurgh.canonical-json.v1",
  "bundle_sha256": "sha256:...",
  "public_key_fingerprint": "sha256:...",
  "signature": "base64:..."
}
```

The signer signs the canonical bundle bytes directly with Ed25519; `bundle_sha256` is recomputed
and checked by the verifier as a convenience integrity anchor, not the signed payload.
`public_key_fingerprint` is likewise recomputed and checked.

## 8. Key management + trust anchor

- Generate one Ed25519 keypair (`node:crypto generateKeyPairSync("ed25519")`).
- Commit **only** the public key as `attestation.public-key.json` — the Ed25519 public key as
  PEM/SPKI plus its SHA-256 fingerprint computed over the DER SPKI bytes; record that fingerprint
  in the stage README, closeout, and release notes.
- The private key is **never** committed. The signer reads it from a **path**:
  `SIMURGH_VCA_PRIVATE_KEY_PATH=/path/to/private-key.pem` (never raw key material in env — too
  easy to leak via logs/crash dumps/shell history).
- **Signing is a deliberate, local/manual release action.** CI never signs and never holds the
  private key.
- **Trust anchor:** a signature is only meaningful if the verifier trusts the public key. The
  verifier always prints the public-key fingerprint, and accepts an optional
  `--expected-key-fingerprint sha256:...` that fails the run if the bundle's signing key does not
  match — turning "this verifies" into "this verifies under the expected Simurgh key."

## 9. Components

Three pure, separable units under `tools/simurgh-attestation/`:

- `canonicalise.mjs` — `canonicalJson(value)` (sorted-key stable serialisation),
  `sha256Hex(bytes)`, `fingerprintPublicKey(pubKeyPem)`. No I/O beyond what callers pass.
- `sign-attestation.mjs` — builds the bundle from committed `stage-3l/*` evidence, computes
  `referenced_evidence` hashes, canonicalises, signs with the private key at
  `SIMURGH_VCA_PRIVATE_KEY_PATH`, writes `attestation.bundle.json` + `attestation.signature.json`.
- `verify-attestation.mjs` — two-tier verifier (below).
- `attestationLib.mjs` — shared pure helpers (`buildBundleFromStage3l`, `evaluateGateResults`,
  bundle/sidecar schema validators) so unit tests can exercise logic without files.

## 10. Verifier — two tiers

```bash
node tools/simurgh-attestation/verify-attestation.mjs \
  --bundle      docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json \
  --signature   docs/research/llm-shield/evidence/stage-3m/attestation.signature.json \
  --public-key  docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json \
  [--expected-key-fingerprint sha256:...] [--reproduce]
```

**Portable (always; no producer execution or source-code import required; requires the bundle, public key, signature sidecar, and the referenced evidence files on disk):**

1. `schema_valid` — bundle + sidecar match `simurgh.vca.*.v1`.
2. `signature_valid` — Ed25519 verify of the sidecar signature over canonical bundle bytes.
3. `bundle_digest_match` — recomputed SHA-256 equals `bundle_sha256`.
4. `key_fingerprint_match` — public-key fingerprint equals sidecar's, and equals
   `--expected-key-fingerprint` when supplied.
5. `evidence_file_hashes_match` — every `referenced_evidence[].sha256` equals the on-disk file.
6. `declared_gates_pass` — `gate_results.all_hard_gates_passed === true` and each gate true.
7. `evidence_leakage_rescan` — re-scan referenced evidence for forbidden tokens; must be 0.

**`--reproduce` (deterministic run-sets only):** 8. Re-run `buildStage3lCorpus()` + `evaluateStage3lCase` (import from the 3L lib) →
`reproduced_metrics_match`, `reproduced_boundary_breakdown_match`,
`reproduced_privacy_report_match`. Reproduction is a stronger property when available, never a
prerequisite for all future attestations.

Output (printed and written to `verifier-output.txt` after checks):

```text
simurgh attestation verify: PASS
public_key_fingerprint: sha256:...
schema_valid: true
signature_valid: true
bundle_digest_match: true
key_fingerprint_match: true
evidence_file_hashes_match: true
declared_gates_pass: true
evidence_leakage: 0
reproduced_metrics_match: true        # only with --reproduce
```

Any failed check → non-zero exit and `... : FAIL` with the failing field.

## 11. Files

```
tools/simurgh-attestation/
  attestationLib.mjs
  canonicalise.mjs
  sign-attestation.mjs
  verify-attestation.mjs
tests/unit/llmShield/attestation/
  canonicalise.test.js
  attestationLib.test.js
  verifyAttestation.test.js          # incl. tamper tests
docs/research/llm-shield/evidence/stage-3m/
  attestation.bundle.json
  attestation.signature.json
  attestation.public-key.json
  verifier-output.txt
  README.md                          # incl. public-key fingerprint
docs/research/llm-shield/
  LLM_SHIELD_STAGE_3M_VERIFIABLE_CONTAINMENT_ATTESTATION.md
  STAGE_3M_THREAT_MODEL.md
  STAGE_3M_VALIDATION_MATRIX.md
  STAGE_3M_REVIEWER_CHECKLIST.md
  STAGE_3M_CLOSEOUT.md
scripts/
  smoke-llm-shield-stage3m.sh
  security-audit-llm-shield-stage3m.sh
  privacy-audit-llm-shield-stage3m.mjs
  policy-drift-guard-llm-shield-stage3m.sh
```

Wire into: `scripts/check.sh`, `README.md`, `AGENT.md`, `CHANGELOG.md`.

## 12. Gates (hard)

```
schema_valid                      = true
signature_valid                   = true
bundle_digest_match               = true
key_fingerprint_match             = true
evidence_file_hashes_match        = true
declared_gates_pass               = true
evidence_leakage                  = 0
reproduced_metrics_match          = true     (under --reproduce)
private_key_committed             = 0         (security audit: no private key in repo)
src_llmShield_policy_drift        = 0
```

`smoke-llm-shield-stage3m.sh` runs: portable verify, `--reproduce` verify (3L is deterministic and
in-repo), privacy audit over `evidence/stage-3m/`, security audit (no private key material; bundle
is metadata-only; non-claims present; overclaim wording absent), and the policy-drift guard.

## 13. Tamper tests (must exist)

- Flip a byte in `attestation.bundle.json` → `signature_valid: false`, non-zero exit.
- Flip a metric value in the bundle without re-signing → `signature_valid` and
  `bundle_digest_match` fail; if re-signed in a negative unit fixture, `declared_gates_pass` or
  `--reproduce` fails.
- Edit a referenced `stage-3l` file → `evidence_file_hashes_match: false`.
- Verify with a different public key → `signature_valid: false`.
- `--expected-key-fingerprint` mismatch → `key_fingerprint_match: false`.

## 14. Security + privacy posture

- The bundle is metadata-only: hashes, counts, gate booleans, enum codes, public key, opaque
  signature. No raw input/context/output, no private key, no secret.
- `security-audit-llm-shield-stage3m.sh`: assert no PEM private-key markers anywhere in the repo
  (`BEGIN .*PRIVATE KEY`), assert `non_claims` present and all true, assert no overclaim wording
  in 3M docs (reviewer checklist excluded), assert policy-drift clean.
- `privacy-audit-llm-shield-stage3m.mjs`: fail if `evidence/stage-3m/**` contains forbidden tokens
  (reuse the Stage 3L forbidden-token set + PEM/`.env` literals).

## 15. Non-claims

- 3M is layers 2–4 + proof; it is **not** a content-harm/refusal classifier (the layer that
  failed Fable 5).
- No jailbreak-immunity / model-safety claim. Ed25519 proves issuance + integrity +
  recomputability only.
- 3M signs the evidence that exists; it does not upgrade 3L's audit sample into a full HMAC chain.
- "First/VCA" claims must rest on the verifiable artifacts, never assertion.

## 16. Implementation phases

1. **Crypto core + tests:** `canonicalise.mjs` + `attestationLib.mjs` with unit tests
   (canonicalisation determinism, fingerprinting, schema validation).
2. **Sign + verify:** `sign-attestation.mjs`, `verify-attestation.mjs` (portable tier), tamper
   tests, generate the committed bundle/sidecar/public-key from the live `stage-3l` evidence.
3. **Reproduce tier:** `--reproduce` wired to the 3L lib; confirm signed == recomputed.
4. **Gates + audits:** smoke, security, privacy, policy-drift scripts; wire into `check.sh`.
5. **Docs + closeout:** stage docs, evidence README (with key fingerprint), closeout; then tag
   `v1.6.0-stage-3m-verifiable-containment-attestation`.
