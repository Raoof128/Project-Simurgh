# Stage 2 macOS Device Shield Closeout

**Version:** 0.4.10
**Status:** Complete and Frozen
**Date:** 2026-05-16 (Australia/Sydney)

## 1. Executive Summary

The macOS Device Shield research prototype is complete, tested, audited, and frozen. This closeout documentation confirms that the Stage 2 mission — establishing a privacy-preserving, OS-level integrity bridge for macOS — has met all research-prototype success criteria.

Stage 2.6 (Windows Display Affinity Scanner) is the next scheduled implementation stage.

## 2. Scope

- **macOS localhost daemon:** Native Swift service providing OS-level integrity signals.
- **Browser SDK bridge:** Reusable JavaScript SDK for browser-to-daemon communication.
- **Daemon lifecycle controls:** Development-only start/stop/status/doctor/reset commands.
- **Metadata-only scanner:** CoreGraphics-backed affinity detection without screen capture.
- **Signed proof flow:** P-256 signatures for tamper-evident OS-level attestation.
- **Cybersecurity gate:** Dedicated audit for forbidden-field rejection and daemon hardening.

## 3. Release Timeline

| Release   | Purpose                                         |
| --------- | ----------------------------------------------- |
| `v0.4.5`  | macOS localhost daemon and signed daemon proofs |
| `v0.4.6`  | Browser SDK and daemon lifecycle hardening      |
| `v0.4.7`  | macOS CoreGraphics metadata affinity scanner    |
| `v0.4.8`  | Stage 2.4/2.5 E2E smoke closeout                |
| `v0.4.9`  | Stage 2.2/2.3 E2E smoke closeout                |
| `v0.4.10` | Stage 2.5 cybersecurity audit and hardening     |

## 4. Architecture

Simurgh Stage 2 utilizes a sidecar architecture. A native macOS daemon (`SimurghDaemon`) runs locally on the student's machine, binding to `127.0.0.1`. The browser client, via the `simurgh-browser-sdk`, probes this daemon to fetch signed integrity proofs.

1. **Discovery:** Browser probes `127.0.0.1:3031`.
2. **Challenge:** Server issues a single-use 32-byte challenge.
3. **Proof:** Daemon signs the challenge + scanner metadata with its P-256 private key.
4. **Ingest:** Browser attaches the `daemon_proof` to behavioral telemetry.
5. **Verify:** Server validates the signature, challenge, and privacy contract.

## 5. Trust Boundaries

- **Daemon:** Only accepts requests from `127.0.0.1`. Requires `X-Simurgh-Local-Client: browser` for sensitive POST actions.
- **Keychain:** Daemon identity is stored in the macOS Keychain, preventing simple file-copying of the private key.
- **Server:** Rejects all proofs with invalid signatures, replayed challenges, or forbidden local-data fields.

## 6. macOS Daemon Lifecycle

- **Start:** `simurgh-daemon start` (via LaunchAgent).
- **Stop:** `simurgh-daemon stop`.
- **Status:** `simurgh-daemon status`.
- **Doctor:** `simurgh-daemon doctor` (redacts sensitive config).
- **Identity:** `simurgh-daemon reset-identity`.

## 7. Browser SDK Integration

The `public/sdk/simurgh-browser-sdk.js` provides a clean API for the student exam page:

- `SimurghSDK.discoverDaemon()`
- `SimurghSDK.pairWithDaemon(challenge)`
- `SimurghSDK.fetchDaemonProof(challenge)`
- `SimurghSDK.sendTelemetry(sessionToken, telemetry, daemonProof)`

## 8. Scanner Design

The `AffinityScanner` (Swift) enumerates visible windows using `CGWindowListCopyWindowInfo`.

- **Filtering:** Ignores desktop background, tiny windows (< 100px), and system menu bars.
- **Detection:** Checks `kCGWindowSharingState` for `SharingNone` (affinity exclusion).
- **Output:** Returns aggregate counts only: `visible_window_count` and `capture_excluded_window_count`.

## 9. Signed Proof Flow

Payloads are canonicalised to a deterministic JSON string before signing. The server verifies the signature against the registered public key for that session's node.

## 10. Risk and Manual Review Policy

**Manual review required. No automatic misconduct finding.**

Simurgh escalates risk scores and triggers AI narrative only as an assistance tool for human invigilators.

## 11. Privacy Model

- **Metadata-only:** No pixels, no audio, no typed content, no names.
- **Anonymised:** Node IDs are SHA-256 hashes of public keys.
- **Local-first:** Raw OS data never leaves the daemon; only signed summaries are transmitted.

## 12. Security Controls

- **HMAC Audit Chain:** Links every server verdict to a tamper-evident chain.
- **Recursive Forbidden-Field Rejection:** Server-side validator explicitly blocks sensitive keys.
- **Rate Limiting:** Protects `/api/integrity/proofs` from brute-force attempts.

## 13. E2E Smoke Coverage

Two dedicated smoke packs verify the Stage 2 mission:

- `scripts/smoke-stage-2-2-2-3.sh`: Pairing and daemon proof foundation.
- `scripts/smoke-stage-2-4-2-5.sh`: SDK, scanner, and daemon lifecycle.

## 14. Cybersecurity Audit Coverage

- `scripts/security-audit-stage-2-4-2-5.sh`: Recursive rejection, daemon hardening, LaunchAgent safety.

## 15. Verification Commands

```bash
npm test
node tools/privacy-audit.mjs
./scripts/smoke-stage-2-2-2-3.sh
./scripts/smoke-stage-2-4-2-5.sh
./scripts/security-audit-stage-2-4-2-5.sh
./scripts/check.sh
cd tools/simurgh-daemon-macos && swift test && swift build && swift build -c release
```

## 16. Known Limitations

- **GPU Overlays:** Metal/DirectX hooks are out of scope for Stage 2.
- **Read-Only Cheating:** Silent reading without input events is not detectable via telemetry.

## 17. Out-of-Scope Production Controls

- **Notarisation:** Not signed with Developer ID.
- **MDM Deployment:** No configuration profile support.
- **Hardware Attestation:** Not Secure Enclave-backed.

## 18. Stage 2.6 Readiness

The macOS Device Shield is frozen. Stage 2.6 will introduce the Windows Display Affinity Scanner using the same server-side verification and SDK bridge patterns.

## 19. Reviewer Checklist

See [docs/STAGE_2_MACOS_REVIEWER_CHECKLIST.md](STAGE_2_MACOS_REVIEWER_CHECKLIST.md) for detailed verification steps.

## 20. TL;DR

```text
macOS Device Shield research prototype is complete, tested, audited, and frozen.
Windows work begins in Stage 2.6.
```
