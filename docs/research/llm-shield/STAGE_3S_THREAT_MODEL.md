# Stage 3S — Threat Model

The asset is **trust in an AI-drafted defensive narrative**. The risk is that a generated
narrative becomes believed beyond its evidence — an overclaim, a hallucinated signal, or an
implied misconduct finding. 3S ensures the model can draft but never decide truth.

## Adversaries and mitigations

| Adversary / risk                                                          | Mitigation                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Hallucinated signal (model asserts a signal not in the evidence)          | Field-equality claim check: `evidence_ref` must resolve; unsupported → rejected (`unsupported_slot`)                                  |
| Overclaim (model says fallback used when it wasn't)                       | Relation must hold against the digest; contradiction → `narrative_claim_conflict`, never rendered                                     |
| Automatic misconduct finding (courtroom cosplay)                          | Stage 2.5 wall: allowed manual-review vocabulary only; forbidden accusatory wording rejected; `automatic_finding_made:false` enforced |
| Privacy overclaim (model claims raw pixels/titles/typed content captured) | Digest privacy booleans are false; any slot claiming capture conflicts; privacy audit blocks raw-data tokens                          |
| Schema smuggling (JSON-plus-vibes: fences, prefixes, multiple objects)    | Strict single-object schema wall → `narrative_schema_violation`                                                                       |
| Slot swap after the gateway run                                           | Receipt-binding: `model-slots.source.gateway_output_hash` must equal the committed receipt `output_hash`                              |
| Source swap (digest built from forged evidence)                           | Source-binding: `source_inputs[]` file-byte digests verified + digest re-derives byte-identically                                     |
| Artifact tampering                                                        | Ed25519 signature over the canonical artifact (dedicated 3S key); CI verify-only                                                      |
| Model output bypassing containment                                        | Gateway-mediated: slots are drafted through the real gateway (output firewall + tool gate + receipt + HMAC audit)                     |
| Non-determinism laundering a bad artifact                                 | Verify re-derives the deterministic parts + byte-compares; never re-runs the gateway                                                  |
| Scope creep into the shield                                               | Policy-drift guard (fail-closed): any `src/llmShield` change fails the stage                                                          |

## Trust boundaries

- Pure decision logic (`evidenceDigest`, `claimChecker`, `renderer`, `selfProof`) is
  unit-proven at 100% function coverage; the CLI injects the real gateway run + I/O.
- The gateway receipt proves the _attempt passed containment_; the 3S verifier proves the
  _narrative didn't outrun the evidence_. These are deliberately separate guarantees.
- Live providers are opt-in; the deterministic recorded_fixture drives CI.

## Residual risk (accepted)

- The live `fable-5` drafting path is opt-in and not exercised in deterministic CI; the
  same claim checker + renderer + signature apply to its output.
- The narrative vocabulary is intentionally small; richer phrasing is future work and must
  extend the allow-set + claim-check, never bypass them.
