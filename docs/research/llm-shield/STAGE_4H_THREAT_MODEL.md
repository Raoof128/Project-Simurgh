# Stage 4H Threat Model

## In Scope

Stage 4H covers signed, bounded proof-carrying certificates for explicit data-flow integrity. The verifier re-derives premises, policy/lattice commitments, derivation coverage, tamper closure, privacy bounds, and offline-hermetic checker execution for Q0 through Q7.

Q3 is an outer preflight and execution harness. It proves process/interpreter-bound hermeticity for the checker path by recording `clean_run_hits: 0` and catching a dynamic egress double as raw `28 / checker_not_offline`.

## Out of Scope

This is not kernel sandboxing, not model safety, not execution truth, not implicit-flow security, not multi-field collusion closure, not statistical robustness, and not future-run guarantee.

R6/4M remains the place for kernel, TEE, LSM, eBPF, or namespace-backed isolation.

## Evidence Integrity

`hermeticity-attestation.json` is acyclic and excludes its own digest. `signed-pack-manifest.json` owns `hermeticity_attestation_digest`, recomputed from local offline-audit output.

Unknown raw verifier values fail closed to typed exit `3`; Q3 offline-environment breach maps to typed exit `2`; verifier or gate rejection maps to typed exit `1`; clean success maps to typed exit `0`.
