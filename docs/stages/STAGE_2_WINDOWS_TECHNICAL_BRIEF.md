<div align="center">
<img src="Project-Simurgh-Logo.png" alt="Project Simurgh Logo" width="220"/>
</div>

# Stage 2 Windows Device Shield — Technical Brief

**From Invisible Window to Signed Proof: Windows Display-Affinity Detection**

_A reviewer-facing technical summary of the Windows Device Shield path from research problem to real-device validated mitigation._

**Author:** Raouf Abedini — Final-year Cyber Security student, Macquarie University
**Status:** Stage 2.6 closed · v0.4.12 · Stage 2.7 unified · v0.4.13 · Ready for external technical review
**Date:** 2026-05-17

---

## 1. Executive Summary

The Windows Device Shield detects `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE` display-affinity flags through a metadata-only .NET 8 daemon scanner, signs scanner summaries inside P-256 daemon proofs, verifies them server-side, and reflects them in risk verdicts, session reports, the instructor dashboard, and the tamper-evident audit chain.

Validated on Windows 10 Pro build 19045. The daemon runs as a localhost research process — not a production Windows Service, not MDM/Intune managed, not kernel-level.

Every anomaly is a signal for manual human review. No automatic misconduct finding is ever produced.

---

## 2. Research Link: The Invisible Window on Windows

The _Invisible Window_ disclosure (Abedini, 2026) documents a structural vulnerability in browser-based proctoring and AI UI-vision pipelines. On Windows, `SetWindowDisplayAffinity` with `WDA_EXCLUDEFROMCAPTURE` renders a window fully visible on the physical display while producing zero pixels in any W3C `getDisplayMedia()` capture output. `WDA_MONITOR` similarly restricts screen-capture visibility.

These are documented, unprivileged OS APIs — no admin rights required. Commercial AI-overlay tools have re-purposed them to deliver live AI output during exams and technical interviews without appearing in screen recordings.

The PoC lives at `tools/invisible-window-poc/`. Simurgh's Windows daemon closes the gap by querying display-affinity flags directly at the OS level, bypassing the capture surface entirely.

---

## 3. Stage 2.6 Scope

Stage 2.6 (`v0.4.12-stage-2-6-windows-display-affinity-scanner`) delivers:

- A .NET 8 localhost daemon under `tools/simurgh-daemon-windows/`.
- A Win32 `GetWindowDisplayAffinity` scanner that enumerates visible window metadata.
- `WDA_MONITOR` → `restricted_detected` + `monitor_only_window_count` increment.
- `WDA_EXCLUDEFROMCAPTURE` → `risk_detected` + `capture_excluded_window_count` increment.
- Signed P-256 scanner summaries inside daemon proofs.
- Server-side proof verification, risk escalation, report/dashboard/audit integration.
- A controlled `SimurghAffinityFixture` for local validation with `none`, `monitor`, and `exclude` modes.
- Real-device validation on Windows 10 Pro build 19045.

---

## 4. Stage 2.7 Cross-Platform Contract Link

Stage 2.7 (`v0.4.13-stage-2-7-cross-platform-device-shield`) unified the macOS and Windows Device Shield surfaces. The Windows scanner now operates under a shared contract documented in:

- [`DEVICE_SHIELD_CONTRACT.md`](../DEVICE_SHIELD_CONTRACT.md) — canonical proof/scanner/privacy/risk/report/audit contract
- [`DEVICE_SHIELD_PLATFORM_MATRIX.md`](../DEVICE_SHIELD_PLATFORM_MATRIX.md) — capability matrix
- [`docs/schemas/daemon-proof.schema.json`](../schemas/daemon-proof.schema.json) — JSON Schema draft-07
- [`docs/schemas/device-scanner-result.schema.json`](../schemas/device-scanner-result.schema.json) — JSON Schema draft-07

The Windows .NET daemon code was not modified by Stage 2.7. What changed is that the Node server validator now consumes shared modules (`forbiddenLocalFields`, `platformScannerSchema`, `scannerRiskPolicy`) that codify the contract the Windows daemon has been emitting since v0.4.12.

---

## 5. Windows Threat Model

| Threat                                              | Covered | Mechanism                                                        |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `WDA_EXCLUDEFROMCAPTURE` capture-invisible overlay  | ✅      | Win32 `GetWindowDisplayAffinity` scanner → `risk_detected`       |
| `WDA_MONITOR` display-restricted overlay            | ✅      | Win32 `GetWindowDisplayAffinity` scanner → `restricted_detected` |
| Signed proof tamper (post-signing field mutation)   | ✅      | P-256 signature check → `invalid_signature`                      |
| Replayed proof (challenge reuse)                    | ✅      | Single-use challenge → `consumed_challenge`                      |
| Raw local-field leak (HWND, PID, process name etc.) | ✅      | `containsForbiddenLocalFieldDeep` → `forbidden_local_field`      |
| Unsupported platform injection (e.g. linux)         | ✅      | `SUPPORTED_DEVICE_PLATFORMS` check → `unsupported_platform`      |
| Click-through overlays (`WS_EX_TRANSPARENT`)        | Partial | No focus event; documented limitation                            |
| GPU-layer overlays (DirectX/Metal hooks)            | No      | Stage 4 research track                                           |
| Kernel-level rootkit                                | No      | Out of research-prototype scope                                  |

---

## 6. Windows Daemon Architecture

```
Browser (Simurgh SDK)
  │
  ├── discovers daemon at 127.0.0.1:3031 (/health, /status)
  ├── requests pair challenge (/api/device/challenge)
  ├── pairs daemon (/api/device/pair → P-256 signed pairing payload)
  └── attaches signed daemon_proof to each /api/telemetry POST

Windows Daemon (.NET 8, tools/simurgh-daemon-windows/)
  │
  ├── localhost-only HTTP server (127.0.0.1:3031)
  ├── P-256 ephemeral identity (ECDSA, SPKI DER, base64url)
  ├── Win32 scanner thread (GetWindowDisplayAffinity loop)
  │     └── metadata-only: visible window count, affinity counts, no raw identifiers
  ├── signs scanner summary into daemon proof (ECDSA P-256 sha256)
  └── proof fields: session_id, exam_id, sequence, timestamp, node_id_hash,
                    daemon_version, platform=windows, capture_excluded_window_count,
                    monitor_only_window_count, scanner_state, scanner_version=2.6.0,
                    privacy_mode=metadata_only, challenge, signature

Node Server (src/device/)
  │
  ├── validateDaemonPairingPayload — authenticates node identity
  ├── validateDaemonProof — verifies P-256 signature over canonical JSON
  ├── validateScannerSummary (platformScannerSchema) — validates scanner fields
  ├── containsForbiddenLocalFieldDeep (forbiddenLocalFields) — raw-field rejection
  ├── mapScannerSummaryToRisk (scannerRiskPolicy) — risk escalation
  └── recordProofVerified (daemonState) — updates session device-integrity record
```

---

## 7. Display Affinity Scanner Design

The Windows scanner operates on metadata only — it never reads, stores, or transmits:

- HWND values
- PIDs / process identifiers
- Process names
- Executable paths
- Window titles
- Raw window handles

It calls `GetWindowDisplayAffinity` on visible, non-trivially-sized windows to detect `WDA_MONITOR` or `WDA_EXCLUDEFROMCAPTURE` flags. The output is a **count summary** inside the signed proof:

```json
{
  "scanner_state": "risk_detected",
  "scanner_version": "2.6.0",
  "capture_excluded_window_count": 1,
  "capture_restricted_window_count": 0,
  "monitor_only_window_count": 0,
  "visible_window_count": 8,
  "suspicious_window_count": 1,
  "privacy_mode": "metadata_only",
  "window_fingerprint_hashes": ["sha256:..."]
}
```

Window fingerprint hashes are SHA-256 of a privacy-safe window position/size tuple — no title, no process name, no handle.

---

## 8. Controlled Affinity Fixture

`SimurghAffinityFixture` (`tools/simurgh-daemon-windows/src/SimurghAffinityFixture/`) provides a controlled local validation path for three modes:

| Mode      | `SetWindowDisplayAffinity` call      | Expected scanner state |
| --------- | ------------------------------------ | ---------------------- |
| `none`    | `WDA_NONE` — normal desktop window   | `healthy`, counts = 0  |
| `monitor` | `WDA_MONITOR` — capture restricted   | `restricted_detected`  |
| `exclude` | `WDA_EXCLUDEFROMCAPTURE` — invisible | `risk_detected`        |

The fixture is a development-only validation tool. It is clearly labelled in code and documentation as a controlled test artefact. It does not ship to end users, claim production validity, or bypass any security gate.

---

## 9. Signed Proof Flow

```
1. Browser SDK requests pair challenge from server
     POST /api/device/challenge → { challenge: "<32 bytes base64url>" }

2. Windows daemon signs canonical pairing payload with P-256 private key
     { type, session_id, exam_id, challenge, timestamp, node_id_hash,
       daemon_version, platform: "windows" }

3. Server validates pairing signature, registers node public key
     POST /api/device/pair → 200 OK

4. Per telemetry cycle (every 5s):
   a. Browser requests proof challenge
      POST /api/device/challenge → { challenge }
   b. Windows daemon scans windows, builds proof, signs with P-256:
      { type: "simurgh.daemon.proof", session_id, exam_id, sequence,
        timestamp, node_id_hash, daemon_version, platform: "windows",
        capture_excluded_window_count, monitor_only_window_count,
        scanner_state, scanner_version: "2.6.0", ..., challenge, signature }
   c. Browser attaches proof to telemetry POST
      POST /api/telemetry { ..., daemon_proof: { ... } }

5. Server:
   a. validateDaemonProof → verify P-256 signature, timestamp, sequence
   b. validateScannerSummary → verify scanner fields, version pin (2.6.0)
   c. containsForbiddenLocalFieldDeep → reject any raw identifier
   d. mapScannerSummaryToRisk → escalate verdict if excluded count > 0
   e. recordProofVerified → update session device-integrity record
   f. buildReport → include device_integrity with daemon_platform: "windows"
```

---

## 10. Server Verification

The server verifies every Windows daemon proof before trusting any scanner field:

| Check                                         | Failure reason                    |
| --------------------------------------------- | --------------------------------- |
| Proof is an object, not an array              | `proof_not_an_object`             |
| Forbidden raw field anywhere in payload       | `forbidden_local_field`           |
| All required fields present                   | `missing_field:<name>`            |
| `platform` in `["macos", "windows"]`          | `unsupported_platform`            |
| `daemon_version` supported                    | `unsupported_daemon_version`      |
| Timestamp within ±30s / +5s                   | `proof_stale` / `proof_in_future` |
| `node_id_hash` matches paired node            | `daemon_node_mismatch`            |
| Public key recomputes to `node_id_hash`       | `daemon_public_key_mismatch`      |
| `scanner_version === "2.6.0"` for Windows     | `invalid_scanner_version`         |
| All scanner counts non-negative, in range     | `invalid_<field>`                 |
| `suspicious_count >= excluded + monitor_only` | `invalid_suspicious_window_count` |
| P-256 signature over canonical JSON           | `invalid_signature`               |

---

## 11. Risk Mapping

| Signal                                | Risk              | Note                              |
| ------------------------------------- | ----------------- | --------------------------------- |
| `capture_excluded_window_count > 0`   | Critical floor    | `WDA_EXCLUDEFROMCAPTURE` detected |
| `monitor_only_window_count > 0`       | Warning           | `WDA_MONITOR` detected            |
| `capture_restricted_window_count > 0` | Warning           | Restricted window detected        |
| `scanner_state = scanner_unavailable` | Warning           | Daemon required but scanner down  |
| `scanner_state = permission_denied`   | Warning           | Scanner permission lost           |
| Daemon not paired / stale / untrusted | Graduated warning | Documented thresholds             |
| Invalid proof signature               | Rejected          | Not scored                        |
| Raw local field in proof              | Rejected          | `forbidden_local_field`           |

All risk verdicts are heuristic. Every Warning and Critical result requires manual human review. No automatic misconduct finding is produced.

---

## 12. Report, Dashboard, and Audit Integration

A session report (`GET /api/sessions/:id/report`) includes:

```json
{
  "device_integrity": {
    "daemon_platform": "windows",
    "daemon_final_state": "healthy",
    "scanner_final_state": "healthy",
    "scanner_version": "2.6.0",
    "proofs_verified": 12,
    "capture_excluded_window_count_max": 0,
    "capture_restricted_window_count_max": 0,
    "monitor_only_window_count_max": 0,
    "privacy_mode": "metadata_only",
    "manual_review_recommendation": "No device-integrity anomaly detected."
  }
}
```

On risk detection:

```json
{
  "manual_review_recommendation": "Manual review recommended. No automatic misconduct finding."
}
```

The instructor dashboard displays platform, daemon state, scanner state, and aggregate window counts in real time via SSE. All anomalies use the same manual-review wording.

Each daemon event is appended to the HMAC-SHA256 tamper-evident audit chain. The chain is verifiable via `GET /api/audit/:id/verify`.

---

## 13. Privacy Contract

The Windows scanner emits **metadata only**. The following are never collected, stored, transmitted, or logged:

| Category         | Examples of what is never collected                      |
| ---------------- | -------------------------------------------------------- |
| Window identity  | HWND, window handle, window title, raw window title      |
| Process identity | PID, process name, executable path, bundle path          |
| Device identity  | Username, home directory, serial number, MAC address     |
| Visual data      | Screen pixels, screenshots, screen frames, webcam frames |
| Audio            | Microphone data, audio data                              |
| Content          | Typed content, paste content, typed answers              |
| Biometric        | Face data, biometric data                                |

The canonical forbidden-field list lives in `src/device/forbiddenLocalFields.js` and is enforced recursively by the proof validator, the privacy audit CLI, and the Stage 2.7 security audit gate.

---

## 14. E2E Smoke Coverage

| Script                                                    | What it covers                                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/smoke-stage-2-6-windows-scanner.sh`              | Stage 2.6 Windows: healthy proof, WDA_MONITOR, WDA_EXCLUDEFROMCAPTURE, tamper reject, raw-field reject, report/audit verify                                               |
| `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` | Scenarios A–G: macOS + Windows healthy, macOS excluded Critical, Windows monitor-only Warning, Windows excluded Critical, Linux unsupported_platform, raw-field rejection |
| `scripts/smoke-stage-2-6-2-7-closeout.sh`                 | Umbrella: runs both above + privacy audit                                                                                                                                 |

---

## 15. Cybersecurity Audit Coverage

| Script                                                             | What it covers                                                                                                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/security-audit-stage-2-4-2-5.sh`                          | SDK token/proof boundaries, daemon loopback, LaunchAgent safety, dashboard/report wording, privacy+npm audit                                                   |
| `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` | Tampered platform/scanner fields, unsupported platform, raw-field rejection, pairing forbidden-field, SDK trust-boundary echo, FROZEN_FIELD_NAMES immutability |
| `scripts/security-audit-stage-2-6-2-7-closeout.sh`                 | Umbrella: nine audit dimensions (proof, scanner, platform, daemon, SDK, report, dashboard, privacy, wording)                                                   |

---

## 16. Real Windows Laptop Validation

Platform: Windows 10 Pro build 19045
Toolchain: Git 2.53.0, Node 24.14.0, npm 11.9.0, .NET 8.0.421

| Test                                   | Result                                                |
| -------------------------------------- | ----------------------------------------------------- |
| Normal desktop scan (WDA_NONE fixture) | Zero restricted/excluded counts                       |
| WDA_MONITOR fixture                    | `restricted_detected`, `monitor_only_window_count: 1` |
| WDA_EXCLUDEFROMCAPTURE fixture         | `risk_detected`, `capture_excluded_window_count: 1`   |
| Live signed proof accepted             | ✅                                                    |
| Tampered proof rejected                | ✅ `invalid_signature`                                |
| Replayed proof rejected                | ✅ consumed challenge                                 |
| Raw `hwnd` in proof rejected           | ✅ `forbidden_local_field`                            |
| Report/dashboard/audit                 | ✅ verified                                           |
| Privacy sweep                          | ✅ passed                                             |

Full AGENT.md entry: 2026-05-16 Stage 2.6B Windows Display Affinity Scanner Real-Device Validation.

---

## 17. Known Limitations

| Limitation                                   | Status                                                           |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Click-through overlays (`WS_EX_TRANSPARENT`) | Not detected — no focus event fired; documented in `SECURITY.md` |
| GPU-layer overlays (DirectX hooks)           | Stage 4 research track                                           |
| Kernel-level rootkit                         | Out of research-prototype scope                                  |
| Production Windows Service                   | Not implemented — research prototype only                        |
| MDM/Intune managed deployment                | Not implemented                                                  |
| Hardware attestation                         | Not implemented                                                  |
| Automatic misconduct detection               | Never in scope                                                   |
| Linux scanner                                | Stage 2.8 research                                               |

---

## 18. Non-Claims

This implementation **does not** claim:

- Production Windows Service deployment readiness
- MDM/Intune or Group Policy deployment readiness
- Hardware attestation or TPM integration
- Kernel-level visibility into privileged processes
- GPU-layer or DirectX overlay detection
- Automatic misconduct detection or finding
- Collection of raw HWNDs, PIDs, process names, window titles, usernames, home directories, serial numbers, MAC addresses, screen pixels, screenshots, webcam frames, microphone audio, typed content, or pasted content

Manual review is recommended for any Warning or Critical verdict. No system component ever automatically determines misconduct.

---

## 19. Reviewer Checklist

See [`STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md`](STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md) for the complete gate-level checklist.

---

## 20. TL;DR

```text
Stage 2 Windows Device Shield:
  Platform:   Windows 10 Pro build 19045
  Daemon:     .NET 8, 127.0.0.1:3031, ephemeral P-256 identity
  Scanner:    Win32 GetWindowDisplayAffinity, metadata-only
  WDA_MONITOR:            → restricted_detected, manual review
  WDA_EXCLUDEFROMCAPTURE: → risk_detected, Critical floor
  Proof:      P-256 signed, server-verified, tamper/replay/raw-field protected
  Privacy:    no HWND, no PID, no process name, no window title, no content
  Verdict:    heuristic only, manual review required for Warning/Critical
  Claims:     research prototype, not production, not MDM, not attestation
```
