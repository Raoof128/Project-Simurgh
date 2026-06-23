# Stage 3W Closeout

## Status

SHIPPED. Stage 3W witnesses the sealed Stage 3V-B v2.6.0 release (merge `b645d80`) with two
independent provenance roots: an offline-primary Simurgh Ed25519 in-toto release-witness bundle and
an additive GitHub OIDC/Sigstore CI witness over a deterministic, exit-code-derived verdict.

## What shipped

- Pure witness lib (`stage3wWitnessLib.mjs`): 3V-B subjects, deterministic CI verdict, in-toto
  statement.
- Runner (`build-3w-witness.mjs`), local signer + own 3W Ed25519 key, two-tier offline verifier,
  tamper suite (9 cases).
- Offline gate scripts (smoke port 33210, security/privacy/consistency audits, policy-drift,
  reproduce) wired into `check.sh` — offline only.
- Online CI witness workflow (`stage-3w-witness.yml`, `actions/attest-build-provenance@v3`),
  separate from the offline quality gate.
- Reviewer docs + evidence README.

## Invariants held

- Zero `src/llmShield` change (policy-drift fail-closed).
- 100% function coverage on the pure lib (`stage3wWitnessLib.mjs`); CLIs subprocess-covered.
- Offline verifier needs no network; Sigstore is additive and never gates offline verification.
- `ci_observed_not_echoed`: CI builds the verdict from real exit codes and asserts byte-identity.
- Corroboration by digest equality; no signature nesting; no circular dependency.
- `evidence-hashes.json` excludes itself and contains no Sigstore object.
- Sacred non-claim: 3W does NOT reduce `live_capture_origin_self_reported`.

## Release-hardening note

`actions/attest-build-provenance@v3` may be pinned to a full commit SHA before the final tag for
maximum supply-chain discipline.

## Next

3X (deferred) — live multi-release public timeline / external reproduction campaign.
