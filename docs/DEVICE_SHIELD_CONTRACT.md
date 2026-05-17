# Device Shield Contract

**Status:** authoritative contract for the Stage 2.7 cross-platform Device Shield.
**Sources of truth:** `src/device/daemonProof.js`, `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json`.
**Scope:** macOS and Windows. Linux is explicitly rejected as `unsupported_platform` until Stage 2.8 lands.

This document is the canonical contract that every Simurgh integrity daemon, server validator, report builder, instructor dashboard, and audit script must honour. It enumerates the exact reason codes produced by `validateDaemonProof` and `validateDaemonPairingPayload` at the Stage 2.7 baseline. If behaviour diverges from this document, the implementation is wrong, not the document.

---

## 1. Overview

The Device Shield is a localhost daemon plus signed proof envelope that lets a Simurgh server gain bounded, metadata-only assurance that the candidate's machine is not running display-affinity-based capture-evasion overlays. The shield is split into:

- A native daemon per platform (`tools/simurgh-daemon-macos/`, `tools/simurgh-daemon-windows/`) that holds a P-256 identity, runs a metadata-only display-affinity scanner, and serves signed proofs on `127.0.0.1`.
- A browser SDK (`public/sdk/simurgh-browser-sdk.js`) that brokers between the candidate's exam page and the local daemon for UX purposes only.
- A server-side validator (`src/device/daemonProof.js`) that is the only component the server trusts.

The shield is a research prototype. It does not claim production deployment, MDM/Intune readiness, hardware attestation, kernel visibility, GPU overlay coverage, or automatic misconduct detection.

---

## 2. Supported Platforms

| Platform | Daemon binary                                        | Status (Stage 2.7)                                               |
| -------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| macOS    | `tools/simurgh-daemon-macos/` (Swift / CoreGraphics) | Supported                                                        |
| Windows  | `tools/simurgh-daemon-windows/` (.NET 8 / Win32)     | Supported                                                        |
| Linux    | none                                                 | Rejected (`unsupported_platform`); research target for Stage 2.8 |

See `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md` for the full capability matrix.

---

## 3. Daemon Endpoints

Both platform daemons expose the same HTTP surface on `127.0.0.1`, bound to a configurable port (macOS default `3031`). Canonical descriptions live in `tools/simurgh-daemon-macos/README.md`; the Windows daemon mirrors them.

| Method | Path           | Purpose                                                                                             |
| ------ | -------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/health`      | Liveness only. No identity material.                                                                |
| GET    | `/status`      | UX-only platform/scanner state summary. **Never trusted by the server.** Browser SDK consumer only. |
| POST   | `/pair`        | Returns a signed pairing payload for the current server-issued challenge. See §4.                   |
| POST   | `/proof`       | Returns a signed proof envelope for the current server-issued challenge. See §5.                    |
| POST   | `/session/end` | Cleans up per-session daemon state. No proof content.                                               |

Loopback-only binding, method/body/origin guards, and one-shot challenge consumption are enforced by the daemons and re-asserted by the audit gate (`scripts/security-audit-stage-2-5-closeout.sh` and the Stage 2.7 successor).

---

## 4. Pairing Flow

Reference: `src/device/daemonProof.js:validateDaemonPairingPayload`.

1. Browser SDK requests a `pair` challenge from `POST /api/device/challenge`.
2. SDK forwards the challenge to the local daemon's `POST /pair`.
3. Daemon constructs a `signed_payload` object containing `type = "simurgh.daemon.pair"`, `session_id`, `exam_id`, `challenge`, `timestamp`, `node_id_hash`, `daemon_version`, `platform`, signs the canonicalised JSON with its P-256 private key, and returns `{ node_id_hash, public_key, signature, signed_payload }`.
4. SDK posts the pairing payload to `POST /api/device/pair`. Server runs `validateDaemonPairingPayload`, which performs the checks below in order and stores the public key against the session if all pass.

Canonicalisation: sorted-key JSON of `signed_payload` with the `signature` key excluded (see `canonicaliseDaemonPayload`).

---

## 5. Proof Flow

Reference: `src/device/daemonProof.js:validateDaemonProof`.

1. Browser SDK requests a `proof` challenge from `POST /api/device/challenge`.
2. SDK forwards the challenge to the local daemon's `POST /proof`.
3. Daemon assembles a proof envelope conforming to `docs/schemas/daemon-proof.schema.json`, embeds the latest scanner summary, signs the canonicalised payload, and returns the envelope.
4. SDK attaches the envelope to its next telemetry submission. The server runs `validateDaemonProof` against the paired node; only signed, fresh, schema-conforming, privacy-clean proofs are accepted.

Timestamp window: proofs more than `DAEMON_TIMESTAMP_PAST_MS` (30000 ms) in the past are rejected as `proof_stale`; proofs more than `DAEMON_TIMESTAMP_FUTURE_MS` (5000 ms) in the future are rejected as `proof_in_future`.

---

## 6. Scanner Schema

The full scanner-result shape lives in [`docs/schemas/device-scanner-result.schema.json`](schemas/device-scanner-result.schema.json). Every supported platform emits the same top-level keys; platforms emit `0` for counters that do not apply (e.g. macOS always emits `monitor_only_window_count = 0`).

Required keys: `platform`, `scanner_state`, `scanner_version`, `privacy_mode`.

The proof envelope additionally requires `capture_excluded_window_count` and `helper_state` at the top level (see `docs/schemas/daemon-proof.schema.json`).

---

## 7. Platform-Specific Scanner Mapping

| Concept                       | macOS                                       | Windows                                            |
| ----------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Capture-excluded affinity     | `NSWindow.SharingType.none`                 | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` |
| Monitor-only affinity         | not applicable (always emits `0`)           | `SetWindowDisplayAffinity(WDA_MONITOR)`            |
| Window enumeration API        | CoreGraphics (`CGWindowListCopyWindowInfo`) | Win32 (`EnumWindows` + `GetWindowDisplayAffinity`) |
| Scanner baseline version      | `2.5.0`                                     | `2.6.0`                                            |
| Historic-only `scanner_state` | `unsupported_macos_version`                 | never emitted                                      |

The validator pins `scanner_version` per platform (see `validateScannerFields`); a Windows proof claiming `scanner_version: "2.5.0"` is rejected as `invalid_scanner_version`, and vice versa.

---

## 8. Risk Mapping

From design spec §6.2. The server consumes the scanner summary and applies this mapping (Stage 2.7 extracts it into `src/device/scannerRiskPolicy.js`; behaviour is unchanged).

| Signal                                | Result                                |
| ------------------------------------- | ------------------------------------- |
| `capture_excluded_window_count > 0`   | Critical floor (manual review)        |
| `monitor_only_window_count > 0`       | Warning + manual review               |
| `capture_restricted_window_count > 0` | Warning + manual review               |
| `scanner_state = scanner_unavailable` | Warning if daemon required, else Info |
| `scanner_state = permission_denied`   | Warning + manual review context       |
| `scanner_state = scan_error`          | Warning + manual review context       |
| Invalid proof                         | Reject (existing behaviour)           |
| Raw local field                       | Reject as `forbidden_local_field`     |

Manual-review wording is fixed: _"Manual review recommended. No automatic misconduct finding."_

---

## 9. Privacy Contract

The Device Shield is metadata-only. The validator forbids 29 named raw-local fields anywhere in the proof or pairing payload, scanned recursively through nested objects and arrays via `findForbiddenField`. The current list lives in `src/device/daemonProof.js:26-56`:

```text
device_serial, serial_number, mac_address, username, home_directory,
process_name, process_id, window_title, raw_window_title, window_handle,
hwnd, screenshot, screen_pixels, screen_frame, raw_window, raw_process,
raw_process_name, pid, process_identifier, bundle_path, executable_path,
file_path, microphone, audio, webcam, typed_content, paste_content,
answer_text, answer_content
```

Any of these keys appearing at any depth causes the proof or pairing payload to be rejected with reason `forbidden_local_field`. The browser SDK is similarly forbidden from forwarding such fields.

> **Forward link (Task 3 of the Stage 2.7 plan):** This list will be extracted into `src/device/forbiddenLocalFields.js` so the privacy audit, server validator, and security tests share a single source of truth. That module does not yet exist; the list above is canonical until it does.

---

## 10. Report / Dashboard Contract

The validated proof feeds the report's `device_integrity` section in [`src/academic/reportBuilder.js`](../src/academic/reportBuilder.js) and the matching instructor-dashboard card. Both surfaces use a single, platform-agnostic shape:

```json
{
  "device_integrity": {
    "daemon_platform": "macos|windows|unknown",
    "daemon_final_state": "healthy",
    "scanner_final_state": "healthy",
    "scanner_version": "2.x.x",
    "proofs_verified": 0,
    "proofs_rejected": 0,
    "visible_window_count_max": 0,
    "capture_excluded_window_count_max": 0,
    "capture_restricted_window_count_max": 0,
    "monitor_only_window_count_max": 0,
    "scanner_error_count": 0,
    "privacy_mode": "metadata_only",
    "manual_review_recommendation": "No device-integrity anomaly detected."
  }
}
```

Forbidden phrases in any report or dashboard rendering (enforced by audit test): `cheating detected`, `student guilty`, `automatic misconduct`, `confirmed misconduct`.

---

## 11. Audit Events

Every accept/reject decision is HMAC-audited as a metadata-only event. The audit envelope never contains raw window titles, HWNDs, PIDs, or process names — only state names, counts, hashes, and reason codes from §12.

Audited event names include `DAEMON_PAIRED`, `DAEMON_PAIR_REJECTED`, `DAEMON_PROOF_ACCEPTED`, `DAEMON_PROOF_REJECTED`, `DAEMON_MISSING` (when `SIMURGH_REQUIRE_DAEMON=true`), and `DEVICE_SCANNER_RISK`.

---

## 12. Error Codes

Every reason produced by the validators at the Stage 2.7 baseline. Reviewers and integrators must treat this as the complete enumeration; new codes require a contract update.

### 12.1 `validateDaemonProof`

| Reason code                               | Meaning                                                                                                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proof_not_an_object`                     | Proof was `null`, a primitive, or an array — not a JSON object.                                                                                                                                                                                                      |
| `forbidden_local_field`                   | A forbidden raw-local field name appeared anywhere in the payload.                                                                                                                                                                                                   |
| `missing_field:<name>`                    | A required top-level field was absent, `null`, or `undefined`. `<name>` is one of `type`, `session_id`, `exam_id`, `sequence`, `timestamp`, `node_id_hash`, `daemon_version`, `platform`, `capture_excluded_window_count`, `helper_state`, `challenge`, `signature`. |
| `invalid_type`                            | `type` was not the literal string `simurgh.daemon.proof`.                                                                                                                                                                                                            |
| `unsupported_platform`                    | `platform` was not in `{macos, windows}`.                                                                                                                                                                                                                            |
| `unsupported_daemon_version`              | `daemon_version` was not in the server allow-list.                                                                                                                                                                                                                   |
| `invalid_session_id`                      | `session_id` failed the pattern `/^[A-Za-z0-9_-]{1,64}$/`.                                                                                                                                                                                                           |
| `proof_session_mismatch`                  | `session_id` did not match the expected session bound to the channel.                                                                                                                                                                                                |
| `invalid_exam_id`                         | `exam_id` failed the pattern `/^[A-Za-z0-9_-]{1,80}$/`.                                                                                                                                                                                                              |
| `proof_exam_mismatch`                     | `exam_id` did not match the expected exam.                                                                                                                                                                                                                           |
| `invalid_sequence`                        | `sequence` was not a non-negative integer.                                                                                                                                                                                                                           |
| `invalid_timestamp`                       | `timestamp` was not a parseable ISO-8601 string.                                                                                                                                                                                                                     |
| `proof_in_future`                         | Proof timestamp was more than `DAEMON_TIMESTAMP_FUTURE_MS` ahead of the server clock.                                                                                                                                                                                |
| `proof_stale`                             | Proof timestamp was more than `DAEMON_TIMESTAMP_PAST_MS` behind the server clock.                                                                                                                                                                                    |
| `invalid_node_id_hash`                    | `node_id_hash` did not match `/^sha256:[a-f0-9]{64}$/`.                                                                                                                                                                                                              |
| `daemon_node_not_paired`                  | No paired node was supplied for this session.                                                                                                                                                                                                                        |
| `daemon_node_mismatch`                    | Proof `node_id_hash` did not match the paired node.                                                                                                                                                                                                                  |
| `daemon_public_key_mismatch`              | Stored public key did not re-hash to the stored `node_id_hash`.                                                                                                                                                                                                      |
| `invalid_capture_excluded_window_count`   | Field missing, non-integer, negative, or above 256.                                                                                                                                                                                                                  |
| `invalid_scanner_state`                   | `scanner_state` outside the enum in §6.                                                                                                                                                                                                                              |
| `invalid_scanner_version`                 | `scanner_version` did not match the platform-pinned baseline.                                                                                                                                                                                                        |
| `invalid_scan_timestamp`                  | `scan_timestamp` not a parseable ISO-8601 string.                                                                                                                                                                                                                    |
| `invalid_scan_duration_ms`                | Not a non-negative integer ≤ 60000.                                                                                                                                                                                                                                  |
| `invalid_scan_error_count`                | Not a non-negative integer ≤ 256.                                                                                                                                                                                                                                    |
| `invalid_suspicious_window_count`         | Not a non-negative integer ≤ 256, or less than `capture_excluded + monitor_only`.                                                                                                                                                                                    |
| `invalid_visible_window_count`            | Not a non-negative integer ≤ 10000.                                                                                                                                                                                                                                  |
| `invalid_capture_restricted_window_count` | Not a non-negative integer ≤ 256.                                                                                                                                                                                                                                    |
| `invalid_monitor_only_window_count`       | Not a non-negative integer ≤ 256.                                                                                                                                                                                                                                    |
| `invalid_privacy_mode`                    | `privacy_mode` was not the literal `metadata_only`.                                                                                                                                                                                                                  |
| `invalid_window_fingerprint_hashes`       | Array missing, too long (>256), or any entry not matching `/^sha256:[a-f0-9]{64}$/`.                                                                                                                                                                                 |
| `invalid_helper_state`                    | `helper_state` outside the enum in §3 of `daemon-proof.schema.json`.                                                                                                                                                                                                 |
| `invalid_challenge`                       | Challenge missing, malformed base64url, or not 32 raw bytes.                                                                                                                                                                                                         |
| `invalid_signature_format`                | Signature was not valid base64url.                                                                                                                                                                                                                                   |
| `invalid_signature`                       | P-256 verification of the canonicalised payload failed.                                                                                                                                                                                                              |

### 12.2 `validateDaemonPairingPayload`

| Reason code                    | Meaning                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pairing_not_an_object`        | Top-level pairing message was not a JSON object.                                                                                                                          |
| `signed_payload_not_an_object` | `signed_payload` was missing or not a JSON object.                                                                                                                        |
| `forbidden_local_field`        | A forbidden raw-local field name appeared anywhere in the pairing payload.                                                                                                |
| `missing_field:<name>`         | A required `signed_payload` field was absent. `<name>` is one of `type`, `session_id`, `exam_id`, `challenge`, `timestamp`, `node_id_hash`, `daemon_version`, `platform`. |
| `invalid_type`                 | `type` was not the literal `simurgh.daemon.pair`.                                                                                                                         |
| `unsupported_platform`         | `platform` was not in `{macos, windows}`.                                                                                                                                 |
| `unsupported_daemon_version`   | `daemon_version` was not in the server allow-list.                                                                                                                        |
| `pairing_session_mismatch`     | `session_id` did not match the expected session.                                                                                                                          |
| `pairing_exam_mismatch`        | `exam_id` did not match the expected exam.                                                                                                                                |
| `invalid_timestamp`            | `timestamp` was not parseable.                                                                                                                                            |
| `pairing_in_future`            | Pairing timestamp more than `DAEMON_TIMESTAMP_FUTURE_MS` ahead of the server clock.                                                                                       |
| `pairing_stale`                | Pairing timestamp more than `DAEMON_TIMESTAMP_PAST_MS` behind the server clock.                                                                                           |
| `invalid_public_key`           | `public_key` could not be parsed as SPKI DER.                                                                                                                             |
| `node_id_hash_mismatch`        | Either the SDK-supplied `node_id_hash` or the in-payload `node_id_hash` did not match the SHA-256 of the public key.                                                      |
| `invalid_signature`            | P-256 verification of the canonicalised `signed_payload` failed.                                                                                                          |

---

## 13. Non-Claims

Stage 2.7 does **not** claim:

- Production deployment readiness.
- Windows Service or macOS notarised packaging.
- MDM/Intune readiness.
- Hardware attestation.
- Kernel-level visibility.
- GPU overlay coverage.
- Automatic misconduct detection.
- Linux parity.

It does **not** collect: screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.

Preserved wording: _"Research prototype only. Manual review recommended. No automatic misconduct finding."_

---

## 14. Verification Matrix

| Surface                           | Verifier                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Unit suite                        | `npm test`                                                                                                 |
| Stage 2.3 daemon smoke            | `scripts/smoke-stage-2-3-macos-daemon.sh`                                                                  |
| Stage 2.4/2.5 macOS scanner smoke | `scripts/smoke-stage-2-5-macos-scanner.sh`                                                                 |
| Stage 2.5 closeout audit          | `scripts/security-audit-stage-2-5-closeout.sh`                                                             |
| Stage 2.6 Windows scanner smoke   | `scripts/smoke-stage-2-6-windows-scanner.sh`                                                               |
| Stage 2.7 cross-platform smoke    | `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` (added by Task 6 of the Stage 2.7 plan)          |
| Stage 2.7 cross-platform audit    | `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` (added by Task 7 of the Stage 2.7 plan) |
| Privacy audit                     | `node tools/privacy-audit.mjs`                                                                             |
| Full gate                         | `scripts/check.sh`                                                                                         |
