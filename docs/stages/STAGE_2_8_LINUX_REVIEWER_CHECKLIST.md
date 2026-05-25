# Stage 2.8 Linux Reviewer Checklist

This checklist is the normative review gate for the Stage 2.8 Linux Wayland/systemd release of Project Simurgh. Every item must be marked before the release is considered reviewer-approved.

> **Current baseline note (2026-05-25):** This checklist was written against the Stage 2.8 frozen baseline (`v0.4.16`). The current Node.js test count is **331** (item 1 below reflects the Stage 2.8 freeze count of 327; use 331 for post-Stage 2.9 verification).

## 1. Release Gates

- [ ] Node test suite reports exactly 327/327 passing
- [ ] Rust test suite reports exactly 33/33 passing with `SIMURGH_REQUIRE_XVFB_TESTS=1` set in the CI environment
- [ ] `scripts/check.sh` reports exactly 52/52 checks passing
- [ ] `npm audit` reports 0 high-severity vulnerabilities
- [ ] Privacy audit step in `scripts/check.sh` passes without errors
- [ ] `cargo fmt --check` exits 0 (no formatting diff) for `tools/simurgh-daemon-linux`
- [ ] `cargo clippy -- -D warnings` exits 0 (0 warnings) for `tools/simurgh-daemon-linux`

## 2. Linux Daemon Architecture

- [ ] `tools/simurgh-daemon-linux/src/http.rs` binds exclusively to `127.0.0.1:3031` (no `0.0.0.0` binding)
- [ ] Identity files (keypair + node_id_hash) are stored under `$XDG_STATE_HOME/simurgh/` (resolved via `identity.rs`)
- [ ] HTTP router in `http.rs` exposes `/health`, `/status`, and `/proof` endpoints and no others
- [ ] `http.rs` defines and enforces `MAX_BODY_BYTES` to limit inbound request body size
- [ ] Keypair and node_id_hash are loaded (or created on first run) exclusively via `load_or_create_identity()` in `tools/simurgh-daemon-linux/src/identity.rs`

## 3. X11 Coverage

- [ ] `tools/simurgh-daemon-linux/src/scanner/x11.rs` uses `x11rb` to connect to the X display
- [ ] `x11.rs` `query_tree` walk counts all five window categories: managed, override-redirect, above-hint (`_NET_WM_STATE_ABOVE`), fullscreen (`_NET_WM_STATE_FULLSCREEN`), and skip-taskbar (`_NET_WM_STATE_SKIP_TASKBAR`)
- [ ] `x11.rs` rejects any `$DISPLAY` value that is not a local Unix socket or local TCP address (non-local display rejected)
- [ ] Signed proof payload includes all five X11 fields: `x11_managed_window_count`, `x11_override_redirect_window_count`, `x11_above_window_count`, `x11_fullscreen_window_count`, `x11_skip_taskbar_window_count`
- [ ] `tools/simurgh-daemon-linux/src/scanner/privacy.rs` contains `x11_to_linux_summary()` that promotes `X11ScannerSummary` to `LinuxScannerSummary`

## 4. Wayland Portal Probe

- [ ] `tools/simurgh-daemon-linux/src/scanner/wayland.rs` never calls `CreateSession`, `SelectSources`, `Start`, or `OpenPipeWireRemote`
- [ ] `wayland.rs` uses only `NameHasOwner("org.freedesktop.portal.Desktop")` and `GetProperty<AvailableSourceTypes>` to probe the portal
- [ ] `tools/simurgh-daemon-linux/tests/wayland_scanner_tests.rs` contains a source-grep test that asserts at test-time that no banned method names appear in `wayland.rs`
- [ ] The 30-assertion cybersecurity audit in `tests/e2e/stage28cd_linux_security_audit.test.js` validates Wayland consent-safety at the integration level (Dimension 4)
- [ ] `portal_advertised` is `true` in proof output when and only when `org.freedesktop.portal.Desktop` is present on DBus
- [ ] `portal_active` is `true` in proof output when and only when the `AvailableSourceTypes` property on that portal is readable

## 5. XWayland Partial Coverage

- [ ] `tools/simurgh-daemon-linux/src/scanner/xwayland.rs` sets `coverage = "xwayland_partial"` in the scanner summary
- [ ] `xwayland.rs` sets `scanner_state = "xwayland_detected"` in the scanner summary
- [ ] XWayland window counts are written to `xwayland_window_count` in the proof payload, not to `x11_managed_window_count`
- [ ] `xwayland.rs` does not assert full X11 coverage or full Wayland portal coverage in its summary
- [ ] Non-local `$DISPLAY` values are rejected in the XWayland path (inherited from the X11 scanner's display validation)

## 6. Display Server Lock

- [ ] `displayServerLock` is instantiated at module scope in `server.js` (not per-request)
- [ ] `displayServerLock.observe(sessionId, display_server)` is called after proof verification succeeds and before `recordProofVerified()` is called
- [ ] A `display_server` value that mismatches the session-locked value causes `observe()` to return `{ ok: false }`, which the handler converts to a 409 response
- [ ] A `DAEMON_PROOF_REJECTED` audit event with reason `display_server_mismatch` is emitted whenever a 409 is returned for this reason
- [ ] `displayServerLock.evictMissing(activeIds)` is called during the 5-minute session sweep to release locks for ended sessions

## 7. Browser Package Hint Boundary

- [ ] `browser_package_hint` is not present in the signed proof payload built by `tools/simurgh-daemon-linux/src/proof.rs`
- [ ] `server.js` `validateDaemonProof()` does not read, validate, or trust `browser_package_hint`
- [ ] The JSON schema for Linux proof (in `docs/schemas/`) does not include `browser_package_hint` as a field
- [ ] `riskEngine.js` does not read or act on `browser_package_hint`
- [ ] `src/academic/reportBuilder.js` Linux report branch does not emit or reference `browser_package_hint`
- [ ] `browser_package_hint` is returned only from `getDeviceShieldStatus()` in `public/sdk/simurgh-browser-sdk.js` as a UX hint
- [ ] `daemon_unreachable_hint` is non-null only when the daemon is not reachable (i.e., it is not set when the daemon responds successfully)

## 8. systemd User Lifecycle

- [ ] `tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service` contains `After=graphical-session.target`
- [ ] Unit file contains `PartOf=graphical-session.target`
- [ ] Unit file `ExecStart` is `%h/.local/bin/simurgh-daemon-linux` (user home path, no root or system path)
- [ ] Unit file contains `NoNewPrivileges=true`
- [ ] Unit file contains `PrivateTmp=true`
- [ ] Unit file contains `ProtectSystem=strict`
- [ ] Unit file contains `ProtectHome=read-only`
- [ ] Unit file contains `ReadWritePaths=%h/.local/state/simurgh`
- [ ] `scripts/install-user-unit.sh`, `scripts/uninstall-user-unit.sh`, `scripts/check-user-unit.sh`, and `scripts/doctor-user-unit.sh` contain no `sudo`, no `root` invocation, no `eval`, and no `curl | sh` or equivalent pattern
- [ ] All four lifecycle scripts pass `shellcheck` in the CI workflow
- [ ] Unit file and lifecycle scripts are documented as dev/research-only; no claim of production deployment is made

## 9. Proof Path

- [ ] `/proof` endpoint in `http.rs` constructs the proof exclusively via `build_proof(&identity, &inputs)` from `tools/simurgh-daemon-linux/src/proof.rs`
- [ ] `ProofInputs` struct in `proof.rs` includes all required scanner fields: `x11_managed_window_count`, `x11_override_redirect_window_count`, `x11_above_window_count`, `x11_fullscreen_window_count`, `x11_skip_taskbar_window_count`, `xwayland_window_count`, `portal_advertised`, `portal_active`, `display_server`, `coverage`, `scanner_state`, `scanner_reason`
- [ ] HTTP response body shape is `{ ok: true, daemon_proof: <proof> }` on success
- [ ] `proof["type"]` equals `"simurgh.daemon.proof"`
- [ ] `proof["platform"]` equals `"linux"`
- [ ] `proof["scanner_version"]` equals `"2.8.0"`
- [ ] `proof["signature"]` is present and is a non-empty string
- [ ] `proof["node_id_hash"]` is present and is a non-empty string
- [ ] `proof["timestamp"]` is within 10 seconds of the server's wall-clock time at receipt

## 10. Privacy Contract

- [ ] No window titles are collected at any point in the scanner pipeline
- [ ] No process names are collected at any point in the scanner pipeline
- [ ] No PIDs or X11 window IDs (XIDs) are collected or transmitted
- [ ] No usernames or home directory paths are collected or transmitted
- [ ] No screen pixels, screenshots, or webcam frames are captured at any point
- [ ] No typed or pasted content is captured at any point
- [ ] No MAC address, hardware serial number, or `/etc/machine-id` value is collected or transmitted
- [ ] All proof and status responses include `privacy_mode: "metadata_only"`

## 11. Report / Dashboard / Audit

- [ ] `linuxAnomaly()` in `src/academic/reportBuilder.js` checks for each of: `wayland_compositor_restricted`, `scanner_unavailable`, `xwayland_partial`, `x11_above_window_count_max > 0`, `x11_override_redirect_window_count_max > 0`, `proofs_rejected > 0`
- [ ] Linux report branch in `reportBuilder.js` emits all of: `display_server`, `display_server_locked`, `coverage`, `portal_advertised`, `portal_active`, all five X11 count fields, and `xwayland_window_count_max`
- [ ] Linux report branch does not emit `capture_excluded`, `capture_restricted`, or `monitor_only` count fields (those are Windows-only fields)
- [ ] `DAEMON_PROOF_REJECTED` audit event is emitted with reason `display_server_mismatch` when `displayServerLock` rejects a proof

## 12. Smoke Coverage (16 Scenarios)

- [ ] All 16 scenarios (A through P) in `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs` pass in CI
- [ ] Scenario A validates `display_server_mismatch` enforcement (second proof with different display_server returns 409)
- [ ] Scenario O validates Wayland consent-safety via source-grep assertion (no banned portal methods present in `wayland.rs`)
- [ ] Scenario P validates that `displayServerLock.evictMissing()` releases the lock when the session is swept

## 13. Cybersecurity Audit Coverage (30 Assertions)

- [ ] All 30 assertions in `tests/e2e/stage28cd_linux_security_audit.test.js` pass in CI
- [ ] Dimension 4 (Wayland consent-safety): all 3 assertions pass, confirming no screen-capture portal methods are invoked
- [ ] Dimension 6 (browser_package_hint trust boundary): all 3 assertions pass, confirming the hint is not trusted server-side
- [ ] Dimension 7 (systemd user-only lifecycle): both assertions pass, confirming no root or sudo usage

## 14. Real-Device Validation

- [ ] Headless CI (Xvfb): mandatory Xvfb test suite passes with `SIMURGH_REQUIRE_XVFB_TESTS=1` set
- [ ] Non-local `$DISPLAY` rejection is validated by a dedicated unit test (not only by CI Xvfb)
- [ ] `display_server_mismatch` 409 rejection is validated by both smoke test (Scenario A) and integration test
- [ ] Ubuntu GNOME Wayland real compositor: pending real-device validation (not yet completed)
- [ ] Ubuntu GNOME X11 real compositor: pending real-device validation (Xvfb validated in CI as proxy)
- [ ] Fedora, KDE Plasma, Sway, and XWayland real compositor: all pending real-device validation

## 15. Non-Claims

- [ ] No claim is made of a production Linux endpoint deployment
- [ ] No claim is made of distro packaging (`.deb`, `.rpm`, AUR, Flatpak, etc.)
- [ ] No claim is made of a system-wide service (no `systemctl --system` usage)
- [ ] No claim is made of MDM or enterprise device management readiness
- [ ] No claim is made of hardware attestation or TPM-backed identity
- [ ] No claim is made of kernel-level visibility (no eBPF, no kernel module)
- [ ] No claim is made of universal Wayland surface enumeration across all compositors
- [ ] No claim is made of GPU overlay or DRM lease detection
- [ ] No claim is made of automatic misconduct detection or scoring
- [ ] No claim is made of feature or coverage parity with the Windows or macOS daemon

## 16. Documentation Completeness

- [ ] `docs/stages/STAGE_2_8_LINUX_TECHNICAL_BRIEF.md` is present in the repository
- [ ] `docs/stages/STAGE_2_8_LINUX_VALIDATION_MATRIX.md` is present in the repository
- [ ] `docs/stages/STAGE_2_8_LINUX_REVIEWER_CHECKLIST.md` is present in the repository (this file)
- [ ] `docs/stages/STAGE_2_8_LINUX_CLOSEOUT.md` is present in the repository
- [ ] `docs/evidence/stage-2-linux/README.md` is present in the repository
