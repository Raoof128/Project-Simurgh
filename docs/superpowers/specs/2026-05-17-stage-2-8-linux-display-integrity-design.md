# Stage 2.8 — Linux Display Integrity Research

**Status:** Design **approved** (Raouf, 2026-05-17, 9/10 → ready after 4 fixes applied: fail-code/reason split, unknown-platform regression scenario, portal_active hard rule, scanner_reason=none invariant + red-test checklist).
**Baseline:** `v0.4.13-stage-2-windows-device-shield-closeout` on `main`.
**Target release umbrella:** `v0.4.18-stage-2-8-linux-display-integrity-closeout`.
**Branch:** `stage-2-8-linux-display-integrity-research`.
**Posture:** Research prototype only. Reviewer-grade engineering, NOT a production endpoint claim.

---

## 1. Mission

> Stage 2.8 adds a **signed, metadata-only Linux Device Shield research baseline** with X11 scanner support, Wayland-aware integrity states (honest about compositor restrictions), privacy-preserving proof validation, and real-device validation across selected Linux desktop environments — without weakening the Stage 2.7 cross-platform contract.

Linux is added to `SUPPORTED_DEVICE_PLATFORMS` **only after** the server has tests proving Linux proofs are signed, validated, privacy-checked, and rejected when raw fields appear.

The Simurgh privacy rule remains sacred:

> No screen pixels. No webcam. No audio. No typed/pasted content. No raw process names. No raw window titles. No raw local identifiers. Manual review only.

---

## 2. Non-Claims (must be preserved verbatim in docs)

Stage 2.8 does **not** claim:

- Production Linux endpoint deployment.
- Kernel-level visibility.
- Hardware attestation (no TPM, no Secure Boot, no measured-boot claim).
- Universal Wayland window enumeration.
- Full compositor parity with macOS/Windows.
- GPU overlay detection.
- Automatic misconduct detection.
- Raw window/process visibility.
- Screen-capture truth.

Correct public claim:

> Stage 2.8 adds a signed, metadata-only Linux Device Shield research baseline with X11 scanner support, Wayland-aware integrity states, privacy-preserving proof validation, and real-device validation across selected Linux desktop environments.

---

## 3. Reality Check Against Current Code (verified 2026-05-17)

| Capability                                                    | Current location                         | Stage 2.8 action                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPPORTED_DEVICE_PLATFORMS = ["macos", "windows"]`           | `src/device/platformScannerSchema.js:5`  | Add `"linux"` only after server tests pass.                                                                                            |
| `validateScannerSummary(raw)` shaped to macOS/Windows signals | `src/device/platformScannerSchema.js:61` | Refactor to dispatcher → `validateMacOSScannerSummary` / `validateWindowsScannerSummary` / `validateLinuxScannerSummary`, shared base. |
| `daemonProof.js` unsupported_platform rejection               | `src/device/daemonProof.js:102, 220`     | Continue rejecting unknown platforms; accept `"linux"` post-schema.                                                                    |
| `daemonPairing.js` platform gate                              | `src/device/daemonPairing.js`            | Add Linux + negative tests for pre-Linux pairing rejection.                                                                            |
| `daemonEvents.js` platform-aware events                       | `src/device/daemonEvents.js`             | Add Linux event emission paths + `display_server_mismatch` event.                                                                      |
| `forbiddenLocalFields.js` recursive blocklist                 | `src/device/forbiddenLocalFields.js`     | Reuse unchanged. Linux daemon must produce zero raw fields.                                                                            |
| `scannerRiskPolicy.js`                                        | `src/device/scannerRiskPolicy.js`        | Extend with Linux states (no behaviour regression for macOS/Windows).                                                                  |
| macOS daemon on `127.0.0.1:3031` (Swift)                      | `tools/simurgh-daemon-macos/`            | Linux daemon shares port `3031` — one OS per device, one daemon per device.                                                            |
| Windows daemon on `127.0.0.1:3031` (.NET)                     | `tools/simurgh-daemon-windows/`          | Same.                                                                                                                                  |
| Privacy audit                                                 | `tools/privacy-audit.mjs`                | Extend to Linux daemon paths + new Linux scanner fields.                                                                               |
| CI Quality Gate (Node-only today)                             | GitHub Actions                           | Add stable Rust toolchain + Ubuntu job (fmt/clippy/test + Xvfb X11 tests).                                                             |

**Implication:** the Stage 2.7 shared-module seams are exactly the right seams. Stage 2.8 is **add a new platform adapter**, not refactor the contract.

---

## 4. Scope

### In scope

- New Rust daemon: `tools/simurgh-daemon-linux/` (axum + serde + p256 + sha2 + x11rb + zbus + tokio).
- Display session detector (X11 / Wayland / XWayland / headless / unknown) with normalised output.
- X11 metadata scanner using `_NET_CLIENT_LIST`, `_NET_CLIENT_LIST_STACKING`, `_NET_WM_WINDOW_TYPE`, `_NET_WM_STATE`.
- Wayland portal probe split into `portal_advertised` (DBus name probe) and `portal_active` (capability probe, no consent prompt).
- XWayland partial-coverage handling.
- P-256 signed proof flow identical in shape to macOS/Windows, with Linux-specific scanner summary.
- Server-side platform-specific scanner validator + dispatcher.
- Session-locked `display_server` with `display_server_mismatch` rejection.
- Non-local `$DISPLAY` refusal (privacy/security boundary).
- Sandboxed-browser hint detection (UX-only signal).
- systemd `--user` unit + install/uninstall/check scripts.
- GitHub Actions Ubuntu CI job (Rust toolchain + Xvfb).
- Browser SDK discovery at `127.0.0.1:3031` with Linux platform awareness (UX-only; server trust unchanged).
- Report, dashboard, audit, privacy-audit integration.
- Cross-platform smoke + cybersecurity audit gates for Linux.
- Real-device validation matrix.
- Reviewer-facing docs.

### Out of scope

| Out of scope                               | Why                                            |
| ------------------------------------------ | ---------------------------------------------- |
| Distro packaging (.deb/.rpm/AppImage/Snap) | Production packaging stage, not research       |
| systemd system-wide unit                   | Research-prototype runs under user session     |
| Hardware attestation / TPM-backed identity | Not a current research capability              |
| Universal Wayland surface enumeration      | Compositor security model prohibits it         |
| GPU overlay coverage                       | Stage 4 research track                         |
| Automatic misconduct decisions             | Never the current model                        |
| Production browser-confinement workarounds | Reviewer evidence runs use unconfined browsers |
| Kernel-level visibility                    | Out of current research-prototype scope        |
| MDM/Intune deployment                      | Enterprise deployment stage                    |

Preserved wording: _"Research prototype only. Manual review recommended. No automatic misconduct finding."_

---

## 5. Architecture

```text
Browser SDK (Linux)
  │
  │ discovers localhost daemon at 127.0.0.1:3031
  ▼
Linux Daemon: tools/simurgh-daemon-linux/  (Rust)
  ├─ axum HTTP (loopback only, method allowlist, body limits, CORS allowlist)
  ├─ identity (P-256, $XDG_STATE_HOME/simurgh/daemon-identity.pem, 0600/0700)
  ├─ proof signing (canonical JSON sort, sha256 + ECDSA-P256)
  ├─ session detector (XDG_SESSION_TYPE / WAYLAND_DISPLAY / DISPLAY / desktop family)
  ├─ X11 scanner (x11rb, EWMH metadata, non-local DISPLAY refusal)
  ├─ Wayland scanner (zbus, portal_advertised + portal_active)
  ├─ XWayland scanner (X11 scanner against XWayland-visible windows, partial coverage)
  └─ privacy filter (strip all raw fields before emission)
  │
  │ POST /proof  (signed payload, Linux scanner summary)
  ▼
Node Server (Stage 2.7 contract, extended)
  ├─ daemonPairing.js: Linux platform acceptance
  ├─ daemonProof.js: signature + freshness + replay + Linux dispatcher
  ├─ platformScannerSchema.js: validateLinuxScannerSummary (shared base + Linux signals)
  ├─ display_server lock per session (first proof wins)
  ├─ scannerRiskPolicy.js: Linux state → risk mapping (Warning context for limited coverage)
  ├─ forbiddenLocalFields.js: recursive raw-field rejection (unchanged)
  ├─ daemonEvents.js: emit DAEMON_PROOF_REJECTED with display_server_mismatch reason
  ├─ reportBuilder.js: device_integrity.linux_coverage
  └─ audit chain (HMAC-SHA256, unchanged)
  ▼
Instructor Dashboard + Report
```

---

## 6. Linux Real-World Platform Hazards

These are mandatory acceptance criteria, not side notes. P0 unless flagged.

### 6.1 Sandboxed-browser loopback (P0)

Sandboxed browser packages may behave differently around localhost discovery, loopback networking, protocol handlers, portals, and host service access. Stage 2.8 evidence runs should detect package confinement and recommend unconfined browsers for reviewer validation.

- Browser SDK records UX-only `browser_package_hint`: `snap | flatpak | deb | rpm | appimage | unknown`.
- Server **never trusts** browser-reported package hint — UX-only signal.
- Reviewer evidence runs SHOULD use unconfined distro browser builds.
- Failure mode surfaced in dashboard: `daemon_unreachable_sandboxed_browser_possible` (UX hint only).

### 6.2 Portal advertised vs portal active (P0)

- `portal_advertised`: cheap DBus name + property probe (`org.freedesktop.portal.ScreenCast` present, AvailableSourceTypes readable).
- `portal_active`: a **no-consent, non-capture** capability probe succeeded.
- Daemon never claims ScreenCast availability from DBus name alone.
- **Hard rule:** the daemon MUST NOT briefly start a ScreenCast session if that could trigger a user consent prompt. If the compositor cannot provide a safe probe, emit:
  ```json
  {
    "portal_advertised": true,
    "portal_active": false,
    "scanner_reason": "portal_active_probe_unavailable"
  }
  ```
- Implementation acceptance test: assert no `org.freedesktop.portal.Request` consent dialog is ever issued by the daemon during health/proof flows.

### 6.3 Display-server lock (P0)

- First verified Linux proof in a session locks `display_server`.
- Subsequent proof with different `display_server` → fail code `display_server_mismatch`.
- Audit event: `DAEMON_PROOF_REJECTED` with reason `display_server_mismatch`.
- Report wording: _"Display server changed during active session — manual review recommended."_

### 6.4 Non-local `$DISPLAY` refusal (P0)

- Allowed: `:0`, `:1`, `unix/:0` (local display only).
- Rejected: `host.tld:0`, `192.168.x.x:0`, any TCP/remote display target.
- On refusal: `scanner_state = scanner_unavailable`, `scanner_reason = non_local_display`. Proof still signs and emits — server records the unavailable state as Warning context (not misconduct).

### 6.5 systemd `--user` unit (P1)

- `tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service` (user unit).
- `tools/simurgh-daemon-linux/scripts/install-user-unit.sh` / `uninstall-user-unit.sh` / `check-user-unit.sh`.
- Research-prototype only. No production endpoint-management claim. No distro packaging claim.

### 6.6 Ubuntu CI + Rust toolchain (P0)

- Add `ubuntu-latest` job to `.github/workflows/`.
- Install stable Rust via `dtolnay/rust-toolchain@stable`.
- `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`.
- X11 scanner tests under Xvfb (deterministic).
- Wayland scanner tests gated as **real-device only** (not run in CI; documented in matrix).

### 6.7 Headless fixture (P0)

- No `$DISPLAY`. No `$WAYLAND_DISPLAY`.
- Daemon still boots, `/health` returns `ok`, `/status` returns `scanner_state: scanner_unavailable`, `scanner_reason: no_display_server`.
- First-class test fixture under `tools/simurgh-daemon-linux/tests/`.

### 6.8 Pairing + events Linux support (P0)

- `daemonPairing.js`: accept Linux platform post-schema. Pre-acceptance negative tests must continue passing (proves `unsupported_platform` was the gate, not an accident).
- `daemonEvents.js`: emit Linux acceptance/rejection events visibly in the audit chain.

### 6.9 Port allocation (P1)

- All Device Shield daemons share `127.0.0.1:3031` (one OS per device → no collision possible).
- Document the rationale in `docs/DEVICE_SHIELD_PORTS.md` so reviewers do not misread it as collision risk.
- Linux daemon `doctor` check verifies the port is free before bind.

### 6.10 Platform-specific scanner validators (P0)

- Refactor `validateScannerSummary` into a dispatcher.
- Shared base validates: `scanner_state`, `scanner_version`, `scan_timestamp`, `scan_duration_ms`, `scan_error_count`, `privacy_mode`, `window_fingerprint_hashes`.
- Per-platform validators own platform-specific signals:
  - **macOS / Windows**: `capture_excluded_window_count`, `capture_restricted_window_count`, `monitor_only_window_count`, `suspicious_window_count`, `visible_window_count` (unchanged behaviour).
  - **Linux**: `display_server`, `display_server_locked`, `coverage`, `portal_advertised`, `portal_active`, `x11_managed_window_count`, `x11_override_redirect_window_count`, `x11_above_window_count`, `x11_fullscreen_window_count`, `x11_skip_taskbar_window_count`, `xwayland_window_count`, `scanner_reason`.
- Behavioural invariant: every existing macOS/Windows test must still pass byte-identically.

---

## 7. Contracts

### 7.1 Linux daemon proof payload

```json
{
  "type": "simurgh.daemon.proof",
  "session_id": "sess_...",
  "exam_id": "exam_...",
  "sequence": 12,
  "timestamp": "2026-05-17T00:00:00.000Z",
  "challenge": "base64url_32_bytes",
  "node_id_hash": "sha256:...",
  "daemon_version": "2.8.0",
  "platform": "linux",
  "display_server": "x11|wayland|xwayland|headless|unknown",
  "scanner_state": "healthy|risk_detected|restricted_detected|wayland_portal_available|wayland_compositor_restricted|wayland_compositor_unsupported|xwayland_detected|permission_denied|scanner_unavailable|scan_error",
  "scanner_version": "2.8.0",
  "privacy_mode": "metadata_only",
  "scanner_reason": "none|no_display_server|non_local_display|portal_not_active|portal_active_probe_unavailable|sandboxed_browser_loopback_possible",
  "coverage": "x11_full|wayland_limited|xwayland_partial|headless_none|unknown",
  "portal_advertised": true,
  "portal_active": false,
  "x11_managed_window_count": 0,
  "x11_override_redirect_window_count": 0,
  "x11_above_window_count": 0,
  "x11_fullscreen_window_count": 0,
  "x11_skip_taskbar_window_count": 0,
  "xwayland_window_count": 0,
  "suspicious_window_count": 0,
  "visible_window_count": 0,
  "scan_timestamp": "2026-05-17T00:00:00.000Z",
  "scan_duration_ms": 12,
  "scan_error_count": 0,
  "window_fingerprint_hashes": [],
  "signature": "base64url..."
}
```

Canonicalisation: existing key-sort + signature-exclusion in `canonicaliseDaemonPayload` (unchanged).

### 7.2 New fail codes vs scanner reasons

**Fail codes (proof rejected):**

```text
display_server_mismatch
invalid_linux_display_server
invalid_linux_portal_state
invalid_linux_coverage
invalid_linux_scanner_reason
invalid_linux_x11_count
invalid_linux_scanner_state
invalid_linux_scanner_version
unsupported_linux_display_server
```

**Scanner reasons (valid signed proof, Warning context only — never reject):**

```text
none
non_local_display
no_display_server
portal_not_active
portal_active_probe_unavailable
sandboxed_browser_loopback_possible
```

Rule (must be enforced by tests):

- `display_server_mismatch` → reject proof.
- `non_local_display` → valid proof, Warning context.
- `no_display_server` → valid proof, Warning context.
- For any `scanner_state` in `{healthy, risk_detected}`, `scanner_reason` MUST be `"none"`. Mixed states (`healthy` + non-`none` reason) are a schema violation → `invalid_linux_scanner_reason`.

Preserved existing fail codes (must not regress):

```text
unsupported_platform        invalid_signature
proof_stale                 proof_in_future
daemon_node_mismatch        daemon_public_key_mismatch
forbidden_local_field
```

### 7.3 Report `device_integrity` shape (Linux)

```json
{
  "device_integrity": {
    "daemon_platform": "linux",
    "daemon_final_state": "healthy",
    "display_server": "x11",
    "display_server_locked": true,
    "scanner_final_state": "healthy",
    "scanner_version": "2.8.0",
    "coverage": "x11_full",
    "portal_advertised": null,
    "portal_active": null,
    "proofs_verified": 8,
    "privacy_mode": "metadata_only",
    "manual_review_recommendation": "No device-integrity anomaly detected."
  }
}
```

### 7.4 Risk policy (Linux additions, no macOS/Windows behaviour change)

| Linux signal                                | Risk level                                                        |
| ------------------------------------------- | ----------------------------------------------------------------- |
| X11 healthy metadata                        | Safe                                                              |
| Wayland portal_active=true                  | Safe (limited coverage badge)                                     |
| Wayland portal_advertised only              | Warning context                                                   |
| Wayland compositor restricted/unsupported   | Warning context only (NOT misconduct)                             |
| XWayland partial coverage                   | Warning context only                                              |
| X11 always-on-top/override-redirect overlay | Warning                                                           |
| X11 suspicious counts > 0                   | Warning (Critical only after fixture validation in a later stage) |
| Missing daemon in required mode             | Reject telemetry                                                  |
| Invalid proof                               | Reject telemetry                                                  |
| Raw local field                             | Reject telemetry                                                  |
| display_server_mismatch                     | Reject proof                                                      |
| non_local_display                           | Warning context (proof still valid)                               |
| no_display_server (headless)                | Warning context (proof still valid)                               |

---

## 8. Folder + File Plan

```text
tools/simurgh-daemon-linux/
  Cargo.toml
  README.md
  src/
    main.rs
    config.rs
    identity.rs
    http.rs
    proof.rs
    canonical_json.rs
    scanner/
      mod.rs
      session.rs
      x11.rs
      wayland.rs
      xwayland.rs
      privacy.rs
  systemd/
    simurgh-daemon-linux.service
  scripts/
    install-user-unit.sh
    uninstall-user-unit.sh
    check-user-unit.sh
  tests/
    proof_tests.rs
    session_detector_tests.rs
    x11_scanner_tests.rs
    wayland_scanner_tests.rs
    xwayland_scanner_tests.rs
    privacy_tests.rs
    headless_tests.rs
    non_local_display_tests.rs

src/device/
  platformScannerSchema.js          # refactor to dispatcher
  scannerRiskPolicy.js              # extend with Linux states
  daemonProof.js                    # accept linux post-schema
  daemonPairing.js                  # accept linux post-schema
  daemonEvents.js                   # emit linux events

tests/unit/
  daemonProofLinux.test.js
  daemonProofLinuxScanner.test.js
  daemonPairingLinux.test.js
  daemonEventsLinux.test.js
  scannerRiskPolicyLinux.test.js
  platformScannerSchemaDispatcher.test.js
  displayServerLock.test.js
  reportBuilderLinuxDeviceShield.test.js

tests/e2e/
  stage28_linux_display_integrity_smoke.mjs

tests/security/
  stage28_linux_security_audit.test.js

scripts/
  smoke-stage-2-8-linux-display-integrity.sh
  security-audit-stage-2-8-linux-display-integrity.sh

docs/
  STAGE_2_8_LINUX_DISPLAY_INTEGRITY_RESEARCH.md
  STAGE_2_8_LINUX_THREAT_MODEL.md
  STAGE_2_8_LINUX_PLATFORM_MATRIX.md
  STAGE_2_8_LINUX_VALIDATION_MATRIX.md
  STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md
  STAGE_2_8_LINUX_CLOSEOUT.md
  DEVICE_SHIELD_PORTS.md
  schemas/
    linux-daemon-proof.schema.json
    linux-scanner-result.schema.json
  evidence/stage-2-linux/README.md

.github/workflows/
  (extended)                        # add ubuntu-latest rust job + Xvfb step
```

---

## 9. Implementation Order (revised per Raouf, 2026-05-17)

1. **Server schema + pairing/events Linux acceptance** (red tests first).
2. **Linux daemon skeleton** (Rust, axum, /health + /status only).
3. **Signed proof acceptance** (identity, proof signing, server verification).
4. **Display-server lock + mismatch rejection**.
5. **Headless fixture**.
6. **Non-local `$DISPLAY` refusal**.
7. **X11 metadata scanner**.
8. **Portal advertised vs active**.
9. **Sandboxed-browser loopback detection** (UX-only hint).
10. **systemd `--user` scripts**.
11. **Ubuntu CI + Xvfb job**.
12. **Docs, reviewer checklist, validation matrix, closeout**.

Each step lands red tests → implementation → green → commit, mirroring Stage 2.7's TDD cadence.

---

## 10. E2E Smoke Matrix (Scenarios)

| ID  | Scenario                                                                                      | Expected                                                                |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A   | Linux X11 healthy proof                                                                       | accepted, coverage=x11_full                                             |
| B   | Linux Wayland portal_active=true                                                              | accepted, coverage=wayland_limited                                      |
| C   | Linux Wayland portal_advertised only                                                          | accepted with Warning context                                           |
| D   | Linux XWayland partial coverage                                                               | accepted, coverage=xwayland_partial                                     |
| E   | Linux headless (no DISPLAY / no WAYLAND_DISPLAY)                                              | accepted, scanner_unavailable, no_display_server                        |
| F   | Linux non-local DISPLAY                                                                       | accepted, scanner_unavailable, non_local_display                        |
| G   | Tampered Linux proof signature                                                                | `invalid_signature`                                                     |
| H   | Replayed Linux proof challenge                                                                | rejected (consumed challenge)                                           |
| I   | Raw `pid`/`window_title`/`process_name` nested in proof                                       | `forbidden_local_field`                                                 |
| J   | Linux scanner version mismatch                                                                | `invalid_scanner_version`                                               |
| K   | Linux proof before pairing                                                                    | rejected                                                                |
| L   | Linux paired-node mismatch                                                                    | `daemon_node_mismatch`                                                  |
| M   | display_server changes mid-session (X11 → Wayland)                                            | `display_server_mismatch`                                               |
| N   | Unknown platform pairing attempt (e.g. `freebsd`/`android`/`chromeos`/`plan9`)                | `unsupported_platform` (proves gate still exists post-Linux acceptance) |
| O   | Linux proof with `scanner_state: healthy` + `scanner_reason: non_local_display` (mixed state) | `invalid_linux_scanner_reason`                                          |

Mock-first for CI; real-device for evidence.

---

## 11. Cybersecurity Audit Gate

`scripts/security-audit-stage-2-8-linux-display-integrity.sh` runs `tests/security/stage28_linux_security_audit.test.js` covering:

| Dimension    | Tests                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Proof        | canonicalisation, tamper, stale/future, replay, signature                    |
| Platform     | Linux accepted only post-schema; unsupported display_server handled          |
| Scanner      | X11 counts valid; Wayland limited coverage honest; XWayland partial declared |
| Privacy      | recursive forbidden-field rejection on every Linux scanner field             |
| SDK          | no unsigned scanner field trusted; `browser_package_hint` is UX-only         |
| Report       | no raw local fields; correct manual-review wording                           |
| Dashboard    | no misconduct phrases for Linux states                                       |
| Daemon HTTP  | loopback-only bind, method allowlist, body limits, malformed-JSON rejection  |
| Identity     | identity file 0600, parent dir 0700, stable node hash                        |
| Session lock | display_server_mismatch enforced                                             |
| Display sec  | non_local_display refusal verified                                           |
| Docs         | non-claims preserved verbatim                                                |

---

## 12. Real Linux Validation Matrix

| Platform          | Session  | Goal                                                                |
| ----------------- | -------- | ------------------------------------------------------------------- |
| Ubuntu LTS GNOME  | Wayland  | portal_advertised true, portal_active probe, limited coverage       |
| Ubuntu LTS GNOME  | Xorg/X11 | X11 scanner healthy                                                 |
| Fedora GNOME      | Wayland  | portal_advertised true                                              |
| KDE Plasma        | Wayland  | portal_advertised true OR compositor-specific limitation documented |
| KDE Plasma        | X11      | X11 scanner healthy                                                 |
| Sway/wlroots      | Wayland  | compositor limitation documented                                    |
| Xvfb / Xephyr CI  | X11      | deterministic automated test path                                   |
| Headless (no env) | none     | scanner_unavailable, no_display_server                              |

**Evidence allowed:** daemon `/health` JSON, daemon `/status` JSON, signed proof JSON with signature redacted, server accept/reject response, report `device_integrity` section, audit verification result, test logs.

**Evidence forbidden:** screenshots with personal data, window titles, process names, PIDs, XIDs, usernames, hostnames, home paths, machine IDs, screen pixels, typed/pasted content.

---

## 13. Quality Gates (umbrella, before PR)

```bash
npm test
node tools/privacy-audit.mjs
npm audit --audit-level=high

cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml

bash scripts/smoke-stage-2-2-2-3.sh
bash scripts/smoke-stage-2-4-2-5.sh
bash scripts/security-audit-stage-2-4-2-5.sh
bash scripts/smoke-stage-2-6-windows-scanner.sh
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh
bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh
bash scripts/smoke-stage-2-8-linux-display-integrity.sh
bash scripts/security-audit-stage-2-8-linux-display-integrity.sh
bash scripts/check.sh
```

Target closeout state:

- Node tests: 273 + new Linux tests, all green.
- Rust tests: all green.
- Privacy audit: pass.
- `npm audit`: 0 high vulnerabilities.
- Stage 2.8 smoke + security audit: pass.
- `check.sh`: all gates green (or single documented platform-specific tolerance, same as Stage 2.7 closeout).
- Real Linux matrix: documented with allowed evidence only.

---

## 14. Release Plan

Suggested sub-stage releases:

```text
v0.4.14-stage-2-8A-linux-daemon-proof-foundation
v0.4.15-stage-2-8B-linux-x11-scanner
v0.4.16-stage-2-8C-linux-wayland-portal-research
v0.4.17-stage-2-8D-linux-real-device-validation
v0.4.18-stage-2-8-linux-display-integrity-closeout
```

Suggested PR sequence:

```text
PR #19 - Linux schema/pairing/events + daemon skeleton + signed proofs
PR #20 - X11 scanner + display-server lock + non-local-display refusal + headless
PR #21 - Wayland portal advertised/active + XWayland partial
PR #22 - systemd + Ubuntu CI + smoke + security audit
PR #23 - Docs + reviewer checklist + validation matrix + closeout
```

Every `AGENT.md` and `CHANGELOG.md` entry begins with `Raouf:` per project convention.

---

## 15. Open Risks

- **Wayland portal `portal_active` probe must not trigger user consent prompts**. Implementation must verify capability without opening a real ScreenCast session. If no safe probe exists for a given compositor, fall back to `portal_advertised` and document.
- **`x11rb` on XWayland**: behaviour under hybrid sessions varies by compositor; XWayland scanner output is explicitly partial coverage and must never claim parity.
- **CI flakiness under Xvfb**: deterministic fixture design required; mark any flake as a blocker.
- **systemd `--user` unit on minimal/server installs**: install scripts must degrade gracefully if no user session bus is available.

---

## 15.5 Stage 2.8A Red-Test Checklist (TDD entry point)

Stage 2.8A MUST start red on every one of these. Implementation only begins after each fails for the expected reason:

```text
[ ] Linux platform rejected at pairing (daemonPairing.js: unsupported_platform)
[ ] Linux proof rejected at proof validation (daemonProof.js: unsupported_platform)
[ ] platformScannerSchema dispatcher missing (no validateLinuxScannerSummary export)
[ ] display_server_mismatch fail code missing from daemonProof.js
[ ] scanner_reason mixed-state guard missing (healthy + non-none reason currently silently passes)
[ ] reportBuilder.js emits no device_integrity.display_server / coverage / portal_* fields
[ ] tools/privacy-audit.mjs has no Linux daemon paths or Linux scanner fields in its sweep
[ ] daemonEvents.js cannot emit DAEMON_PROOF_REJECTED with reason display_server_mismatch
[ ] tools/simurgh-daemon-linux/ does not exist (no Cargo.toml)
```

Each red test maps directly to a §9 implementation step. Automated implementation dispatch should not write green code for any item until its red test exists and fails for the documented reason.

---

## 16. References (verified Stage 2.7 baseline)

- `src/device/platformScannerSchema.js` — shared dispatcher seam.
- `src/device/daemonProof.js` — `unsupported_platform` rejection at lines 102, 220.
- `src/device/forbiddenLocalFields.js` — recursive raw-field blocklist (reused unchanged).
- `src/device/scannerRiskPolicy.js` — risk mapping seam.
- `tools/simurgh-daemon-macos/Sources/SimurghDaemon/DaemonConfig.swift` — confirmed `127.0.0.1:3031`.
- `tools/simurgh-daemon-windows/src/SimurghDaemon.Windows/DaemonConfig.cs` — confirmed `127.0.0.1:3031`.
- `docs/stages/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md` — parent contract.
- Freedesktop EWMH: `_NET_CLIENT_LIST`, `_NET_WM_WINDOW_TYPE`, `_NET_WM_STATE`.
- Wayland protocol: client-isolation model (no cross-client surface enumeration).
- XDG Desktop Portal: `org.freedesktop.portal.ScreenCast`.
- XDG Base Directory: `$XDG_STATE_HOME`, `$XDG_RUNTIME_DIR`.
- Snapcraft `network` / `network-bind` interfaces; Flatpak `--share=network` permission model.
