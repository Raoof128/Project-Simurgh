# Stage 3H-L2 Validation Matrix

| Requirement                              | Proven by                                                       |
| ---------------------------------------- | --------------------------------------------------------------- |
| Same baseline/defended sample            | `sample-manifest.json` + consistency audit                      |
| Sample frozen before run                 | `run-manifest.json.sample_manifest_sha256` + consistency audit  |
| Sample IDs exist in pinned AgentDojo     | `sample_manifest_ids_exist_in_agentdojo: true`                  |
| AgentDojo scorer unchanged               | `run-manifest.json.scorer_modified === false`                   |
| Baseline has no Simurgh claims           | `baseline_simurgh_metrics = not_applicable`                     |
| Baseline and defended denominators match | consistency audit checks 10 benign and 20 security denominators |
| Defended gateway contact 100%            | `defended_gateway_contact_rate` hard gate                       |
| Receipt coverage 100%                    | `simurgh-run-index.json` + consistency audit                    |
| Audit verification 100%                  | `simurgh-containment-results.json`                              |
| Raw evidence leakage 0                   | privacy audit                                                   |
| Counts for every metric                  | consistency audit checks `counts` fields                        |

Measured quality metrics are not hard gates: Benign Utility, Utility Under Attack, Targeted ASR,
over-defence, and task completion are reported as research findings.
