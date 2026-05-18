# Stage 2.8C/D — Linux Wayland + XWayland + display-server-mismatch + systemd + Ubuntu CI (combined PR #21+#22) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the rest of Stage 2.8 (everything from Wayland portal probing through Ubuntu CI) in a single reviewer-grade PR. Closes the v0.4.15 P0 follow-up (`display_server_mismatch` live wiring), adds Wayland advertised/active probe (no consent triggered), XWayland partial coverage, Snap/Flatpak browser hint (UX-only, never server-trusted), development-only systemd `--user` lifecycle, Ubuntu CI Rust toolchain + shellcheck + mandatory Xvfb integration tests, and the combined Stage 2.8C/D smoke + cybersecurity audit gates.

**Architecture:** Ten phases (A → J) shipped in order. Phase A is the load-bearing live-server change; phases B–D are the scanner/SDK extensions; phases E–F are lifecycle + CI; phases G–J are gate, evidence, and doc consolidation. Every phase commits independently so any subagent can pick up between phases without context drift.

**Tech Stack:** Rust stable (`zbus` 4.x for DBus probe; existing `x11rb` for XWayland reuse). Bash (shellcheck-clean). systemd (`systemctl --user` only). GitHub Actions Ubuntu runner (`xvfb`, `x11-utils`, `dbus-x11`, `xterm`, Rust stable, shellcheck). Node 22 server. Spec: `docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md` §6.1–§6.10.

**Branch:** `stage-2-8c-8d-linux-wayland-systemd-ci` (already checked out from `main`).
**Target tag:** `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`.

**Scope (this PR):**
- Phase A — Live `display_server_mismatch` enforcement in `server.js` telemetry path.
- Phase B — Wayland portal advertised/active (no consent).
- Phase C — XWayland partial coverage detection + counting.
- Phase D — Snap/Flatpak/AppImage/etc browser packaging hint (UX-only).
- Phase E — systemd `--user` unit + install/uninstall/check/doctor scripts.
- Phase F — Ubuntu CI: Rust toolchain + Xvfb (mandatory via `SIMURGH_REQUIRE_XVFB_TESTS=1`) + shellcheck.
- Phase G — Combined Stage 2.8C/D smoke.
- Phase H — Combined Stage 2.8C/D cybersecurity audit.
- Phase I — `docs/evidence/stage-2-linux/README.md` (evidence rules).
- Phase J — Light README/ROADMAP/SECURITY/PRIVACY/AGENT/CHANGELOG updates.

**Out of scope:**
- Distro packaging (`.deb`/`.rpm`/Snap/Flatpak/AppImage).
- System-wide unit. Root service. Production endpoint deployment. MDM. Hardware attestation. Universal Wayland surface enumeration. GPU overlay detection. Automatic misconduct detection.
- Full reviewer docs + complete validation matrix (PR #23 closeout).
- Real-device validation across Fedora/KDE/Sway (Ubuntu GNOME + headless are minimums; full matrix is PR #23).

**Deviations from Raouf's blueprint:**
1. **Unit filename** `simurgh-daemon-linux.service` (per design spec §6.5), not the reverse-domain `dev.raouf.simurgh.daemon-linux.service` form.
2. **ExecStart** uses just the binary path, no `start` subcommand (the daemon's `main.rs` starts immediately on invoke).
3. **Binary distribution** uses `cargo install --path tools/simurgh-daemon-linux --root "$HOME/.local"` so the binary lands at the unit's expected path.
4. **`shellcheck` CI gate** added (not in blueprint; standard bash hygiene).
5. **`SIMURGH_REQUIRE_XVFB_TESTS` env-var enforcement** added as an explicit phase-F task — PR #20's tests skip gracefully today; this PR makes them fail loudly in CI.

---

## File Structure

**New files (Rust scanner):**
- `tools/simurgh-daemon-linux/src/scanner/wayland.rs`
- `tools/simurgh-daemon-linux/src/scanner/xwayland.rs`
- `tools/simurgh-daemon-linux/tests/wayland_scanner_tests.rs`
- `tools/simurgh-daemon-linux/tests/xwayland_scanner_tests.rs`

**New files (systemd):**
- `tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service`
- `tools/simurgh-daemon-linux/scripts/install-user-unit.sh`
- `tools/simurgh-daemon-linux/scripts/uninstall-user-unit.sh`
- `tools/simurgh-daemon-linux/scripts/check-user-unit.sh`
- `tools/simurgh-daemon-linux/scripts/doctor-user-unit.sh`

**New files (tests + scripts):**
- `tests/unit/displayServerLockServerWiring.test.js`
- `tests/unit/browserPackageHintUxOnly.test.js`
- `tests/unit/linuxSystemdScripts.test.js`
- `tests/unit/linuxCiWorkflow.test.js`
- `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs`
- `tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js`
- `scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh`
- `scripts/security-audit-stage-2-8c-8d-linux-wayland-systemd-ci.sh`
- `docs/evidence/stage-2-linux/README.md`

**Modified files:**
- `server.js` — wire `createDisplayServerLock` into telemetry handler.
- `src/device/daemonState.js` — registry exposes lock (or live wiring uses module-singleton).
- `src/device/scannerRiskPolicy.js` — no new Linux mappings (already handled in PR #20); verify no regression.
- `src/academic/reportBuilder.js` — Linux branch already emits `display_server`/`coverage`; verify `portal_*` honest when Wayland.
- `public/sdk/simurgh-browser-sdk.js` — `browser_package_hint` UX-only field on `getDeviceShieldStatus()`.
- `public/instructor.html` — UX badge for sandboxed-browser hint (no misconduct wording).
- `tools/simurgh-daemon-linux/Cargo.toml` — add `zbus = "4"`.
- `tools/simurgh-daemon-linux/src/scanner/mod.rs` — export wayland + xwayland modules.
- `tools/simurgh-daemon-linux/src/http.rs` — `/status` and `/proof` consume new scanner output.
- `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs` — `SIMURGH_REQUIRE_XVFB_TESTS` enforcement.
- `.github/workflows/stage-1-checks.yml` — Rust toolchain + apt deps + shellcheck.
- `scripts/check.sh` — wire all Stage 2.8 gates.
- `README.md`, `ROADMAP.md`, `SECURITY.md`, `PRIVACY.md`, `AGENT.md`, `CHANGELOG.md` — light status updates.

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase A — Live `display_server_mismatch` enforcement
# ═══════════════════════════════════════════════════════════════════════════

The factory + 5 unit tests for `createDisplayServerLock` shipped in PR #19 but the server doesn't actually call it. This phase closes the v0.4.15 P0 follow-up.

## Task A1: Red — server.js does not enforce display_server_mismatch

**Files:**
- Create: `tests/unit/displayServerLockServerWiring.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Live-server integration: a Linux session that switches display_server
// mid-session must be rejected with display_server_mismatch on the
// /api/telemetry handler — not just at the factory level.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import test from "node:test";

function b64url(b) {
  return Buffer.from(b).toString("base64url");
}
function canonical(payload) {
  const o = {};
  for (const k of Object.keys(payload).sort()) if (k !== "signature") o[k] = payload[k];
  return JSON.stringify(o);
}
function ident() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pk = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    public_key: b64url(pk),
    node_id_hash: `sha256:${crypto.createHash("sha256").update(pk).digest("hex")}`,
  };
}
function sign(id, p) {
  return b64url(
    crypto.sign("sha256", Buffer.from(canonical(p)), { key: id.privateKey, dsaEncoding: "der" })
  );
}
function linuxScanner(overrides = {}) {
  return {
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scanner_reason: "none",
    display_server: "x11",
    coverage: "x11_full",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    privacy_mode: "metadata_only",
    ...overrides,
  };
}

async function bootServer() {
  const port = 33129;
  const srv = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(port), SIMURGH_DEMO_MODE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return { srv, url: `http://127.0.0.1:${port}` };
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  srv.kill();
  throw new Error("server did not boot");
}

async function challenge(url, sessionId, token, purpose) {
  const r = await fetch(`${url}/api/device/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, purpose }),
  });
  return (await r.json()).challenge;
}

test("server.js rejects telemetry proof when display_server changes mid-session", async () => {
  const { srv, url } = await bootServer();
  try {
    // Bootstrap a Linux session.
    const exam = await (
      await fetch(`${url}/api/exams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Stage28C-display-lock" }),
      })
    ).json();
    const join = await (
      await fetch(`${url}/api/exams/${exam.id}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: "lock@student.test" }),
      })
    ).json();
    const { sessionId, sessionToken: token } = join;
    await fetch(`${url}/api/sessions/${sessionId}/privacy-accept`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    await fetch(`${url}/api/sessions/${sessionId}/start`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const id = ident();
    // Pair as Linux.
    const pairChallenge = await challenge(url, sessionId, token, "pair");
    const signedPair = {
      type: "simurgh.daemon.pair",
      session_id: sessionId,
      exam_id: exam.id,
      challenge: pairChallenge,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
    };
    const pairResp = await fetch(`${url}/api/device/pair`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        node_id_hash: id.node_id_hash,
        public_key: id.public_key,
        signed_payload: signedPair,
        signature: sign(id, signedPair),
      }),
    });
    assert.equal(pairResp.status, 200, "Linux pair must succeed");

    // First proof: x11
    const c1 = await challenge(url, sessionId, token, "proof");
    const p1 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 1,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c1,
      ...linuxScanner({ display_server: "x11", coverage: "x11_full" }),
    };
    p1.signature = sign(id, p1);
    const t1 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 1,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4,
          chars_typed: 12,
          effective_wpm: 42,
          focus_losses: 0,
          time_off_window_ms: 0,
          pastes: 0,
          paste_payload_chars: 0,
          max_idle_gap_ms: 0,
          window_seconds: 5,
        },
        daemon_proof: p1,
      }),
    });
    assert.equal(t1.status, 200, "x11 proof must be accepted");

    // Second proof: wayland in SAME session.
    const c2 = await challenge(url, sessionId, token, "proof");
    const p2 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 2,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c2,
      ...linuxScanner({
        display_server: "wayland",
        coverage: "wayland_limited",
        scanner_state: "wayland_compositor_restricted",
      }),
    };
    p2.signature = sign(id, p2);
    const t2 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 2,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4,
          chars_typed: 12,
          effective_wpm: 42,
          focus_losses: 0,
          time_off_window_ms: 0,
          pastes: 0,
          paste_payload_chars: 0,
          max_idle_gap_ms: 0,
          window_seconds: 5,
        },
        daemon_proof: p2,
      }),
    });
    assert.ok(t2.status >= 400 && t2.status < 500, `wayland-after-x11 must 4xx, got ${t2.status}`);
    const body = await t2.json().catch(() => ({}));
    const reason = body.error || body.reason;
    assert.equal(reason, "display_server_mismatch", `expected display_server_mismatch, got ${reason}`);
  } finally {
    srv.kill();
  }
});
```

- [ ] **Step 2: Run + observe failure**

```bash
node --test tests/unit/displayServerLockServerWiring.test.js
```
Expected: FAIL — the second telemetry returns 200 because the server doesn't enforce the lock.

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/displayServerLockServerWiring.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8c): red — display_server_mismatch not enforced live"
```

## Task A2: Green — wire createDisplayServerLock into server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Read `server.js` around the telemetry handler (line 754, `recordProofVerified`)**

The display-server-lock check must run AFTER `validateDaemonProof` succeeds and BEFORE `recordProofVerified` is called. On lock rejection, emit `DAEMON_PROOF_REJECTED` with reason `display_server_mismatch` and return 409 with `error: "display_server_mismatch"`. Do NOT increment `proofs_verified`.

- [ ] **Step 2: Instantiate a module-level lock**

Near the top of `server.js` where other registries are constructed:
```javascript
import { createDaemonStateRegistry, createDisplayServerLock } from "./src/device/daemonState.js";
// ...
const displayServerLock = createDisplayServerLock();
```
(If `createDisplayServerLock` is already imported, just add the construction.)

- [ ] **Step 3: Add the lock check in the telemetry handler**

In `/api/telemetry` handler, AFTER the daemonValidation success check and BEFORE the `consumed.ok` check (or wherever sequencing makes sense — read the existing flow first to place it correctly):
```javascript
    if (daemonValidation.proof.platform === "linux" && daemonValidation.proof.display_server) {
      const lockResult = displayServerLock.observe(
        sessionId,
        daemonValidation.proof.display_server
      );
      if (!lockResult.ok) {
        appendAudit(sess, EVENTS.DAEMON_PROOF_REJECTED, {
          reason: "display_server_mismatch",
          locked_display_server: lockResult.locked_display_server,
          observed_display_server: lockResult.observed_display_server,
          node_id_hash: daemonValidation.proof.node_id_hash,
        });
        return res.status(409).json({ error: "display_server_mismatch" });
      }
    }
```

- [ ] **Step 4: Evict the lock on session end**

Find where the session is submitted/ended in `server.js`. Add `displayServerLock.evict(sessionId)` alongside `daemonStateRegistry.evict(sessionId)`. Same pattern for the `evictMissing` sweep (if one exists).

- [ ] **Step 5: Run tests**

```bash
node --test tests/unit/displayServerLockServerWiring.test.js
```
Expected: PASS.

```bash
npm test
```
Expected: full suite green (no regression).

- [ ] **Step 6: Commit**

```bash
git add server.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8c): wire display_server_mismatch into /api/telemetry"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase B — Wayland portal advertised vs active (no consent triggered)
# ═══════════════════════════════════════════════════════════════════════════

## Task B1: Add zbus dependency + wayland scanner skeleton

**Files:**
- Modify: `tools/simurgh-daemon-linux/Cargo.toml`
- Create: `tools/simurgh-daemon-linux/src/scanner/wayland.rs`
- Modify: `tools/simurgh-daemon-linux/src/scanner/mod.rs`

- [ ] **Step 1: Add `zbus` 4.x to `[dependencies]`**

```toml
zbus = { version = "4", default-features = false, features = ["tokio"] }
```

- [ ] **Step 2: Create `tools/simurgh-daemon-linux/src/scanner/wayland.rs`**

```rust
//! Wayland portal probe — `portal_advertised` (cheap DBus name check) and
//! `portal_active` (no-consent capability probe). Never starts a ScreenCast
//! session. Falls back to `portal_active_probe_unavailable` if the compositor
//! cannot provide a safe probe.

use crate::scanner::privacy::X11ScannerSummary;

#[derive(Debug, Clone, Copy)]
pub struct WaylandProbe {
    pub portal_advertised: bool,
    pub portal_active: bool,
    pub probe_unavailable: bool,
}

pub fn probe() -> WaylandProbe {
    // Synchronous, best-effort probe. Runs blocking zbus calls in a small
    // tokio runtime so the rest of the daemon stays unchanged. If anything
    // fails — missing session bus, no portal, DBus timeout — emit a
    // `probe_unavailable` result; we NEVER raise an error to callers because
    // privacy boundary must not propagate DBus details.
    let result = std::panic::catch_unwind(probe_inner).unwrap_or(WaylandProbe {
        portal_advertised: false,
        portal_active: false,
        probe_unavailable: true,
    });
    result
}

fn probe_inner() -> WaylandProbe {
    use tokio::runtime::Builder;
    let rt = match Builder::new_current_thread().enable_all().build() {
        Ok(rt) => rt,
        Err(_) => {
            return WaylandProbe {
                portal_advertised: false,
                portal_active: false,
                probe_unavailable: true,
            };
        }
    };
    rt.block_on(async {
        let conn = match zbus::Connection::session().await {
            Ok(c) => c,
            Err(_) => {
                return WaylandProbe {
                    portal_advertised: false,
                    portal_active: false,
                    probe_unavailable: true,
                };
            }
        };
        // Step 1: is org.freedesktop.portal.Desktop advertised on the session bus?
        let advertised = name_has_owner(&conn, "org.freedesktop.portal.Desktop").await;
        if !advertised {
            return WaylandProbe {
                portal_advertised: false,
                portal_active: false,
                probe_unavailable: false,
            };
        }
        // Step 2: read ScreenCast.AvailableSourceTypes as a SAFE capability probe.
        // This is a property read, not a session start — no consent dialog can fire.
        let active = read_available_source_types(&conn).await.is_some();
        WaylandProbe {
            portal_advertised: true,
            portal_active: active,
            probe_unavailable: !active,
        }
    })
}

async fn name_has_owner(conn: &zbus::Connection, name: &str) -> bool {
    use zbus::Proxy;
    let proxy = match Proxy::new(
        conn,
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
    )
    .await
    {
        Ok(p) => p,
        Err(_) => return false,
    };
    proxy
        .call::<_, _, bool>("NameHasOwner", &(name,))
        .await
        .unwrap_or(false)
}

async fn read_available_source_types(conn: &zbus::Connection) -> Option<u32> {
    use zbus::Proxy;
    let proxy = Proxy::new(
        conn,
        "org.freedesktop.portal.Desktop",
        "/org/freedesktop/portal/desktop",
        "org.freedesktop.portal.ScreenCast",
    )
    .await
    .ok()?;
    proxy.get_property::<u32>("AvailableSourceTypes").await.ok()
}

pub fn wayland_summary(probe_result: WaylandProbe) -> X11ScannerSummary {
    // Reuse X11ScannerSummary shape for uniform proof field set, but populate
    // Wayland-specific state. Counts stay at 0 — Wayland security model does
    // not allow cross-client surface enumeration.
    let scanner_state = if probe_result.portal_advertised && probe_result.portal_active {
        "wayland_portal_available"
    } else if probe_result.portal_advertised {
        "wayland_compositor_restricted"
    } else {
        "wayland_compositor_unsupported"
    };
    let scanner_reason = if probe_result.probe_unavailable {
        "portal_active_probe_unavailable"
    } else if probe_result.portal_advertised && !probe_result.portal_active {
        "portal_not_active"
    } else {
        "none"
    };
    X11ScannerSummary {
        scanner_state,
        scanner_reason,
        coverage: "wayland_limited",
        x11_managed_window_count: 0,
        x11_override_redirect_window_count: 0,
        x11_above_window_count: 0,
        x11_fullscreen_window_count: 0,
        x11_skip_taskbar_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 0,
    }
}
```

- [ ] **Step 3: Update `scanner/mod.rs`**

```rust
pub mod privacy;
pub mod session;
pub mod wayland;
pub mod x11;
pub mod xwayland;
```

(`xwayland` module lands in Phase C; declare both now so Phase C's PR diff stays small.)

- [ ] **Step 4: Create a stub `scanner/xwayland.rs` (Phase C populates it)**

```rust
// Phase C populates this module. Stub for now to keep mod.rs declared.
```

- [ ] **Step 5: Build**

```bash
source ~/.cargo/env && cargo build --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```
Expected: builds (will fetch zbus on first build).

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8c): Wayland portal scanner (advertised/active, no consent)"
```

## Task B2: Wayland scanner unit tests

**Files:**
- Create: `tools/simurgh-daemon-linux/tests/wayland_scanner_tests.rs`

- [ ] **Step 1: Write tests for `wayland_summary` (pure function — easy to unit test)**

```rust
use simurgh_daemon_linux::scanner::wayland::{wayland_summary, WaylandProbe};

#[test]
fn wayland_summary_active_emits_portal_available_state() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: true,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_portal_available");
    assert_eq!(s.scanner_reason, "none");
    assert_eq!(s.coverage, "wayland_limited");
}

#[test]
fn wayland_summary_advertised_only_emits_compositor_restricted() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: false,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_compositor_restricted");
    assert_eq!(s.scanner_reason, "portal_not_active");
}

#[test]
fn wayland_summary_probe_unavailable_emits_portal_active_probe_unavailable() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: false,
        probe_unavailable: true,
    });
    assert_eq!(s.scanner_reason, "portal_active_probe_unavailable");
}

#[test]
fn wayland_summary_not_advertised_emits_compositor_unsupported() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: false,
        portal_active: false,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_compositor_unsupported");
}

#[test]
fn wayland_summary_emits_zero_counts() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: true,
        probe_unavailable: false,
    });
    assert_eq!(s.x11_managed_window_count, 0);
    assert_eq!(s.visible_window_count, 0);
}
```

- [ ] **Step 2: Run**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml --test wayland_scanner_tests
```
Expected: 5/5 PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-daemon-linux/tests/wayland_scanner_tests.rs
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8c): wayland_summary unit tests"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase C — XWayland partial coverage
# ═══════════════════════════════════════════════════════════════════════════

XWayland presents an X11 connection inside a Wayland session. Use the existing X11 scanner against `$DISPLAY` and mark coverage as `xwayland_partial`. Counts come from `xwayland_window_count` (mapped from the existing X11 managed_window_count).

## Task C1: XWayland scanner module

**Files:**
- Modify: `tools/simurgh-daemon-linux/src/scanner/xwayland.rs` (created as stub in B1)
- Create: `tools/simurgh-daemon-linux/tests/xwayland_scanner_tests.rs`

- [ ] **Step 1: Implement `xwayland.rs`**

```rust
//! XWayland scanner — reuses the X11 path against $DISPLAY but maps results
//! into the xwayland-partial coverage shape so reports never claim full
//! Wayland coverage from XWayland-only visibility.

use crate::scanner::privacy::{scanner_unavailable, X11ScannerSummary};
use crate::scanner::session::is_local_display;

pub fn scan() -> X11ScannerSummary {
    let display = std::env::var("DISPLAY").unwrap_or_default();
    if !is_local_display(&display) {
        return scanner_unavailable("non_local_display");
    }
    match crate::scanner::x11::scan_inner_public() {
        Ok(raw) => X11ScannerSummary {
            scanner_state: "xwayland_detected",
            scanner_reason: "none",
            coverage: "xwayland_partial",
            x11_managed_window_count: 0,
            x11_override_redirect_window_count: raw.override_redirect_window_count,
            x11_above_window_count: raw.above_window_count,
            x11_fullscreen_window_count: raw.fullscreen_window_count,
            x11_skip_taskbar_window_count: raw.skip_taskbar_window_count,
            suspicious_window_count: 0,
            // XWayland-visible windows surface here, NOT in x11_managed_window_count.
            visible_window_count: raw.managed_window_count + raw.override_redirect_window_count,
        },
        Err(reason) => scanner_unavailable(reason),
    }
}
```

- [ ] **Step 2: Expose `scan_inner_public` from `x11.rs`**

Edit `tools/simurgh-daemon-linux/src/scanner/x11.rs`. Locate `fn scan_inner` and add a public wrapper:
```rust
pub fn scan_inner_public() -> Result<crate::scanner::privacy::RawX11Counts, &'static str> {
    scan_inner()
}
```

(The existing `scan_inner` stays private; `scan_inner_public` is a stable re-export point so `xwayland.rs` doesn't pull the entire private surface.)

- [ ] **Step 3: Write XWayland tests**

`tools/simurgh-daemon-linux/tests/xwayland_scanner_tests.rs`:
```rust
use simurgh_daemon_linux::scanner::xwayland;

#[test]
fn xwayland_refuses_non_local_display() {
    std::env::set_var("DISPLAY", "host.tld:0");
    let s = xwayland::scan();
    assert_eq!(s.scanner_reason, "non_local_display");
}

#[test]
fn xwayland_returns_partial_coverage_when_local() {
    // Real Xvfb available on this host from PR #20. Without Xvfb, scan_inner
    // returns "scanner_unavailable" and that path is still a valid outcome
    // — just assert the coverage label when we do succeed.
    std::env::set_var("DISPLAY", ":0");
    let s = xwayland::scan();
    if s.scanner_state == "xwayland_detected" {
        assert_eq!(s.coverage, "xwayland_partial");
    } else {
        assert_eq!(s.scanner_state, "scanner_unavailable");
    }
}
```

- [ ] **Step 4: Build + test**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8c): XWayland scanner with partial coverage label"
```

## Task C2: Route /status and /proof to wayland/xwayland scanners

**Files:**
- Modify: `tools/simurgh-daemon-linux/src/http.rs`

- [ ] **Step 1: Extend `current_scanner_summary()` to dispatch by display_server**

Replace the current x11-only branch with:
```rust
pub(crate) fn current_scanner_summary() -> CurrentScan {
    use crate::scanner::wayland::{probe as wayland_probe, wayland_summary};
    let det = detect(&SessionEnv::from_process_env());
    let scanner = match det.display_server {
        "x11" if det.scanner_reason == "none" => Some(x11::scan()),
        "wayland" => Some(wayland_summary(wayland_probe())),
        "xwayland" => Some(crate::scanner::xwayland::scan()),
        _ => None,
    };
    CurrentScan { detection: det, x11: scanner }
}
```

(The field name `x11` is now a misnomer — it's the per-platform summary. Rename to `scanner` in `CurrentScan` AND update both `/status` and `/proof` handlers to use the new name.)

- [ ] **Step 2: Update the `display_server` mapping in `/proof` handler**

In the `display_server` match in `proof()`, the existing branches are already correct — just confirm `"wayland"` and `"xwayland"` produce strings matching the spec.

- [ ] **Step 3: Run tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```
Expected: all PASS (existing headless + x11 + non-local + wayland summary + xwayland tests).

```bash
cargo fmt --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8c): /status + /proof dispatch to wayland/xwayland scanners"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase D — Snap/Flatpak/AppImage browser hint (UX-only)
# ═══════════════════════════════════════════════════════════════════════════

## Task D1: Browser SDK `browser_package_hint` (UX-only)

**Files:**
- Modify: `public/sdk/simurgh-browser-sdk.js`
- Create: `tests/unit/browserPackageHintUxOnly.test.js`

- [ ] **Step 1: Add `browser_package_hint` to `getDeviceShieldStatus()`**

The hint is browser-side only. Best-effort detection: read `navigator.userAgent` and a small set of Linux-specific signals (Wayland-only browsers expose `FIREFOX_SNAP_NAME` env-like markers, Snap has a `/snap/` path leak via `chrome://version`, etc.). Since none of these are reliable across browsers, default to `"unknown"` and document that this is purely a UX hint.

```javascript
function detectBrowserPackageHint() {
  // UX-only signal. Never trusted by the server. Sandboxed browsers (Snap,
  // Flatpak) may have different localhost loopback behaviour than unconfined
  // distro builds. This hint lets the dashboard show a "you may need an
  // unconfined browser to talk to the daemon" note. It does NOT affect risk.
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  // Snap Firefox sets a distinct user-agent fragment on some distros.
  if (/Snap/i.test(ua)) return "snap";
  // Flatpak browsers expose flatpak-version inside chrome://gpu or similar;
  // we only check the UA path that's safely accessible from web context.
  if (/Flatpak/i.test(ua)) return "flatpak";
  // Default to unknown — never guess.
  return "unknown";
}

// Inside getDeviceShieldStatus() return object, add:
//   browser_package_hint: detectBrowserPackageHint(),
```

- [ ] **Step 2: Write the UX-only enforcement test**

`tests/unit/browserPackageHintUxOnly.test.js`:
```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("browser_package_hint is exposed only via getDeviceShieldStatus (UX-only)", () => {
  const sdk = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  assert.ok(/browser_package_hint/.test(sdk), "browser_package_hint missing");
  // Trust-boundary comment must remain. Server NEVER consults SDK signals.
  assert.ok(
    /server NEVER (consults|trusts)|TRUST BOUNDARY/i.test(sdk),
    "SDK trust-boundary comment removed or weakened"
  );
});

test("server.js does not branch on or trust browser_package_hint", () => {
  const srv = readFileSync("server.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(srv),
    "server.js references browser_package_hint — must be UX-only"
  );
});

test("daemonProof validator does not accept browser_package_hint as a trusted field", () => {
  const proof = readFileSync("src/device/daemonProof.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(proof),
    "daemonProof validator references browser_package_hint — UX-only fields must not flow into signed proofs"
  );
});
```

- [ ] **Step 3: Run**

```bash
node --test tests/unit/browserPackageHintUxOnly.test.js
```
Expected: 3/3 PASS after the SDK edit lands.

- [ ] **Step 4: Commit**

```bash
git add public/sdk/simurgh-browser-sdk.js tests/unit/browserPackageHintUxOnly.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8c): browser_package_hint as UX-only SDK signal"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase E — systemd `--user` lifecycle
# ═══════════════════════════════════════════════════════════════════════════

This phase follows the previously-written PR #22 plan (file `docs/superpowers/plans/2026-05-18-stage-2-8d-linux-systemd-ci.md`) Tasks 1–3 verbatim. Re-using the same files and content here for self-containment:

## Task E1: Red — systemd files missing

**File:** `tests/unit/linuxSystemdScripts.test.js` — identical to the standalone PR #22 plan Task 1. Asserts the unit file + 4 scripts exist, use `systemctl --user` only, support `--check` and `--dry-run`, contain no `sudo` / `eval` / `curl | sh`.

(See `docs/superpowers/plans/2026-05-18-stage-2-8d-linux-systemd-ci.md` Task 1 for the full test code. Copy verbatim.)

## Task E2: systemd unit file

**File:** `tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service` — identical to standalone PR #22 plan Task 2. Includes hardening directives (`NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=true`, `ReadWritePaths=%h/.local/state/simurgh`).

## Task E3: 4 lifecycle scripts

**Files:** `install-user-unit.sh`, `uninstall-user-unit.sh`, `check-user-unit.sh`, `doctor-user-unit.sh` — verbatim from PR #22 plan Task 3.

Each commit pattern:
```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8d): ..."
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase F — Ubuntu CI + mandatory Xvfb
# ═══════════════════════════════════════════════════════════════════════════

## Task F1: `SIMURGH_REQUIRE_XVFB_TESTS` enforcement

**File:** `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs`

Replace every `if !xvfb_available() { ... return; }` with:
```rust
    if !xvfb_available() {
        if std::env::var("SIMURGH_REQUIRE_XVFB_TESTS").is_ok() {
            panic!("SIMURGH_REQUIRE_XVFB_TESTS is set but Xvfb is not installed");
        }
        eprintln!("Xvfb not installed; skipping");
        return;
    }
```

Three tests need this update.

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -am "feat(stage-2-8d): SIMURGH_REQUIRE_XVFB_TESTS promotes Xvfb to mandatory in CI"
```

## Task F2: Extend `.github/workflows/stage-1-checks.yml`

Insert AFTER `Install dependencies (npm ci)` and BEFORE `Run Stage 1 check suite`:

```yaml
      - name: Install Linux daemon test dependencies (xvfb, dbus, shellcheck)
        run: |
          sudo apt-get update
          sudo apt-get install -y --no-install-recommends \
            xvfb x11-utils dbus-x11 xterm shellcheck

      - name: Install Rust stable toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt,clippy

      - name: Cache cargo registry + target
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            tools/simurgh-daemon-linux/target
          key: ${{ runner.os }}-cargo-${{ hashFiles('tools/simurgh-daemon-linux/Cargo.lock') }}
          restore-keys: |
            ${{ runner.os }}-cargo-

      - name: Shellcheck Linux daemon lifecycle scripts
        run: shellcheck tools/simurgh-daemon-linux/scripts/*.sh

      - name: Rust fmt (Linux daemon)
        run: cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml

      - name: Rust clippy (Linux daemon)
        run: cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings

      - name: Rust tests (Linux daemon) — Xvfb mandatory
        env:
          SIMURGH_REQUIRE_XVFB_TESTS: "1"
        run: cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Validate YAML:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/stage-1-checks.yml'))"
```

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -am "ci(stage-2-8d): Ubuntu Rust + mandatory Xvfb + shellcheck"
```

## Task F3: CI workflow assertion test

**File:** `tests/unit/linuxCiWorkflow.test.js` — verbatim from PR #22 plan Task 7. Asserts the workflow installs xvfb / x11-utils / dbus-x11, uses `dtolnay/rust-toolchain@stable`, runs `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, sets `SIMURGH_REQUIRE_XVFB_TESTS: "1"`, runs shellcheck, and has NO publish/deploy/secret-echo steps.

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase G — Combined Stage 2.8C/D smoke
# ═══════════════════════════════════════════════════════════════════════════

## Task G1: Smoke test

**Files:**
- Create: `tests/e2e/stage28cd_linux_wayland_systemd_ci_smoke.mjs`
- Create: `scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh`

The smoke runs 16 scenarios. Use the Stage 2.8A/B smoke (`stage28ab_linux_foundation_x11_smoke.mjs`) as the template — same Node helpers for forging signed Linux proofs and posting to the server.

Scenarios:

| ID | Scenario                                | Expected                                          |
| -- | --------------------------------------- | ------------------------------------------------- |
| A  | X11 healthy                             | `coverage=x11_full`                               |
| B  | Wayland advertised+active               | accepted, `wayland_portal_available`              |
| C  | Wayland advertised only                 | accepted, `wayland_compositor_restricted`, Warning |
| D  | Wayland portal probe unavailable        | accepted, `scanner_reason=portal_active_probe_unavailable` |
| E  | XWayland partial                        | accepted, `coverage=xwayland_partial`             |
| F  | Snap/Flatpak hint via SDK               | UX-only, server ignores                           |
| G  | display-server mismatch (x11 → wayland) | rejected, `display_server_mismatch`               |
| H  | non-local `$DISPLAY`                    | accepted, `scanner_reason=non_local_display`      |
| I  | headless                                | accepted, `scanner_reason=no_display_server`      |
| J  | systemd install --check                 | no mutation                                       |
| K  | systemd install --dry-run               | safe output                                       |
| L  | service file safety                     | user unit only                                    |
| M  | mandatory Xvfb in CI mode               | (CI only) real tests run                          |
| N  | Linux report device_integrity           | correct fields, no macOS/Windows leak             |
| O  | audit verify                            | valid chain                                       |
| P  | Stage 2.7 + Stage 2.8A/B regression     | green                                             |

Smoke implementation: extend the Stage 2.8A/B smoke pattern. For lifecycle scenarios J–L, call the bash scripts via `execFileSync` and assert on output (same pattern as the PR #22 plan's smoke). For Wayland scenarios B/C/D, the daemon-Wayland-probe is exercised in unit tests; the SMOKE just sends Node-forged proofs with the relevant `scanner_state` / `scanner_reason` field combinations and asserts the server accepts each with Warning context.

Wrapper script `scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh` follows the same shape as `smoke-stage-2-8a-2-8b-linux-foundation-x11.sh` (boot server, wait for health, run smoke, run privacy audit, declare pass).

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8cd): combined Wayland + systemd + CI smoke (16 scenarios)"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase H — Combined Stage 2.8C/D cybersecurity audit
# ═══════════════════════════════════════════════════════════════════════════

## Task H1: Audit test + wrapper

**Files:**
- Create: `tests/security/stage28cd_linux_wayland_systemd_ci_security_audit.test.js`
- Create: `scripts/security-audit-stage-2-8c-8d-linux-wayland-systemd-ci.sh`

Audit dimensions (16, mirroring Raouf's blueprint Phase H + the PR #22 plan's Phase 8 audit):

1. Proof signature, tamper, stale/future, replay.
2. Pairing — Linux valid, freebsd rejected.
3. Display lock — live `display_server_mismatch` enforced.
4. Wayland — `portal_advertised` and `portal_active` are independent fields; no consent triggered.
5. Consent safety — Wayland probe never starts ScreenCast session.
6. XWayland — `coverage=xwayland_partial` and never claims `wayland_limited` or `x11_full` parity.
7. Browser hint — `browser_package_hint` is UX-only, ignored by `server.js` and `daemonProof.js`.
8. systemd — user unit only, no root / sudo / system-wide install.
9. Scripts — no `eval`, no `curl | sh`, paths quoted.
10. CI — Rust fmt/clippy/test enforced.
11. Xvfb — `SIMURGH_REQUIRE_XVFB_TESTS=1` in CI workflow.
12. Privacy — recursive forbidden-field rejection for every Linux raw-field vector (DBus identifiers, X11 IDs, process/window/user fields).
13. Report — no raw fields; correct Linux fields; no macOS/Windows-only leakage.
14. Dashboard — no misconduct phrases.
15. Audit chain — verifies; tamper invalidates.
16. Wording — no production / attestation / automatic-misconduct overclaim.

Reuse the Stage 2.8A/B audit test as the structural template. Add Wayland-specific assertions for (4, 5, 6), browser-hint assertions for (7), and the systemd / CI / shellcheck assertions for (8–11).

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8cd): combined cybersecurity audit (16 dimensions)"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase I — Evidence rules
# ═══════════════════════════════════════════════════════════════════════════

## Task I1: `docs/evidence/stage-2-linux/README.md`

Verbatim from the PR #22 plan Task 10. Allowed: daemon `/health` JSON, `/status` JSON, signed proof (signature redacted), server accept/reject responses, report `device_integrity`, audit verify result, test logs, `systemctl --user is-enabled` / `is-active`, GitHub Actions run URL. Forbidden: window titles, process names, PIDs, XIDs, usernames, hostnames, home paths, machine IDs, MAC addresses, screen pixels, webcam, mic, typed/pasted content.

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "docs(stage-2-8cd): Linux evidence rules README"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Phase J — Light docs + check.sh wiring
# ═══════════════════════════════════════════════════════════════════════════

## Task J1: Wire 2.8A/B + 2.8C/D gates into `scripts/check.sh`

After the existing Stage 2.6/2.7 closeout block, add Stage 2.8A/B + 2.8C/D gate invocations (`smoke-stage-2-8a-2-8b-*.sh`, `security-audit-stage-2-8a-2-8b-*.sh`, `smoke-stage-2-8c-8d-*.sh`, `security-audit-stage-2-8c-8d-*.sh`) + the Linux Rust gate block from PR #22 plan Task 9.

## Task J2: Light README / ROADMAP / SECURITY / PRIVACY / AGENT / CHANGELOG updates

- ROADMAP: mark Stage 2.8C/D shipped under `v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci`.
- SECURITY: append systemd hygiene block + CI Rust + Xvfb mandatory; preserve non-claims.
- PRIVACY: update last-updated date; add a line confirming the browser_package_hint is UX-only.
- README: bump verification counts.
- AGENT.md + CHANGELOG.md: new entries starting with `Raouf:` documenting Stage 2.8C/D scope, files, verification, follow-ups (PR #23 closeout).

```bash
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "docs(stage-2-8cd): light README/ROADMAP/SECURITY/PRIVACY/AGENT/CHANGELOG"
```

---

# ═══════════════════════════════════════════════════════════════════════════
# Final verification + PR + release
# ═══════════════════════════════════════════════════════════════════════════

## Task Z1: Full umbrella gate

```bash
source ~/.cargo/env

# Node
npm test
npm run format:check
npm audit --audit-level=high
node tools/privacy-audit.mjs

# Rust (Xvfb mandatory)
cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml
cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
SIMURGH_REQUIRE_XVFB_TESTS=1 cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml

# Lifecycle scripts (local — --check / --dry-run only)
bash tools/simurgh-daemon-linux/scripts/install-user-unit.sh --check
bash tools/simurgh-daemon-linux/scripts/install-user-unit.sh --dry-run
bash tools/simurgh-daemon-linux/scripts/uninstall-user-unit.sh --check
bash tools/simurgh-daemon-linux/scripts/check-user-unit.sh || true
bash tools/simurgh-daemon-linux/scripts/doctor-user-unit.sh

# shellcheck
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck tools/simurgh-daemon-linux/scripts/*.sh
fi

# Regression + new gates
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh
bash scripts/security-audit-stage-2-6-2-7-closeout.sh
bash scripts/smoke-stage-2-8a-2-8b-linux-foundation-x11.sh
bash scripts/security-audit-stage-2-8a-2-8b-linux.sh
bash scripts/smoke-stage-2-8c-8d-linux-wayland-systemd-ci.sh
bash scripts/security-audit-stage-2-8c-8d-linux-wayland-systemd-ci.sh

# Umbrella
bash scripts/check.sh
```

Every gate must be green.

## Task Z2: Push + PR + release

```bash
git push -u origin stage-2-8c-8d-linux-wayland-systemd-ci

gh pr create --title "Stage 2.8C/D: Linux Wayland + XWayland + systemd + Ubuntu CI (PR #21+22 combined)" --body "$(cat <<'EOF'
## Summary

Combined PR #21 + PR #22 — ships the remainder of Stage 2.8 (Wayland portal probing, XWayland partial coverage, browser packaging UX hint, live display_server_mismatch enforcement, systemd --user lifecycle, Ubuntu CI Rust + Xvfb mandatory, shellcheck) in one reviewer-grade body of work.

- Phase A: live display_server_mismatch enforcement closes the v0.4.15 P0 follow-up.
- Phase B: Wayland portal advertised vs active with no consent triggered (zbus probe of org.freedesktop.portal.ScreenCast.AvailableSourceTypes).
- Phase C: XWayland partial coverage detection + counting (coverage=xwayland_partial).
- Phase D: browser_package_hint UX-only — server and proof validator never trust it.
- Phase E: systemd --user unit + 4 lifecycle scripts (install/uninstall/check/doctor) with --check + --dry-run, no sudo, no eval, no curl|sh.
- Phase F: Ubuntu CI Rust toolchain + apt deps + shellcheck + SIMURGH_REQUIRE_XVFB_TESTS=1.
- Phase G: combined smoke (16 scenarios).
- Phase H: combined cybersecurity audit (16 dimensions).
- Phase I: evidence-rules README.
- Phase J: light README/ROADMAP/SECURITY/PRIVACY/AGENT/CHANGELOG.

## Test plan

(filled out at PR time after all gates run green)

## Non-claims

Research prototype only. No production Linux endpoint deployment, no distro packaging, no system-wide service, no MDM, no hardware attestation, no kernel-level visibility, no universal Wayland enumeration, no GPU overlay detection, no automatic misconduct detection.
EOF
)"

gh pr checks <PR-number> --watch
```

After CI green + your merge approval:

```bash
git checkout main && git pull --ff-only
git tag v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci
git push origin v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci
gh release create v0.4.16-stage-2-8C-8D-linux-wayland-systemd-ci \
  --title "Stage 2.8C/D — Linux Wayland + XWayland + systemd + Ubuntu CI" \
  --notes "..."
```

---

## Self-Review (post-write, pre-handoff)

**Spec coverage** (§ references to design spec):
- §6.1 Sandboxed-browser loopback — Phase D.
- §6.2 Portal advertised vs portal active — Phase B (no consent triggered).
- §6.3 Display-server lock — Phase A (live wiring), spec §6.3 hard rule satisfied.
- §6.4 Non-local `$DISPLAY` refusal — already PR #20; XWayland scanner inherits via `is_local_display`.
- §6.5 systemd `--user` unit — Phase E.
- §6.6 Ubuntu CI + Rust toolchain — Phase F.
- §6.7 Headless fixture — already PR #19/#20; preserved.
- §6.8 Pairing + events — already PR #19; preserved (display_server_mismatch now emitted from live path in Phase A).
- §6.10 Platform-specific scanner validators — already PR #19; preserved.
- §7.1 Linux daemon proof payload — extended (wayland + xwayland scanner outputs flow through).
- §7.3 Linux device_integrity — already PR #20; preserved.
- §7.4 Risk policy — already PR #20; preserved (Wayland/XWayland=Warning, never Critical).
- §11 Cybersecurity audit gate — Phase H.
- §12 Real Linux validation matrix — Phase I evidence README; full matrix is PR #23.

**Placeholder scan:** Two phase descriptions reference the prior plan ("verbatim from PR #22 plan Task N") — these are deliberate to keep this combined plan readable, but executing agents MUST inline the actual content. Specifically: Phase E1/E2/E3 (systemd files), Phase F3 (CI workflow assertion test), Phase I1 (evidence README), and the Phase G/H smoke/audit templates draw heavily from the standalone PR #22 plan and the Stage 2.8A/B smoke at `tests/e2e/stage28ab_linux_foundation_x11_smoke.mjs`. The executing agent should READ those files and adapt rather than re-deriving from scratch.

**Type consistency:**
- Field names: `display_server`, `coverage`, `portal_advertised`, `portal_active`, `scanner_reason`, `x11_*_count`, `xwayland_window_count` — consistent across phases.
- Env var: `SIMURGH_REQUIRE_XVFB_TESTS` — same spelling in Phase F1/F2/F3, G, H.
- Unit filename: `simurgh-daemon-linux.service` — consistent.
- Scanner state enums: `wayland_portal_available`, `wayland_compositor_restricted`, `wayland_compositor_unsupported`, `xwayland_detected` — all already in `LINUX_SCANNER_STATES` (PR #19).
- Scanner reason enum: `portal_active_probe_unavailable`, `portal_not_active`, `non_local_display`, `no_display_server`, `sandboxed_browser_loopback_possible` — all already in `LINUX_SCANNER_REASONS` (PR #19).

**Risks:**
1. **Phase A live wiring** is the highest-risk change — it edits the production telemetry path. The red test is comprehensive (real server boot + 2-proof sequence). If any existing macOS/Windows test breaks, the lock observe branch is too aggressive — gate it strictly on `platform === "linux"`.
2. **Phase B zbus dependency** adds a meaningful build-time + binary-size cost. The `default-features = false` + `features = ["tokio"]` keeps it minimal; verify clippy stays clean.
3. **Phase D `browser_package_hint`** detection is genuinely unreliable across browsers. Default to `"unknown"` and resist the temptation to add fragile heuristics. The test ENFORCES that the server never trusts it.
4. **GHA cache hit** on first PR push will miss; CI may take ~5–8 min instead of ~1m30s. Subsequent pushes hit cache.
5. **`createDisplayServerLock` eviction on session end** — must be wired alongside existing registry eviction; otherwise lock state leaks across recycled session IDs.

**Found and fixed during review:** Two pre-existing fields (`x11` in `CurrentScan`) become misnomers in Phase C2 — flagged for rename in the same task.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-stage-2-8cd-linux-wayland-systemd-ci.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per phase (or per task within a phase), two-stage review between commits, fast iteration. Phase A is highest risk; subagents are well-suited to keeping its scope tight.

**2. Inline Execution** — execute all phases in this session using `executing-plans`, batch with checkpoints.

**Which approach?**
