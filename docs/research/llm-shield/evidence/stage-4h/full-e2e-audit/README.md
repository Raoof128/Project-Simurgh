# Stage 4H Full-Chain E2E Audit Evidence

This directory contains the released-artifact audit evidence for Stage 4H.

The audit starts from `v2.18.0-stage-4h-proof-carrying-containment` at commit `7a2039136d44cf179cca5836a33596a7620c87e5` and adds audit-only harnesses, tests, summaries, and this evidence directory. It does not refresh or rewrite the released Stage 4H evidence outside this directory.

## Files

- `release-input.json`: released tag, commit, scope, and runtime-logic-change flag.
- `full-e2e-summary.json`: summary of the full 4H.0 through 4H.5 audit run.
- `function-coverage-summary.json`: summary of public Stage 4H checker-surface helper coverage.
- `command-output.txt`: command transcript from `scripts/e2e-llm-shield-stage4h-full-chain.sh`.

## Non-Claim

This is a cold replay and function-path exercise over the released Stage 4H artifact. It does not add a new runtime claim or broaden Stage 4H beyond its released bounded evidence claim.
