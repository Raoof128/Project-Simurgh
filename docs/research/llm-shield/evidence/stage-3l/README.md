# Stage 3L — Evidence (metadata-only)

This directory holds the frozen, metadata-only evidence for Stage 3L. It contains no raw
inputs, no raw context payloads, no raw provider output, and no jailbreak transcript — only
hashes, counts, boundary labels, verdicts, and boolean flags.

| File                                     | Contents                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `metrics.json`                           | Aggregate hard-gate metrics for the 180-case run.                                           |
| `corpus-manifest.json`                   | Per-case `case_id`, family, case_mode, expected verdict/boundary, and hashes (no raw text). |
| `boundary-breakdown.json`                | Observed boundary distribution overall and per case mode.                                   |
| `receipt-sample.json`                    | One sample metadata receipt (boundary, verdict, containment, observed flags).               |
| `audit-sample.json`                      | One sample audit record (chain validity + payload hash).                                    |
| `detector-digests.json`                  | SHA-256 digests of the protected detector/gateway policy files.                             |
| `generated-evidence-privacy-report.json` | Forbidden-token scan result over generated evidence (`generated_evidence_leakage`).         |
| `citation-verification.md`               | URL, date accessed, status, and one-line use for each external anchor.                      |
| `runner-output.txt`                      | Runner pass line.                                                                           |

## Regenerate

```bash
node tests/e2e/llm_shield_stage3l_fable5_reference_runner.mjs --update-metrics
npx prettier --write docs/research/llm-shield/evidence/stage-3l/*.json
node tests/e2e/llm_shield_stage3l_fable5_reference_runner.mjs   # read-only verify
```

The corpus is generated deterministically by `buildStage3lCorpus()` in
`tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs`; raw fixtures are never committed.
