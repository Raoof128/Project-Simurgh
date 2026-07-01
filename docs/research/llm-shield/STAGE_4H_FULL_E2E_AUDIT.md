# Stage 4H Full-Chain E2E Audit

This audit was added before Stage 4J/PCTA to increase replay confidence over the released Stage 4H artifact.

## Base

- Tag: `v2.18.0-stage-4h-proof-carrying-containment`
- Commit: `7a2039136d44cf179cca5836a33596a7620c87e5`
- Audit branch: `stage-4h-full-chain-e2e-audit`

## Scope

The audit exercises Stage 4H.0 through 4H.5 through real builders, real verifier CLI paths, signed evidence, offline replay, tamper fixtures, typed exits, byte-stable reproduction, and anti-theatre deletion.

4H.1 receives the strongest focus because PCTA depends on the DFI certificate and derivation proof contract.

## Evidence

Evidence is under:

`docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/`

The required evidence files are:

- `README.md`
- `release-input.json`
- `full-e2e-summary.json`
- `function-coverage-summary.json`
- `command-output.txt`

## Acceptance

- `scripts/e2e-llm-shield-stage4h-full-chain.sh` PASS
- `scripts/reproduce-llm-shield-stage4h.sh` PASS
- `npm test` PASS
- `npm run format:check` PASS
- `git diff --check` PASS

`unshare` is optional. When unavailable, the in-process Q3 harness remains authoritative for this environment.

## Non-Claim

This audit does not implement PCTA, create a new release tag, change Stage 4H verifier semantics, broaden Stage 4H claims, or alter public release wording.
