# Stage 4J PCTA — Evidence

Emitted by `tools/simurgh-attestation/stage4j/emit-stage4j-evidence.mjs` (invoked by
`scripts/reproduce-llm-shield-stage4j.sh`). Emission fails closed: if any observed verdict
disagrees with the committed expected matrix, nothing is written and the run exits non-zero.

| File                       | What it is                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `p-gate-results.json`      | Observed per-gate verdicts (P0–P8 + P4-pre) from re-running the committed fixture matrix. Never hand-written. |
| `offline-report.json`      | The CLI's own result record for the clean fixture, produced under the offline pre-flight.                     |
| `authorization-proof.json` | The clean fixture's signed authorization proof (reviewable artifact).                                         |
| `pcta-manifest.json`       | The clean fixture's PCTA manifest binding proof digest → DFI certificate digest → 4H run-root (acyclic).      |
| `reproduce-summary.json`   | One-line run summary (stage, status, gates, matrix rows, node major).                                         |

Non-claim reminder: these artifacts attest **consistency and provenance of declared
evidence** under the §0.6 scope. `applied` means recorded-as-allowed, not executed; sink
membership is declared, not derived; the verifier never dispatches or blocks anything.
