---
title: "Project Simurgh: Privacy-Preserving Device Integrity Proofs for Capture-Resistant High-Stakes Sessions"
authors:
  - name: Mohammad Raouf Abedini
    orcid: "0009-0000-6214-258X"
    affiliation: Department of Computing, Macquarie University, Sydney, Australia
year: 2026
venue: Preprint (target: IEEE conference / workshop; companion to Zenodo DOI 10.5281/zenodo.20319832)
doi: Not yet assigned
ara_version: "1.0"
domain: Security & Privacy / Educational Technology
keywords:
  - academic integrity
  - device attestation
  - display affinity
  - Ed25519
  - ECDSA P-256
  - integrity proofs
  - online proctoring
  - privacy-preserving security
  - screen capture evasion
claims_summary: >
  Four primary claims: (C01) browser screen-capture does not satisfy Display Fidelity on Windows/macOS
  due to documented OS-level exclusion APIs; (C02) signed OS-metadata proofs can replace screen
  surveillance while preserving session-integrity signals; (C03) the cross-platform prototype
  correctly detects capture-exclusion on Windows/macOS and window-manager states on Linux without
  collecting content; (C04) the manual-review-only decision model is architecturally enforced and
  cannot be suppressed through configuration.
abstract: >
  Project Simurgh is a privacy-preserving integrity architecture for high-stakes AI-mediated and
  remote assessment sessions. It replaces screen-capture-based surveillance with signed,
  metadata-only integrity proofs using ECDSA P-256 (device-shield daemons) and Ed25519
  (browser-paired envelope), combined with HMAC-SHA256-linked tamper-evident audit chains.
  The prototype spans macOS (Swift/CryptoKit), Windows (.NET), and Linux (Rust) daemons, a
  Node.js verifier, and a browser telemetry SDK. Validation: 379 automated tests (327 Node,
  33 Rust, 11 .NET, 8 Swift), 16 Linux smoke scenarios, 30 Linux security assertions, and
  real-device Windows validation (build 19045).
---

# Layer Index

| Layer             | Path                                           | Purpose                                      |
| ----------------- | ---------------------------------------------- | -------------------------------------------- |
| Cognitive / Logic | `logic/problem.md`                             | Observations, gaps, key insight, assumptions |
| Cognitive / Logic | `logic/claims.md`                              | Four falsifiable claims with proof pointers  |
| Cognitive / Logic | `logic/concepts.md`                            | Six formal concept definitions               |
| Cognitive / Logic | `logic/experiments.md`                         | Four verification experiment plans           |
| Cognitive / Logic | `logic/solution/architecture.md`               | Four-layer component graph                   |
| Cognitive / Logic | `logic/solution/algorithm.md`                  | Proof protocol and HMAC chain math           |
| Cognitive / Logic | `logic/solution/constraints.md`                | Boundary conditions and non-claims           |
| Cognitive / Logic | `logic/solution/heuristics.md`                 | Six implementation heuristics                |
| Cognitive / Logic | `logic/related_work.md`                        | 14 related-work entries with typed deltas    |
| Physical          | `src/configs/training.md`                      | Risk-scorer weights and thresholds           |
| Physical          | `src/configs/model.md`                         | Cryptographic and proof-envelope parameters  |
| Physical          | `src/execution/proof_protocol.py`              | Typed stub for proof verification pipeline   |
| Physical          | `src/environment.md`                           | Runtimes, platforms, dependencies            |
| Exploration       | `trace/exploration_tree.yaml`                  | 10-node research DAG                         |
| Evidence          | `evidence/tables/table1_privacy_boundary.md`   | Table I: Privacy Collection Boundary         |
| Evidence          | `evidence/tables/table2_validation_summary.md` | Table II: Automated Validation Summary       |
| Evidence          | `evidence/tables/table3_platform_matrix.md`    | Table III: Platform Capability Matrix        |
| Evidence          | `evidence/figures/figure1_architecture.md`     | Figure 1: System Architecture description    |
| Evidence          | `evidence/figures/figure2_proof_sequence.md`   | Figure 2: Proof Protocol Sequence            |
| Evidence          | `evidence/README.md`                           | Evidence index                               |
