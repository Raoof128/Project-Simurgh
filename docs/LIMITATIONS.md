# Stage 1 Limitations

> **Status (v0.4.3, 2026-05-15):** This document describes the Stage 1 boundary as published in the Stage 1.5 reviewer pack. Stage 2.1 (macOS integrity proofs) and Stage 2.2 (macOS node pairing) are now merged; for Stage 2 limitations see [`STAGE_2_ARCHITECTURE.md`](STAGE_2_ARCHITECTURE.md) and `SECURITY.md`.

Stage 1 is a research MVP and reviewer validation baseline. These limitations define the controlled security boundary; they are not hidden defects or production claims.

## Current Boundary

- Stage 1 is not a production deployment.
- Stage 1 does not fully solve GPU overlays.
- Stage 1 does not fully solve read-only cheating workflows where a student silently transcribes from external material.
- Stage 1 does not replace an institutional misconduct process.
- Stage 1 does not make automatic misconduct findings.
- Stage 1 does not provide hardware-rooted attestation.
- Stage 1 does not defend against kernel-level malware or a compromised operating system.
- Stage 1 does not yet provide complete helper coverage across all platforms.
- Stage 1 helper results depend on OS API behavior and permissions.
- Stage 1 requires red-team validation before production use.
- Stage 1 requires privacy/legal review before institutional deployment.
- Stage 1 requires institutional pilot testing before real-world effectiveness claims.
- Stage 1 is not a biometric identity system.
- Stage 1 does not store screen, webcam, audio, typed answer content, or pasted text content.

## Practical Impact

Stage 1 is best understood as a privacy-preserving integrity prototype with hardening around the current academic workflow:

- It can detect and score browser-observable behavioral anomalies.
- It can ingest helper display-affinity signals where the macOS helper is available.
- It can protect joined sessions against common replay and token-boundary attacks.
- It can provide a tamper-evident review record.

It should not be described as a complete endpoint-security product, a final device-integrity platform, or a disciplinary decision engine.

## Stage 2 Direction

The Stage 2 path is a Device Shield / Integrity Node architecture that can pair browser sessions with a local node, sign integrity proofs, improve helper attestation, maintain tamper-aware local logs, and prepare for hardware-backed attestation. Stage 2 should begin only after Stage 1.5 evidence is reviewed.
