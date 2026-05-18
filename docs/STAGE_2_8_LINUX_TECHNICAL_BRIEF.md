# Stage 2.8 Linux Technical Brief

**Project Simurgh — Linux Display Integrity Research**
**Version:** v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci
**PRs:** #19 (2.8A), #20 (2.8B), #21 (2.8C/D)
**Status:** Frozen research-prototype baseline

---

## 1. Executive Summary

Stage 2.8 extends Project Simurgh's localhost daemon model to Linux. It adds a Rust-based daemon (axum, 127.0.0.1:3031), display server detection across X11/Wayland/XWayland/headless environments, P-256 ECDSA signed proofs, challenge binding with replay rejection, and server-side display-server locking. The work spans three pull requests (PRs #19–#21) and is frozen as a research-prototype baseline. It does not constitute a production deployment, distro package, system-wide service, or feature-complete Linux endpoint.

Coverage is inherently limited on Linux. X11 can be queried via `x11rb`; Wayland restricts property access to compositor policy; XWayland provides only partial visibility. The daemon collects metadata counts and booleans — never window titles, PIDs, process names, or screen pixels.

---

## 2. Research Context: Linux Display Integrity and Invisible Windows

Linux supports multiple display server protocols in active use: X11, Wayland, and XWayland (an X11 compatibility layer under Wayland compositors). Each protocol exposes a different surface for metadata inspection:

- **X11** provides a programmatic window tree API (`query_tree`, property queries) that allows counting managed windows, override-redirect windows, and windows with specific EWMH hints (above, fullscreen, skip-taskbar).
- **Wayland** is designed around compositor authority. Client applications may not enumerate other clients' surfaces. The XDG Desktop Portal exposes a limited, consent-gated interface; the daemon reads only property availability, never initiating a session or capture.
- **XWayland** runs an X11 server inside a Wayland compositor session to serve legacy X11 clients. Only X11 windows bridged through XWayland are visible; native Wayland surfaces are not.

The threat model for Linux exam integrity focuses on applications that may obscure, overlay, or manipulate the visible desktop state in ways the exam browser cannot detect. Window manager hints such as `_NET_WM_STATE_ABOVE` and `_NET_WM_STATE_FULLSCREEN`, and override-redirect windows that bypass the window manager, are the primary signals available under X11.

---

## 3. Stage 2.8 Scope

Stage 2.8 is a research prototype covering:

| Sub-stage | PR  | Description                                           |
|-----------|-----|-------------------------------------------------------|
| 2.8A      | #19 | Linux daemon foundation: axum, identity, endpoints    |
| 2.8B      | #20 | X11 scanner: window tree walk, EWMH hint counts       |
| 2.8C/D    | #21 | Wayland portal probe, XWayland scanner, systemd unit, CI pipeline |

The scope boundary is a localhost daemon verifiable by the Node.js exam server over a signed-proof protocol. It does not extend to production deployment, packaging, MDM integration, kernel-level visibility, or hardware attestation.

---

## 4. Stage 2.8A — Linux Daemon Foundation (PR #19)

PR #19 establishes the core daemon infrastructure shared by all subsequent Linux sub-stages.

**Runtime:** Rust binary, axum HTTP server, bound to `127.0.0.1:3031`.

**Identity:** At first run, a P-256 keypair and a `node_id_hash` are generated and persisted at `$XDG_STATE_HOME/simurgh/`. The `node_id_hash` is a one-way hash of the node identity — the raw keypair private key is never transmitted.

**Endpoints:**
- `GET /health` — liveness check
- `GET /status` — daemon metadata without a proof
- `POST /proof` — signed proof generation

**Signed proof shape:**

```json
{
  "type": "simurgh.daemon.proof",
  "platform": "linux",
  "scanner_version": "2.8.0",
  "timestamp": "<ISO-8601>",
  "session_id": "<uuid>",
  "exam_id": "<uuid>",
  "sequence": 0,
  "challenge": "<base64>",
  "display_server": "<x11|wayland|xwayland|headless|unknown>",
  "scanner_state": "<string>",
  "scanner_reason": "<string>",
  "coverage": "<string>",
  "x11_managed_window_count": 0,
  "x11_override_redirect_window_count": 0,
  "x11_above_window_count": 0,
  "x11_fullscreen_window_count": 0,
  "x11_skip_taskbar_window_count": 0,
  "xwayland_window_count": 0,
  "portal_advertised": false,
  "portal_active": false,
  "node_id_hash": "<hex>",
  "signature": "<base64>"
}
```

**Signing:** Canonical-JSON serialization matching the Node.js server's `canonicaliseDaemonPayload()` function. The P-256 signature covers the canonical payload bytes.

**Challenge binding:** The client sends a base64-encoded challenge in the proof request. The daemon echoes the challenge in the signed payload. The server verifies that the echoed challenge matches the one it issued for the session. Each challenge is one-time-use; replay attempts are rejected.

---

## 5. Stage 2.8B — X11 Scanner (PR #20)

PR #20 implements the X11 window tree scanner.

**Crate:** `x11rb` — pure-Rust X11 protocol client, no native X11 library linkage required.

**Scan:** `query_tree` walk from the root window. For each window encountered, the scanner reads EWMH/ICCCM properties to classify it. Counts produced:

| Field                              | Meaning                                                  |
|------------------------------------|----------------------------------------------------------|
| `x11_managed_window_count`         | Windows under window manager control                     |
| `x11_override_redirect_window_count` | Windows with `override_redirect` set (bypass WM)      |
| `x11_above_window_count`           | Windows with `_NET_WM_STATE_ABOVE` hint                  |
| `x11_fullscreen_window_count`      | Windows with `_NET_WM_STATE_FULLSCREEN` hint             |
| `x11_skip_taskbar_window_count`    | Windows with `_NET_WM_STATE_SKIP_TASKBAR` hint           |

Window titles, XIDs, process names, and PIDs are never read or recorded.

**Security constraint:** Non-local `$DISPLAY` values are rejected. The daemon only accepts a `$DISPLAY` that resolves to a local Unix socket. Network X11 connections are not permitted.

**Data flow:** The scan produces an `X11ScannerSummary` struct. The function `x11_to_linux_summary()` promotes it to a `LinuxScannerSummary`, which is the unified type passed through the proof pipeline.

**Server-side reporting:** The Node.js `reportBuilder` Linux branch receives and emits the five X11 count fields alongside `display_server`, `coverage`, and portal fields.

**Privacy audit:** PR #20 includes a privacy-audit sweep of the Linux scan path confirming that no title, PID, or process-name data flows into the proof payload.

---

## 6. Stage 2.8C/D — Wayland, XWayland, systemd, CI (PR #21)

PR #21 adds four major components:

1. **Wayland portal probe** (`scanner/wayland.rs`) — reads DBus property availability without initiating any session.
2. **XWayland scanner** (`scanner/xwayland.rs`) — reuses the X11 scan path against `$DISPLAY` when `$WAYLAND_DISPLAY` is detected; marks results as partial.
3. **systemd `--user` unit** — dev-only lifecycle management for the daemon binary.
4. **Ubuntu CI pipeline** — automated build, test, lint, and format checks on `ubuntu-latest`.

Additionally, PR #21 introduces:
- `LinuxScannerSummary` struct (unified, carries both X11 and XWayland counts plus portal booleans)
- `LinuxScannerSnapshot` (renamed from `CurrentScan`): `{ detection: SessionDetection, scanner: Option<LinuxScannerSummary> }`
- `displayServerLock` in `server.js`
- 16-scenario smoke test and 30-assertion security audit test

---

## 7. Linux Threat Model

The Linux threat model addresses scenarios where a student running an exam browser may have additional applications active that could be used to access restricted material or manipulate the exam environment. The daemon targets observable metadata signals:

**Signals collected:**
- Override-redirect windows: applications that bypass the window manager and draw directly on screen, which may indicate screen overlays.
- Above-hint windows: windows explicitly requesting persistent top-of-stack positioning.
- Fullscreen windows: applications occupying the full display.
- Skip-taskbar windows: applications attempting to hide from taskbars and pagers.
- XWayland window count: X11 application presence in a Wayland session.
- Portal advertised/active: whether the Wayland desktop portal is present and queryable.

**Out of scope for this prototype:**
- GPU overlays rendered below the compositor's awareness
- Native Wayland surface enumeration (compositor controls access; the daemon cannot enumerate other clients)
- Kernel-level process or syscall visibility
- Automatic misconduct determination (signals are inputs to a human-reviewed report, not automatic decisions)

The daemon is a data collection component. Anomaly interpretation is performed by `reportBuilder` and reviewed by instructors.

---

## 8. Linux Daemon Architecture

```
[Exam Browser SDK]
       |
  POST /proof (challenge)
       |
[axum HTTP 127.0.0.1:3031]
       |
  [session.rs] detect() --> SessionDetection { display_server, scanner_state, scanner_reason, coverage }
       |
  dispatch (http.rs):
    "x11"      --> x11::scan()        --> x11_to_linux_summary()
    "wayland"  --> wayland_probe()    --> wayland_summary()
    "xwayland" --> xwayland::scan()   --> LinuxScannerSummary
    _          --> None
       |
  build proof payload (canonical JSON)
       |
  sign with P-256 private key
       |
  return signed proof
       |
[Node.js Server]
  validateDaemonProof() -- verifies signature + challenge
  displayServerLock.observe()
  recordProofVerified()
```

The daemon is stateless between requests except for the persisted keypair and the in-memory session challenge store. Challenges are consumed on first use and not reusable.

---

## 9. X11 Scanner Design

**Entry point:** `scanner/session.rs` `detect()` reads `$WAYLAND_DISPLAY`, `$DISPLAY`, and `$XDG_SESSION_TYPE` to determine the display server. When `display_server` is `"x11"` (with no overriding scanner reason), dispatch calls `x11::scan()`.

**Connection:** The scanner connects to the X11 server identified by `$DISPLAY` using `x11rb`. Non-local display strings are rejected before connection is attempted.

**Walk:** Starting from the root window returned by `query_tree`, the scanner recursively enumerates all children. For each window, it checks:
- `override_redirect` attribute
- `_NET_WM_STATE` property for `_NET_WM_STATE_ABOVE`, `_NET_WM_STATE_FULLSCREEN`, `_NET_WM_STATE_SKIP_TASKBAR`
- Window manager frame parentage to distinguish managed from unmanaged windows

**Output:** `X11ScannerSummary` → `LinuxScannerSummary` via `x11_to_linux_summary()`. XWayland count field is set to zero in the pure X11 path.

**Coverage field:** Set to `"x11_full"` on a successful X11 scan.

---

## 10. Wayland Portal Probe Design

The Wayland portal probe reads DBus metadata to determine whether the XDG Desktop Portal is present and whether its screen cast source types property is readable. It does not initiate any session or capture.

**File:** `scanner/wayland.rs`

**DBus operations used:**
- `NameHasOwner("org.freedesktop.portal.Desktop")` — checks whether the portal bus name is registered
- `GetProperty<AvailableSourceTypes>` on `org.freedesktop.portal.ScreenCast` — checks whether the property is readable (indicates portal is active)

**The daemon MUST NOT call `CreateSession`, `SelectSources`, `Start`, or `OpenPipeWireRemote`. Only `NameHasOwner` and `GetProperty<AvailableSourceTypes>` are used.**

This constraint exists because `CreateSession` and subsequent calls initiate a consent dialog and, ultimately, screen capture. The daemon's design principle is that it must never trigger any consent dialog, request screen access, or open a PipeWire remote.

**Output:** `WaylandProbe { portal_advertised, portal_active, probe_unavailable }`

| Field                | Meaning                                                          |
|----------------------|------------------------------------------------------------------|
| `portal_advertised`  | `true` if `org.freedesktop.portal.Desktop` is on the DBus bus   |
| `portal_active`      | `true` if `AvailableSourceTypes` property is readable            |
| `probe_unavailable`  | `true` if DBus is not accessible (e.g., headless environment)    |

The `portal_active` field does NOT mean a screen capture session is active. It means the portal interface responded to a property read. No session is created, no sources are selected, and no frames are captured.

**Coverage field:** Set to `"wayland_portal_only"` — reflecting that only portal metadata is available, not a full surface enumeration.

---

## 11. XWayland Partial Coverage

When `$WAYLAND_DISPLAY` is set (Wayland session) and `$DISPLAY` is also present (XWayland bridge is running), the daemon dispatches to the XWayland scanner.

**File:** `scanner/xwayland.rs`

**Mechanism:** The XWayland scanner reuses the X11 scan path (`x11rb` `query_tree` walk) against `$DISPLAY`. It connects to the XWayland server, which exposes X11 windows that are bridged into the Wayland session.

**Important constraints:**
- Only X11 windows served via XWayland are visible. Native Wayland clients are not visible.
- Results go into `xwayland_window_count`, NOT into `x11_managed_window_count`. The two fields are never conflated.
- `coverage` is set to `"xwayland_partial"`.
- `scanner_state` is set to `"xwayland_detected"`.

The "partial" designation is precise: the count represents only the X11 application layer of a Wayland session. A student running exclusively native Wayland clients would produce `xwayland_window_count = 0` with no further visibility into those surfaces.

---

## 12. Display Server Lock and Mismatch Enforcement

The `displayServerLock` in `server.js` prevents a session from switching its claimed display server mid-session.

**Mechanism:**
- On the first verified Linux proof for a session, `displayServerLock.observe(sessionId, display_server)` records the `display_server` value.
- On each subsequent proof, `observe()` checks that the new `display_server` matches the locked value.
- If a mismatch is detected, the server returns HTTP 409 and logs a `display_server_mismatch` audit event. The proof is not recorded.
- On session end, `displayServerLock.evictMissing(activeIds)` removes entries for ended sessions. The sweep runs on a 5-minute interval.

**Rationale:** The display server is an environmental property of the machine and session. Mid-session changes would indicate either a misconfiguration or an attempt to switch reporting context. The lock enforces consistency within a session.

**Audit trail:** `display_server_mismatch` rejections are logged in the audit chain and contribute to the session's `device_integrity` score via the risk engine.

---

## 13. Browser Package Hint Trust Boundary

The `browser_package_hint` field (`"snap" | "flatpak" | "unknown"`) is surfaced in the SDK's `getDeviceShieldStatus()` response to provide user-facing guidance when the daemon is unreachable.

**Trust boundary:**
- `browser_package_hint` is used ONLY to compose a hint message for the end user explaining possible reasons the daemon could not be reached (e.g., Snap/Flatpak network sandboxing).
- It is NEVER included in the signed proof payload.
- It is NEVER trusted by the server's proof validator.
- It is NEVER used in the schema definition.
- It is NEVER read by the risk engine.
- It is NEVER emitted in reports.

The field is a UX affordance, not a security signal. Any value it carries is advisory and unverified.

---

## 14. systemd `--user` Lifecycle (Dev-Only)

PR #21 ships a systemd user unit and four lifecycle scripts for local developer use.

**Unit file:** `systemd/simurgh-daemon-linux.service`

Key directives:
- `After=graphical-session.target`
- `PartOf=graphical-session.target`
- `ExecStart=%h/.local/bin/simurgh-daemon-linux`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectSystem=strict`
- `ProtectHome=read-only`
- `ReadWritePaths=%h/.local/state/simurgh`

**Lifecycle scripts:**
- `install-user-unit.sh` — installs and enables the unit under `systemctl --user`
- `uninstall-user-unit.sh` — disables and removes the unit
- `check-user-unit.sh` — reports unit status
- `doctor-user-unit.sh` — diagnostic checks

**Security posture of scripts:** No root, no sudo, no eval, no curl-pipe-sh patterns.

**THIS IS DEV-ONLY.** The systemd unit is provided for developer convenience during local testing and research. It does not constitute a production deployment mechanism, a supported installation path, or a distro package. It must not be treated as a production delivery artifact.

---

## 15. Signed Proof Flow

```
1. SDK requests challenge from server (session-scoped, one-time)
2. SDK sends POST /proof { session_id, exam_id, challenge }
3. Daemon runs display server detection (session.rs detect())
4. Daemon dispatches scanner based on detected display server
5. Daemon builds proof payload (canonical JSON)
6. Daemon signs payload with P-256 private key
7. Daemon returns { proof_payload, signature }
8. SDK forwards proof to Node.js server
9. Server runs validateDaemonProof():
   a. Deserialise proof payload
   b. Verify P-256 signature against stored node_id_hash
   c. Verify echoed challenge matches issued challenge
   d. Mark challenge as consumed
10. Server runs displayServerLock.observe()
11. Server runs recordProofVerified()
12. Server returns proof_id to SDK
```

The canonical-JSON serialization used in step 5 matches the Node.js `canonicaliseDaemonPayload()` function exactly. Key ordering, whitespace, and encoding are deterministic.

---

## 16. Server Verification

**Function:** `validateDaemonProof()` in `server.js`

Steps:
1. Deserialize the proof payload.
2. Recompute canonical JSON of the payload fields.
3. Verify the P-256 signature over the canonical JSON bytes using the `node_id_hash`-identified public key.
4. Check that `proof.challenge` matches the challenge issued for `proof.session_id`.
5. Consume the challenge (mark used; subsequent use rejected as replay).
6. If any step fails, return an error and do not record the proof.

**After successful validation:**
- `displayServerLock.observe(sessionId, proof.display_server)` — enforce display server consistency.
- `recordProofVerified()` — store proof fields: `x11_managed_window_count`, `x11_override_redirect_window_count`, `x11_above_window_count`, `x11_fullscreen_window_count`, `x11_skip_taskbar_window_count`, `xwayland_window_count`, `portal_advertised`, `portal_active`, `display_server`, `coverage`.

---

## 17. Risk Mapping

**File:** `src/academic/riskEngine.js`

Linux proofs contribute to the session's `device_integrity` score. The risk engine reads proof fields stored by `recordProofVerified()` and applies the following signals:

- Non-zero `x11_above_window_count` — window requesting persistent top-of-stack.
- Non-zero `x11_override_redirect_window_count` — window bypassing the window manager.
- `display_server_mismatch` rejection — audit event from the display server lock.
- `proofs_rejected` count — cumulative rejected proofs for the session.

The risk engine does not make automatic misconduct determinations. It produces a numeric score and contributing factors that are presented in the instructor report for human review.

---

## 18. Report, Dashboard, and Audit Integration

**File:** `src/academic/reportBuilder.js`

**Linux anomaly detection function:** `linuxAnomaly()`

Conditions checked:
- `wayland_compositor_restricted` — Wayland surface enumeration unavailable
- `scanner_unavailable` — daemon could not run a scanner
- `permission_denied` — scanner was denied access
- `wayland_limited` — portal-only coverage
- `xwayland_partial` — XWayland partial coverage active
- `x11_above_window_count_max > 0` — above-hint window detected
- `x11_override_redirect_window_count_max > 0` — override-redirect window detected
- `proofs_rejected > 0` — one or more proofs rejected during session

**Linux branch output fields:**

| Field                               | Source                        |
|-------------------------------------|-------------------------------|
| `display_server`                    | proof                         |
| `display_server_locked`             | displayServerLock state       |
| `coverage`                          | proof                         |
| `portal_advertised`                 | proof                         |
| `portal_active`                     | proof                         |
| `x11_managed_window_count_max`      | max across session proofs     |
| `x11_override_redirect_window_count_max` | max across session proofs |
| `x11_above_window_count_max`        | max across session proofs     |
| `x11_fullscreen_window_count_max`   | max across session proofs     |
| `x11_skip_taskbar_window_count_max` | max across session proofs     |
| `xwayland_window_count_max`         | max across session proofs     |

These fields appear in the instructor-facing report. Audit events (including `display_server_mismatch`) are persisted in the audit chain for the session.

---

## 19. Privacy Contract

**Collected fields (exhaustive list):**
- `platform` — `"linux"`
- `display_server` — `"x11"`, `"wayland"`, `"xwayland"`, `"headless"`, or `"unknown"`
- `scanner_state` — string descriptor of scanner outcome
- `scanner_version` — semver string
- `coverage` — string descriptor of coverage level
- `x11_managed_window_count` — integer count
- `x11_override_redirect_window_count` — integer count
- `x11_above_window_count` — integer count
- `x11_fullscreen_window_count` — integer count
- `x11_skip_taskbar_window_count` — integer count
- `xwayland_window_count` — integer count
- `portal_advertised` — boolean
- `portal_active` — boolean
- `browser_package_hint` — UX-only string, not in proof
- `privacy_mode` — boolean flag
- `scan_timestamp` — ISO-8601 timestamp

**Fields explicitly never collected:**
- Window titles
- Process names
- Process IDs (PIDs)
- X11 window IDs (XIDs)
- Usernames
- Home directory paths
- Screen pixels or frame data
- Typed or pasted content
- MAC addresses
- Hardware serial numbers
- Machine IDs

The scanner reads window tree structure and EWMH property flags only. It does not open any window's content, read any buffer, or access any rendered frame.

---

## 20. CI and Smoke Coverage

**CI configuration:** Ubuntu CI runs on `ubuntu-latest` GitHub Actions runner.

**Apt packages installed:** `xvfb`, `x11-utils`, `dbus-x11`, `xterm`, `shellcheck`

**Test invocation:** `SIMURGH_REQUIRE_XVFB_TESTS=1 cargo test`

**Additional checks:**
- `cargo clippy -- -D warnings` — lint with all warnings treated as errors
- `cargo fmt --check` — format verification
- `shellcheck scripts/*.sh` — static analysis of all lifecycle shell scripts
- `actions/cache@v4` on `Cargo.lock` — dependency caching

**Smoke test:** `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs`
- 16 scenarios (A through P)
- Covers daemon startup, proof generation, challenge binding, replay rejection, X11 scan, Wayland probe, XWayland detection, display server lock, mismatch enforcement, systemd unit operations, and report integration.

**Cybersecurity audit test:** `tests/e2e/stage28cd_linux_security_audit.test.js`
- 30 assertions across 16 security dimensions

---

## 21. Cybersecurity Audit Coverage

The 30-assertion audit test (`stage28cd_linux_security_audit.test.js`) covers 16 security dimensions including:

- P-256 signature verification correctness
- Challenge binding enforcement
- Replay rejection (one-time challenge)
- Non-local display rejection
- Display server lock enforcement
- `display_server_mismatch` audit event generation
- `browser_package_hint` exclusion from proof and server trust
- Portal probe operation boundary (no `CreateSession`, no `SelectSources`, no `Start`, no `OpenPipeWireRemote`)
- XWayland count field segregation (counts appear in `xwayland_window_count`, not `x11_managed_window_count`)
- Coverage field accuracy
- Canonical-JSON signing alignment
- Privacy field exclusion (no titles, PIDs, names in payload)
- systemd unit hardening directives
- Shell script safety (no eval, no curl-pipe-sh, no sudo)
- `node_id_hash` never equal to raw keypair material
- Session eviction on session end

---

## 22. Real-Device Validation

Stage 2.8 has been developed and validated on Linux systems running X11 and XWayland sessions. CI validation runs under Xvfb (virtual framebuffer) on `ubuntu-latest`.

Validated configurations:
- X11 session with `xterm` as a managed window client
- XWayland under a Wayland compositor (Xvfb-backed in CI)
- Headless environment (no `$DISPLAY`, no `$WAYLAND_DISPLAY`) — daemon reports `display_server = "headless"`, scanner produces no counts

Wayland portal probe validation is limited to environments where DBus and the XDG Desktop Portal are available. In CI, DBus is available via `dbus-x11`; portal availability depends on the runner environment.

---

## 23. Known Limitations

**Wayland surface enumeration is not possible.** The Wayland protocol does not provide a client-side API to enumerate other clients' surfaces. The daemon reads only portal property availability. A student running exclusively native Wayland applications will produce no window counts beyond the portal booleans.

**XWayland visibility is partial.** Only X11 windows bridged through XWayland are visible. Native Wayland surfaces in the same session are not counted.

**GPU overlays are not detectable.** Applications rendering via DRM/KMS directly, or via GPU compositing outside the X11/Wayland window manager tree, are not visible to the daemon.

**DBus availability varies.** The Wayland portal probe requires DBus access. Environments without DBus (some headless or container setups) will produce `probe_unavailable = true`.

**Non-local X11 rejection is strict.** Any `$DISPLAY` value that does not correspond to a local Unix socket is rejected. This is intentional for security but means the daemon cannot scan remote X11 sessions.

**systemd unit is dev-only.** The provided unit file is not a production deployment mechanism. There is no supported upgrade path, no package management integration, and no distro-specific configuration.

**Coverage varies by display server.** X11 sessions have the highest metadata coverage. Wayland-only sessions have the lowest. XWayland sessions are intermediate. Reports must account for the `coverage` field when interpreting window counts.

---

## 24. Non-Claims

The following capabilities are explicitly NOT provided by Stage 2.8. These are not limitations to be addressed in future stages; they are design boundaries of this research prototype.

- **NOT a production Linux endpoint deployment.** The daemon is a research prototype. No production SLA, update mechanism, or support path exists.
- **NOT distro packaging.** There is no `.deb`, `.rpm`, Flatpak, Snap, or AppImage package. No package manager integration.
- **NOT a system-wide service.** The systemd unit operates under `systemctl --user`. No system-level daemon, no privileged service.
- **NOT MDM readiness.** No Mobile Device Management integration, enrollment profile, or remote policy enforcement.
- **NOT hardware attestation.** No TPM, Secure Boot state verification, firmware measurement, or hardware-rooted identity.
- **NOT kernel-level visibility.** No eBPF, no kernel module, no syscall interception, no `/proc` enumeration.
- **NOT universal Wayland surface enumeration.** The Wayland protocol restricts surface access to compositor policy. The daemon cannot enumerate native Wayland clients. Only portal property availability is read.
- **NOT GPU overlay detection.** Surfaces rendered via DRM/KMS or GPU compositing outside the window manager tree are not visible to the daemon.
- **NOT automatic misconduct detection.** Proof signals are inputs to a human-reviewed report. No automated determination of academic dishonesty is made by the daemon, server, or risk engine.
- **NOT Linux parity with Windows or macOS.** The Linux display server landscape is architecturally distinct. The coverage achievable under X11, Wayland, and XWayland differs from what is achievable under macOS Accessibility or Windows APIs. This is an accurate characterisation of the platform, not a gap to close by equivalence.
