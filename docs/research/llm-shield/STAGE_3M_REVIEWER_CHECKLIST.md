# Stage 3M — Reviewer Checklist

## Security audit (enforced by `scripts/security-audit-llm-shield-stage3m.sh`)

- [x] No actual PEM private-key block committed anywhere (anchored `-----BEGIN ... PRIVATE KEY-----`).
- [x] Bundle carries machine-readable `non_claims`, all `true`.
- [x] No overclaim wording in 3M docs ("jailbreak-proof" / "Claude defeated" / "Fable fixed" / "universal safety" / "immune to") — reviewer checklist excluded.
- [x] No `src/llmShield` guard-logic drift (policy-drift guard).

## Privacy audit (enforced by `scripts/privacy-audit-llm-shield-stage3m.mjs`)

Stage 3M evidence must **not** contain forbidden tokens (raw input/context/provider output, tool
args, secrets), a PRIVATE key block, `.env`, or incident-transcript markers. The committed
**public** key is allowed.

## Tamper tests (in `tests/unit/llmShield/attestation/verifyAttestation.test.js`)

- [x] Flipped metric without re-signing → `signature_valid` + `bundle_digest_match` fail.
- [x] Re-signed bad metric → `declared_gates_pass` fails.
- [x] Decorative gate-results sticker (claims pass while metrics fail) → `gate_results_match` fails.
- [x] Edited referenced evidence file → `evidence_file_hashes_match` fails.
- [x] Wrong public key → `signature_valid` fails.
- [x] `--expected-key-fingerprint` mismatch → `key_fingerprint_match` fails.
- [x] Forbidden token in a referenced file → `evidence_leakage_zero` fails.

## Trust anchor

- [x] Public-key fingerprint published: `sha256:875b59ebbee8e6eb6fe34d6e06d60d74434cbcf5ec17acb18d1c9f68e2a06798`.
- [x] Private key never committed; signing local/manual; CI verifies only.

## Outcome

All checks pass at `v1.6.0-stage-3m-verifiable-containment-attestation`.
