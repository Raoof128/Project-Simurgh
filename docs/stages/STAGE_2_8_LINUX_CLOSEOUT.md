# Stage 2.8 Linux Display Integrity — Closeout Declaration

## 1. Closeout Declaration

Stage 2.8 Linux Display Integrity Research is frozen as a research-prototype baseline through v0.4.16. It documents signed Linux daemon proofs, X11 scanner coverage, Wayland portal property probing, XWayland partial coverage, display-server mismatch enforcement, dev-only systemd user lifecycle, CI validation, smoke coverage, and cybersecurity audit coverage.

It does not claim production Linux endpoint deployment, distro packaging, system-wide service deployment, MDM readiness, hardware attestation, kernel-level visibility, universal Wayland surface enumeration, GPU overlay detection, or automatic misconduct detection.

**Release tag:** `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`

> **Current baseline note (2026-05-25):** Gate counts in this document reflect the Stage 2.8 frozen state. The current Node.js test count is **331** (4 regression tests added in the Stage 2.9 methodology upgrade). All other counts are unchanged.

---

## 2. Release Covered

| Item        | Value                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Release tag | `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`                                                                     |
| Branch      | `stage-2-8c-8d-linux-wayland-systemd-ci` merged to `main`                                                            |
| PR #19      | Stage 2.8A — Rust axum daemon, P-256 ECDSA signed proofs                                                             |
| PR #20      | Stage 2.8B — X11 scanner, Wayland portal probe, XWayland path                                                        |
| PR #21      | Stage 2.8C/D combined — display_server_mismatch enforcement, systemd lifecycle, CI, smoke tests, cybersecurity audit |

---

## 3. What Is Frozen

- Rust axum localhost daemon (127.0.0.1:3031) with P-256 ECDSA signed proofs, challenge binding, and replay rejection
- X11 scanner: query_tree window counting (managed, override-redirect, above-hint, fullscreen, skip-taskbar), non-local DISPLAY rejection
- Wayland portal probe: NameHasOwner + GetProperty<AvailableSourceTypes> only; no CreateSession, SelectSources, Start, or OpenPipeWireRemote called
- XWayland partial coverage path: coverage=xwayland_partial, xwayland_window_count reported
- display_server_mismatch enforcement: session-scoped lock, 409 response + audit event on mismatch
- browser_package_hint UX boundary: present in UX hint only; absent from proof, server logic, schema, risk calculation, and report
- systemd --user unit + 4 lifecycle scripts (dev-only, shellcheck-clean, no root/sudo)
- Ubuntu CI workflow: ubuntu-latest, Xvfb, dbus-x11, shellcheck, cargo fmt, cargo clippy, SIMURGH_REQUIRE_XVFB_TESTS=1
- Smoke test suite: 16-scenario coverage (`stage28cd_linux_wayland_systemd_ci_smoke.mjs`)
- Cybersecurity audit: 30-assertion, 16-dimension coverage (`stage28cd_linux_security_audit.test.js`)

---

## 4. What Is Not Claimed

- NOT a production Linux endpoint deployment
- NOT distro packaging
- NOT a system-wide service (no systemctl --system)
- NOT MDM or enterprise device management readiness
- NOT hardware attestation or TPM-backed identity
- NOT kernel-level visibility (no eBPF, no kernel module)
- NOT universal Wayland surface enumeration
- NOT GPU overlay detection
- NOT automatic misconduct detection
- NOT Linux parity with Windows or macOS

---

## 5. Evidence Table

| Evidence                              | Type                                     | Status                 |
| ------------------------------------- | ---------------------------------------- | ---------------------- |
| Node tests                            | Automated                                | 327/327 pass           |
| Rust tests                            | Automated (SIMURGH_REQUIRE_XVFB_TESTS=1) | 33/33 pass             |
| scripts/check.sh                      | Automated                                | 52/52 pass             |
| npm audit                             | Automated                                | 0 high vulnerabilities |
| Privacy audit                         | Automated                                | Pass                   |
| cargo fmt                             | Automated                                | Clean                  |
| cargo clippy -D warnings              | Automated                                | Clean                  |
| Stage 2.8C/D smoke scenarios          | Automated                                | 16/16 pass             |
| Stage 2.8C/D cybersecurity assertions | Automated                                | 30/30 pass             |

---

## 6. Gate Evidence

All gate evidence is automated and reproducible via `scripts/check.sh` and the Ubuntu CI workflow. Key test files:

- `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs` — 16-scenario smoke suite covering daemon lifecycle, X11 scanner, Wayland probe, XWayland path, display_server_mismatch, and systemd integration
- `tests/e2e/stage28cd_linux_security_audit.test.js` — 30-assertion cybersecurity audit across 16 security dimensions
- `tools/simurgh-daemon-linux/tests/proof_endpoint_tests.rs` — Rust unit and integration tests for the axum daemon, ECDSA proof signing, challenge binding, and replay rejection
- `.github/workflows/stage-1-checks.yml` — Ubuntu CI workflow (ubuntu-latest, Xvfb, dbus-x11, shellcheck, cargo fmt, cargo clippy, SIMURGH_REQUIRE_XVFB_TESTS=1)

All gate evidence passed as of the freeze tag `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`.

---

## 7. Real-Device Evidence

Headless Xvfb CI validated all automated gate evidence. Real-device validation across physical Linux desktops is pending. Evidence will be collected according to the rules in `docs/evidence/stage-2-linux/README.md`.

| Environment                                      | Status    |
| ------------------------------------------------ | --------- |
| Headless CI (Xvfb, ubuntu-latest)                | Validated |
| Ubuntu GNOME Wayland (real compositor)           | Pending   |
| Ubuntu GNOME X11 (real desktop session)          | Pending   |
| XWayland app under real Wayland compositor       | Pending   |
| Fedora GNOME Wayland                             | Pending   |
| KDE Plasma Wayland                               | Pending   |
| KDE Plasma X11                                   | Pending   |
| Sway / wlroots                                   | Pending   |
| systemd live install/start/stop on real hardware | Pending   |

Real-device evidence will be added to `docs/evidence/stage-2-linux/` when available and will not alter the frozen gate evidence above.

---

## 8. Reviewer Notes

- Wayland is limited by compositor security design; the portal probe is property-read only and never initiates a capture session
- XWayland coverage is partial, not full Wayland or X11 coverage; the coverage field makes this explicit in every proof
- browser_package_hint is UX-only; it is not a security signal and does not influence proof content, server logic, risk scoring, or reporting
- display_server_mismatch is server-enforced and audit-logged; the daemon rejects session changes with a 409 and records an audit event
- The systemd unit is dev-only; no production deployment is claimed and no system-wide service is installed
- Manual review is recommended before any institutional use

---

## 9. Remaining Research Track

- Real-device validation across Fedora, KDE Plasma, and Sway/wlroots environments
- External technical review (GitHub Issue #24)
- Stage 3 Agent Shield planning
- Stage 4 GPU/compositor-layer research (future, no timeline committed)

---

## 10. Final Status

Stage 2.8 Linux Display Integrity Research is frozen as a documented research-prototype baseline through v0.4.16. All automated gate evidence is recorded. Real-device validation is pending and will be added to docs/evidence/stage-2-linux/ when available.
