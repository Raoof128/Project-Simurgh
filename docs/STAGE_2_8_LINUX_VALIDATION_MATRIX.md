# Stage 2.8 Linux Display Integrity — Validation Matrix

Frozen baseline: `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`

---

## 1. Build and Test Gates

| Gate | Command | Result | Notes |
|---|---|---|---|
| Node test suite | `npm test` | 327/327 pass | |
| Rust test suite | `cargo test` | 33/33 pass | Requires `SIMURGH_REQUIRE_XVFB_TESTS=1` |
| cargo fmt | `cargo fmt --check` | clean | |
| cargo clippy | `cargo clippy` | clean | |
| npm audit | `npm audit --audit-level=high` | 0 high vulnerabilities | |
| privacy audit | `npm run privacy-audit` | pass | |
| scripts/check.sh total | `scripts/check.sh` | 52/52 gates | |

---

## 2. CI Gates

| CI Step | Runner | Status |
|---|---|---|
| checkout | ubuntu-latest | validated (CI) |
| Node 22 | ubuntu-latest | validated (CI) |
| npm ci | ubuntu-latest | validated (CI) |
| apt install (xvfb, x11-utils, dbus-x11, xterm, shellcheck) | ubuntu-latest | validated (CI) |
| Rust toolchain (dtolnay/rust-toolchain@stable) | ubuntu-latest | validated (CI) |
| cargo cache (actions/cache@v4 on Cargo.lock) | ubuntu-latest | validated (CI) |
| shellcheck | ubuntu-latest | validated (CI) |
| cargo fmt --check | ubuntu-latest | validated (CI) |
| cargo clippy | ubuntu-latest | validated (CI) |
| cargo test (SIMURGH_REQUIRE_XVFB_TESTS=1) | ubuntu-latest | validated (CI) |
| check suite (Node gates) | ubuntu-latest | validated (CI) |

CI workflow: `.github/workflows/stage-1-checks.yml`

---

## 3. Smoke Gates (Stage 2.8C/D)

Smoke test file: `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs` — 16 scenarios

| Scenario | Description | Status |
|---|---|---|
| A | display_server_mismatch enforcement — first proof locks display_server; mismatch rejected with 409 | validated (CI) |
| B | X11 scanner anomaly detection — x11_above=1 produces Warning in linuxAnomaly() | validated (CI) |
| C | Wayland portal probe — portal_advertised boolean returned without consent calls | validated (CI) |
| D | XWayland partial coverage — coverage=xwayland_partial on XWayland session | validated (CI) |
| E | browser_package_hint snap detection — UA heuristic returns "snap" | validated (CI) |
| F | browser_package_hint flatpak detection — UA heuristic returns "flatpak" | validated (CI) |
| G | browser_package_hint unknown — default returns "unknown" | validated (CI) |
| H | daemon unreachable hint — non-null when daemon not reachable | validated (CI) |
| I | systemd install script — script exists and is shellcheck-clean | validated (CI) |
| J | systemd check script — script exists and is shellcheck-clean | validated (CI) |
| K | systemd doctor script — script exists and is shellcheck-clean | validated (CI) |
| L | systemd uninstall script — script exists and is shellcheck-clean | validated (CI) |
| M | SIMURGH_REQUIRE_XVFB_TESTS wiring — env var present in CI workflow and test file | validated (CI) |
| N | Linux proof SDK contract — /proof returns { ok: true, daemon_proof: \<proof\> } | validated (CI) |
| O | Wayland consent-safety source grep — no banned methods in wayland.rs | validated (CI) |
| P | display_server_lock eviction — evictMissing called in server session sweep | validated (CI) |

---

## 4. Cybersecurity Audit Gates (Stage 2.8C/D)

Audit file: `tests/e2e/stage28cd_linux_security_audit.test.js` — 16 dimensions, 30 assertions

| Dimension | Assertions | Status |
|---|---|---|
| 1. Challenge binding and replay rejection | 2 | validated (CI) |
| 2. Signature verification | 2 | validated (CI) |
| 3. display_server_mismatch enforcement | 2 | validated (CI) |
| 4. Wayland consent-safety | 3 | validated (CI) |
| 5. XWayland partial-coverage labelling | 2 | validated (CI) |
| 6. browser_package_hint trust boundary | 3 | validated (CI) |
| 7. systemd user-only lifecycle | 2 | validated (CI) |
| 8. Privacy field rejection | 2 | validated (CI) |
| 9. Non-local DISPLAY rejection | 1 | validated (CI) |
| 10. Proof schema required fields | 2 | validated (CI) |
| 11. Portal probe property-read only | 2 | validated (CI) |
| 12. Audit chain integrity | 2 | validated (CI) |
| 13. Session lock eviction | 1 | validated (CI) |
| 14. No automatic misconduct finding | 1 | validated (CI) |
| 15. Report non-claims posture | 2 | validated (CI) |
| 16. CI mandatory Xvfb | 1 | validated (CI) |

---

## 5. Ubuntu CI Validation

The ubuntu-latest GitHub Actions runner validates the following under fully headless conditions:

| Item | Mechanism | Status |
|---|---|---|
| Xvfb headless X11 virtual display | apt install xvfb; mandatory Xvfb tests pass with SIMURGH_REQUIRE_XVFB_TESTS=1 | validated (CI) |
| Non-local DISPLAY rejection | Rust unit test; scanner refuses non-local DISPLAY values | validated (unit test) |
| display_server_mismatch enforcement | Smoke Scenario A; integration test via check suite | validated (CI) |
| All 16 smoke scenarios (A–P) | stage28cd_linux_wayland_systemd_ci_smoke.mjs run in check suite | validated (CI) |
| All 30 cybersecurity audit assertions | stage28cd_linux_security_audit.test.js run in check suite | validated (CI) |
| shellcheck on systemd scripts | shellcheck step in CI workflow | validated (CI) |
| cargo fmt --check | CI step | validated (CI) |
| cargo clippy | CI step | validated (CI) |

These results are automated and reproducible on every CI run. They do not imply validation on real desktop hardware.

---

## 6. Real-Device / Real-Desktop Validation

The CI environment provides a headless X11 virtual display via Xvfb. It does not run a real GNOME, KDE, or Sway session. The following table separates CI-automated from real-desktop status.

| Validation Type | Environments Covered | Status |
|---|---|---|
| Automated CI (headless Xvfb X11) | ubuntu-latest, headless | validated (CI) |
| Non-local DISPLAY rejection | unit test only | validated (unit test) |
| display_server_mismatch logic | integration test only | validated (CI) |
| Real GNOME Wayland session | physical hardware or VM with compositor | pending |
| Real GNOME X11 session | physical hardware or VM | pending |
| Real KDE Plasma Wayland | physical hardware or VM | pending |
| Real KDE Plasma X11 | physical hardware or VM | pending |
| Real Sway / wlroots session | physical hardware or VM | pending |
| XWayland app under real compositor | physical hardware or VM | pending |

Real-desktop evidence is pending for all non-CI environments.

---

## 7. Display Server Matrix

| Environment | Display Server | Expected Coverage | Expected Scanner State | Status |
|---|---|---|---|---|
| Ubuntu GNOME Wayland | wayland | wayland_limited | portal_probe | pending |
| Ubuntu GNOME X11 | x11 | x11_full | x11_active | pending (headless Xvfb CI validated) |
| Ubuntu XWayland app | xwayland | xwayland_partial | xwayland_detected | pending |
| Fedora GNOME Wayland | wayland | wayland_limited | portal_probe | pending |
| KDE Plasma Wayland | wayland | wayland_limited | portal_probe | pending |
| KDE Plasma X11 | x11 | x11_full | x11_active | pending |
| Sway / wlroots | wayland | wayland_limited | portal_probe | pending |
| Headless CI (Xvfb) | x11 (virtual) | x11_full | x11_active | validated (CI) |
| Non-local DISPLAY | x11 | rejected / unsupported | scanner_unavailable | validated (unit test) |
| display_server_mismatch | linux proof | rejected 409 | — | validated (smoke + integration) |

---

## 8. Browser Package Hint Matrix

`browser_package_hint` is a UX-only field. It is never included in the proof payload, never trusted by the server, and has no effect on the schema, risk engine, or report.

| Hint Value | Detection Condition | Trust Level | Used In | Status |
|---|---|---|---|---|
| snap | UA contains "Snap" heuristic | UX-only | daemon_unreachable_hint message | validated (smoke) |
| flatpak | UA contains "flatpak" heuristic | UX-only | daemon_unreachable_hint message | validated (smoke) |
| unknown | default | UX-only | daemon_unreachable_hint message | validated (smoke) |

Detection logic: UA string heuristic in `public/sdk/simurgh-browser-sdk.js`.

Never in proof, never trusted by server, schema, risk engine, or report.

---

## 9. systemd User Lifecycle Matrix

These scripts are dev-only lifecycle helpers. No production deployment claim is made.

| Script | shellcheck | dry-run | install tested | Status |
|---|---|---|---|---|
| scripts/install-user-unit.sh | CI pass | available | local only | validated (CI shellcheck) |
| scripts/uninstall-user-unit.sh | CI pass | available | local only | validated (CI shellcheck) |
| scripts/check-user-unit.sh | CI pass | available | local only | validated (CI shellcheck) |
| scripts/doctor-user-unit.sh | CI pass | available | local only | validated (CI shellcheck) |

Live install/start/stop/uninstall on real hardware has not been tested.

---

## 10. Privacy and Non-Collection Matrix

### Table A — Collected Fields

| Field | Type | Purpose |
|---|---|---|
| platform | string | identify OS |
| display_server | string | x11 / wayland / xwayland |
| scanner_state | string | current scanner operational state |
| scanner_version | string | daemon build version |
| coverage | string | x11_full / wayland_limited / xwayland_partial |
| x11_managed_window_count | integer | count of managed X11 windows |
| x11_override_redirect_window_count | integer | count of override-redirect X11 windows |
| x11_above_window_count | integer | count of above-layer X11 windows |
| x11_fullscreen_window_count | integer | count of fullscreen X11 windows |
| x11_skip_taskbar_window_count | integer | count of skip-taskbar X11 windows |
| xwayland_window_count | integer | count of XWayland windows detected |
| portal_advertised | boolean | whether XDG Desktop Portal is present |
| portal_active | boolean | whether portal responded to property probe |
| browser_package_hint | string | snap / flatpak / unknown (UX-only) |
| privacy_mode | string | proof privacy posture |
| scan_timestamp | string (ISO 8601) | when the scan was taken |
| scan_duration_ms | integer | elapsed scan time |
| visible_window_count | integer | total visible window count |
| suspicious_window_count | integer | count of anomalous windows |

### Table B — Never Collected

| Field | Why excluded |
|---|---|
| window title | identifies user activity; privacy contract violation |
| process name | identifies running software; privacy contract violation |
| PID | links window to process; privacy contract violation |
| XID / window handle | device-unique identifier; privacy contract violation |
| username | personal identifier; privacy contract violation |
| home directory path | reveals filesystem structure; privacy contract violation |
| executable path | identifies software; privacy contract violation |
| screen pixels / screenshots | captures screen content; privacy contract violation |
| webcam frames | biometric capture; privacy contract violation |
| microphone audio | audio capture; privacy contract violation |
| typed content | keystroke capture; privacy contract violation |
| paste content | clipboard capture; privacy contract violation |
| MAC address | hardware identifier; privacy contract violation |
| serial number | hardware identifier; privacy contract violation |
| machine ID | persistent device identifier; privacy contract violation |

---

## 11. Known Gaps

The following have not been validated and are honestly marked pending:

- Real GNOME Wayland session on physical hardware (portal probe path unconfirmed on real compositor)
- Real GNOME X11 session on physical hardware (only Xvfb headless validated; real GNOME session pending)
- Fedora GNOME Wayland: no device run performed
- KDE Plasma Wayland: no device run performed
- KDE Plasma X11: no device run performed
- Sway / wlroots: no device run performed
- XWayland application running under a real Wayland compositor: pending
- systemd user unit live install / start / stop / uninstall on real hardware: only shellcheck validated in CI
- snap browser detection on a real snap-packaged browser: only UA heuristic unit-tested
- flatpak browser detection on a real flatpak-packaged browser: only UA heuristic unit-tested
