# Stage B5 — Model Prompt Pack

All prompts are versioned in `prompts/`. Every pass is executed with
`prompts/00-system-instruction.md` prepended and `MODEL_REVIEW_INPUT_PACK.md`
as the only factual input.

| Pass | Prompt file                          | Stage |
| ---- | ------------------------------------ | ----- |
| 1    | `prompts/01-novelty-extraction.md`   | B5-A  |
| 2    | `prompts/02-claim-prosecutor.md`     | B5-A  |
| 3    | `prompts/03-reviewer-two-attack.md`  | B5-A  |
| 4    | `prompts/04-methodology-audit.md`    | B5-A  |
| 5    | `prompts/05-threat-model-builder.md` | B5-A  |
| 6    | `prompts/06-related-work-mapper.md`  | B5-A  |
| 7    | `prompts/07-figure-table-planner.md` | B5-A  |
| 8    | `prompts/08-abstract-generator.md`   | B5-A  |
| 9    | `prompts/09-paper-outline.md`        | B5-B  |
| 10   | `prompts/10-draft-v0-1.md`           | B5-B  |
| 11   | `prompts/11-reviewer-simulation.md`  | B5-C  |
| 12   | `prompts/12-final-polish.md`         | B5-C  |

Responses: `MODEL_RESPONSE_LOG.md`. Claim audit output: `MODEL_CLAIM_AUDIT.md`.
