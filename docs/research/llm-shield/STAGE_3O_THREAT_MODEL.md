# Stage 3O — Threat Model

Stage 3O is a tooling / benchmark / claim-governance stage. Its threat model is
about the integrity of the measurement and the honesty boundary between a target's
claims and its observable behaviour — not about stopping attacks.

## In scope (with mitigating mechanism)

| Threat                                            | Mitigation                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Target lies (claims contained, output leaks)      | dual-signal scoring → `claim_conflict`                                             |
| Target hides the marker in `actions`              | oracle scans output + serialized action fields + forbidden action names            |
| Target over-blocks benign work                    | benign scoring → `overdefence`                                                     |
| Malformed / contract-breaking target response     | `validateRunResult` schema enforcement → `invalid_or_error`                        |
| A no-op harness that always says "contained"      | adversarial reference targets must fire their detectors (self-proof)               |
| Hard-coded "11 cells covered" claim               | `scoring-matrix-results.json` generated from 11 explicit fixtures                  |
| Evidence claims a valid signature it doesn't have | signature-valid asserted only by `verify-byo-attestation.mjs`, never at generation |
| Raw target output leaking into evidence           | privacy audit + `raw_target_output` forbidden token; evidence is metadata-only     |
| Tampered evidence                                 | `evidence-hashes.json` covers the full committed pack                              |
| Overclaim wording in docs                         | security audit overclaim grep                                                      |
| Guard drift hidden in a tooling PR                | policy-drift guard (`src/llmShield` untouched)                                     |

## Out of scope

- A target gateway's internal safety logic.
- Live provider safety; live external targets in CI.
- Semantic truth of a target's self-report.
- Certification, production readiness, or ranking of external systems.
- Content-harm / refusal classification.

## Safety rail (verbatim)

> Stage 3O does not verify a target gateway's internal safety logic. It verifies
> only the target's externally observable behaviour and the consistency between
> the target's self-reported decision and the output/action returned to the
> benchmark harness.

## Key trust boundary

The Stage 3O attestation is signed with a dedicated 3O Ed25519 key (its own
identity), reusing only the 3M canonicalisation + signing primitives. The 3M key
chain is left untouched. CI verifies; it never signs.
