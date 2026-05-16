# Stage 2 Limitations

> **Status (v0.4.10, 2026-05-16):** This document describes the Stage 2 macOS Device Shield boundary. Stage 2.1–2.5 are now merged and frozen for macOS. For the Stage 2.5 cybersecurity audit closeout see [`STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md`](STAGE_2_5_CLOSEOUT_SECURITY_AUDIT.md) and [`STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`](STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md).

Stage 2 is a research prototype and reviewer validation baseline for macOS. These limitations define the controlled security boundary; they are not hidden defects or production claims.

## Current Boundary

- Stage 2 is not a production deployment.
- Stage 2 does not fully solve GPU overlays (Metal/DirectX hooks).
- Stage 2 does not fully solve read-only cheating workflows where a student silently transcribes from external material.
- Stage 2 does not replace an institutional misconduct process.
- Stage 2 does not make automatic misconduct findings.
- Stage 2 does not provide hardware-rooted attestation (Secure Enclave).
- Stage 2 does not defend against kernel-level malware or a compromised operating system.
- Stage 2 does not yet provide Windows or Linux display-affinity scanners (Stage 2.6+).
- Stage 2 macOS scanner results depend on CoreGraphics API behavior and permissions.
- Stage 2 requires institutional red-team validation before production use.
- Stage 2 requires privacy/legal review before institutional deployment.
- Stage 2 requires institutional pilot testing before real-world effectiveness claims.
- Stage 2 is not a biometric identity system.
- Stage 2 does not store screen, webcam, audio, typed answer content, or pasted text content.
- Stage 2 does not store raw process names, raw window titles, usernames, serial numbers, MAC addresses, or file paths.

## Practical Impact

Stage 2 is best understood as a privacy-preserving integrity prototype with hardening around the device-trust boundary for macOS:

- It can detect and score browser-observable behavioral anomalies.
- It can ingest signed OS-level metadata summaries from a macOS localhost daemon.
- It can protect joined sessions against replay and token-boundary attacks.
- It can provide a tamper-evident review record backed by a HMAC audit chain.
- It can escalate risk based on display-affinity metadata (e.g., capture-excluded windows).

It should not be described as a complete endpoint-security product, a final device-integrity platform, or a disciplinary decision engine.

## Stage 2.6 Direction

The Stage 2.6 path is the Windows Display Affinity Scanner. This will leverage the existing browser SDK and signed-proof server logic while introducing native Windows display-affinity detection. Stage 2.6 should begin only after the macOS Stage 2.5 closeout is reviewed.
