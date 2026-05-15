# Stage 1.5 Decisions

> **Status (v0.4.3, 2026-05-15):** Stage 1.5 decision record. Stage 2.1 and 2.2 are now merged — the rationale below for "ship Stage 1 first, then layer Stage 2" is intact. See [`STAGE_2_ARCHITECTURE.md`](STAGE_2_ARCHITECTURE.md) and `CHANGELOG.md` `[0.4.1]`–`[0.4.3]` for Stage 2 decisions.

Short ADR-style entries for reviewer context.

## Metadata-Only Telemetry

- Status: Accepted
- Context: Screen capture is both invasive and unreliable against display-fidelity attacks.
- Decision: Stage 1 uses behavioral metadata only.
- Consequence: Privacy posture improves, but some visual-only attacks remain out of scope.

## No Screen, Webcam, or Audio Collection

- Status: Accepted
- Context: Visual and biometric collection increases privacy risk.
- Decision: Stage 1 does not collect screen pixels, webcam frames, microphone audio, or recordings.
- Consequence: Stage 1 cannot rely on visual evidence and must document blind spots honestly.

## No Typed or Pasted Content Storage

- Status: Accepted
- Context: Answer and pasted content may contain sensitive academic or personal data.
- Decision: Store counts and lengths only, never raw content.
- Consequence: Reviewers see metadata patterns, not answer text.

## Deterministic Local Scoring as Official Score

- Status: Accepted
- Context: Reviewers need inspectable, testable scoring.
- Decision: Local heuristic scoring is authoritative.
- Consequence: Claude cannot silently override risk scores.

## Claude Narrative as Optional Explanation Only

- Status: Accepted
- Context: AI narrative can help reviewers but should not decide outcomes.
- Decision: Claude is used only for optional narrative on configured Warning/Critical paths.
- Consequence: Demo mode and local scoring remain usable without an API key.

## HMAC Audit Chain

- Status: Accepted
- Context: Review records should be tamper-evident.
- Decision: Use HMAC-linked entries with previous-signature chaining.
- Consequence: Audit exports can detect modified entries when verified with the correct secret.

## Helper-Based Display-Affinity Detection

- Status: Accepted
- Context: Browser telemetry alone cannot inspect OS display-affinity state.
- Decision: Stage 1 accepts authenticated helper reports and escalates capture-excluded windows.
- Consequence: Helper coverage and OS API behavior remain important risks.

## Manual Review Instead of Automatic Finding

- Status: Accepted
- Context: Heuristic systems can produce false positives and false negatives.
- Decision: Every non-safe result remains a manual-review recommendation.
- Consequence: Institutions must keep due process outside Simurgh.

## Stage 2 Integrity Node Direction

- Status: Proposed
- Context: Shared-secret helpers are not enough for mature device integrity.
- Decision: Stage 2 should move toward signed local integrity proofs.
- Consequence: Stage 2 needs deployment, signing, key-management, and red-team planning.

## Do Not Build Stage 2 Before Validation Pack

- Status: Accepted
- Context: Stage 1 claims need evidence before expansion.
- Decision: Stage 1.5 is documentation, audit, validation, and reviewer readiness.
- Consequence: No major Stage 2 runtime code is added in this pack.

## Native Helper Before Hardware Attestation

- Status: Accepted
- Context: Hardware-rooted attestation is platform-specific and deployment-heavy.
- Decision: Continue with native helper hardening before claiming hardware-backed integrity.
- Consequence: Hardware attestation remains future work.

## Documentation-First Stage 1.5 Gate

- Status: Accepted
- Context: Reviewers need a coherent evidence map and clear boundaries.
- Decision: Stage 1.5 creates reviewer docs, validation matrix, risk register, and checklist.
- Consequence: The repo becomes easier to review without expanding runtime behavior.
