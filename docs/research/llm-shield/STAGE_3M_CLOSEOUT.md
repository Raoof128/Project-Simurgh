# Stage 3M — Closeout

**Release:** `v1.6.0-stage-3m-verifiable-containment-attestation`
**Type:** Evidence / tooling stage. No `src/llmShield/**` guard-logic changes.
**Outcome:** Offline verification PASS (portable + `--reproduce`); all checks `true`.

## Verifier output (committed)

```
simurgh attestation verify: PASS
public_key_fingerprint: sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798
schema_valid: true
bundle_digest_match: true
signature_valid: true
key_fingerprint_match: true
evidence_file_hashes_match: true
gate_results_match: true
declared_gates_pass: true
evidence_leakage_zero: true
reproduced_metrics_match: true
reproduced_boundary_breakdown_match: true
reproduced_privacy_report_match: true
```

## What this proves / does not prove

Proves: the bundle was issued by the holder of the Simurgh attestation key, was not modified after
signing, binds to the referenced Stage 3L evidence files, carries honestly-recomputed gate results
that pass, is metadata-only, and (under `--reproduce`) is regenerable from the deterministic Stage
3L producer. Does **not** prove: server uncompromised, private key never stolen, model safety,
jailbreak immunity, or coverage of all attacks (encoded as machine-readable `non_claims`).

> Stage 3M signs the Stage 3L evidence that exists. It does not upgrade a sample audit artifact
> into a full per-case HMAC chain.

## Verification

- `node --test tests/unit/llmShield/attestation/*.test.js` — 18/18 passed (incl. 7 tamper tests).
- `npm test` — 660/660 passed.
- `scripts/smoke-llm-shield-stage3m.sh` — verify (portable + `--reproduce`) + policy-drift +
  privacy + security audits all passed.
- Wired into `scripts/check.sh` (smoke gate + 100% attestation-helper coverage).

## Posture

The Ed25519 public key is committed (fingerprint above); the private key is never committed and
signing is a deliberate local/manual release action (CI verifies only). The HMAC audit chain
remains internal tamper-evidence; the signature is the external verification layer. `src/llmShield`
untouched (policy-drift clean). This realises the Verifiable Containment Attestation north star:
from "trust our logs" to "verify our proof."
