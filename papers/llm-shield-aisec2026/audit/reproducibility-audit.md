# Reproducibility Audit

Audit date: 2026-06-24

## Existing Evidence

| Requirement                              | Evidence                                                                                   | Status                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- |
| Stage 3M offline verification            | `docs/research/llm-shield/evidence/stage-3m/verifier-output.txt`                           | PASS in committed evidence |
| Stage 3X one-command reproduction result | `docs/research/llm-shield/evidence/stage-3x/vca-chain-reproduction-results.json`           | PASS in committed evidence |
| Public keys committed                    | `docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json`, `stage-3x/keys/` | PASS                       |
| Private keys omitted                     | no private key expected in evidence paths; anonymous artifact scan passed                  | PASS                       |
| Live provider not required               | Stage 3X result has `offline_only=true`, `network_required=false`                          | PASS                       |

## Commands Run In Current Worktree

```bash
npm test
scripts/check.sh
scripts/reproduce-vca-chain.sh
cd Papers/llm-shield-aisec2026 && make
cd Papers/llm-shield-aisec2026 && artifact/reproduce-paper-claims.sh
cd Papers/llm-shield-aisec2026 && artifact/build-anonymous-submission.sh
```

## Current Status

PASS. Reproducibility checks, repo tests, and the full repository gate passed in the current worktree on 2026-06-24. The Stage 3H-L2, Stage 3J, Stage 3K, and Stage 3L real-provider runs remain intentionally opt-in and are documented as skipped by `scripts/check.sh`; the submitted claims rely on the deterministic/offline evidence paths verified here.
