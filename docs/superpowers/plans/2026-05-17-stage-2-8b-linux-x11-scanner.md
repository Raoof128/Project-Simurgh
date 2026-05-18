# Stage 2.8B — Linux X11 Scanner (PR #20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Linux daemon's hardcoded-zero scanner counts with a real X11 metadata scanner that reads EWMH properties (`_NET_CLIENT_LIST` + `query_tree` for unmanaged/override_redirect children, `_NET_WM_STATE`) via `x11rb`, returns counts only (no raw window IDs / titles / classes / process names), wires the result into **both `/status` AND the signed `/proof` payload**, extends the Node `reportBuilder` to emit Linux `device_integrity`, extends the Node risk policy to cover Linux signals, and extends the privacy-audit sweep to cover the Linux daemon paths.

**Architecture:** Add `tools/simurgh-daemon-linux/src/scanner/x11.rs` (open connection → read root `_NET_CLIENT_LIST` for managed + `query_tree(root)` for unmanaged children → query per-window properties + GetWindowAttributes → count by category) plus `scanner/privacy.rs` (pure raw-to-summary filter that guarantees no raw fields ever leave the scanner). `x11::scan()` enforces non-local `$DISPLAY` refusal as a defence-in-depth layer before calling `x11rb::connect`. Unit tests cover the privacy filter with synthetic raw data. Integration tests use a spawned `Xvfb :99` server with **real synthetic windows created via x11rb** (gated by `Xvfb` availability — local skip if missing, will become mandatory in PR #22 once Ubuntu CI lands). Node `reportBuilder.js` adds a Linux branch in `buildDeviceIntegritySection`. `scannerRiskPolicy.js` extends to map Linux signals to risk. `daemonState.js` rolls up Linux x11 counts into `*_max`. `tools/privacy-audit.mjs` extends `DEFAULT_SCAN_DIRS` to sweep the Linux daemon tree.

**Tech Stack:** Rust (`x11rb` 0.13), Xvfb for integration tests (`apt-get install xvfb x11-utils` — installed by reviewer; gracefully skipped if missing). Node ≥ 22 (matching current CI Quality Gate). Spec: `docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md` §6.10, §7.1, §7.3.

**Scope (this PR):** Real X11 scanner + privacy-audit Linux paths + reportBuilder Linux device_integrity. **Out of scope:** Wayland portal probing (PR #21), Snap/Flatpak hint detection (PR #21), systemd unit (PR #22), Ubuntu CI (PR #22), reviewer docs (PR #23).

---

## File Structure

**New files:**

- `tools/simurgh-daemon-linux/src/scanner/x11.rs` — X11 connection + EWMH property reads.
- `tools/simurgh-daemon-linux/src/scanner/privacy.rs` — `RawX11Counts` → `X11ScannerSummary` filter; the trust boundary that ensures no raw fields leak out.
- `tools/simurgh-daemon-linux/tests/x11_scanner_tests.rs` — unit tests on the privacy filter.
- `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs` — Xvfb-backed integration tests, gated.
- `tests/unit/reportBuilderLinuxDeviceShield.test.js` — Linux `device_integrity` shape tests.
- `tests/unit/privacyAuditLinux.test.js` — assert privacy-audit sweeps Linux daemon paths.

**Modified files:**

- `tools/simurgh-daemon-linux/Cargo.toml` — add `x11rb` dep.
- `tools/simurgh-daemon-linux/src/scanner/mod.rs` — export `x11` and `privacy` modules.
- `tools/simurgh-daemon-linux/src/scanner/session.rs` — no change to detection logic; later tasks compose scanner with session detector. Adds `is_local_display` re-export so `x11::scan()` can defend in depth.
- `tools/simurgh-daemon-linux/src/http.rs` — adds `/proof` POST endpoint + `/status` GET; both call shared `current_scanner_summary()` helper so signed proofs carry the real X11 counts.
- `tools/simurgh-daemon-linux/src/bin/simurgh-daemon-linux-fixture.rs` — fixture binary uses real scanner when X11 is available, falls back to zeros for fixture stability under CI.
- `src/academic/reportBuilder.js` — extend `buildDeviceIntegritySection` to emit Linux signals.
- `src/device/scannerRiskPolicy.js` — extend `mapScannerSummaryToRisk` to surface Warning context for Linux `x11_above_window_count_max > 0`, `x11_override_redirect_window_count_max > 0`, `wayland_compositor_restricted`, `xwayland_partial` (no behaviour change for macOS/Windows).
- `src/device/daemonState.js` — rollup new Linux `*_max` fields across proofs in a session.
- `tools/privacy-audit.mjs` — add `tools/simurgh-daemon-linux` (excluding `target/`) + `tests/fixtures/stage-2-8` to `DEFAULT_SCAN_DIRS`.

---

## Task 1: Red — privacy filter export missing

**Files:**

- Test: `tools/simurgh-daemon-linux/tests/x11_scanner_tests.rs`

- [ ] **Step 1: Write the failing test**

Write `tools/simurgh-daemon-linux/tests/x11_scanner_tests.rs`:

```rust
use simurgh_daemon_linux::scanner::privacy::{raw_to_summary, RawX11Counts};

#[test]
fn raw_to_summary_returns_counts_only_no_raw_fields() {
    let raw = RawX11Counts {
        managed_window_count: 3,
        override_redirect_window_count: 0,
        above_window_count: 1,
        fullscreen_window_count: 1,
        skip_taskbar_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 3,
    };
    let summary = raw_to_summary(raw);
    assert_eq!(summary.scanner_state, "healthy");
    assert_eq!(summary.scanner_reason, "none");
    assert_eq!(summary.coverage, "x11_full");
    assert_eq!(summary.x11_managed_window_count, 3);
    assert_eq!(summary.x11_above_window_count, 1);
    assert_eq!(summary.x11_fullscreen_window_count, 1);
}

#[test]
fn raw_to_summary_with_override_redirect_does_not_change_state_alone() {
    let raw = RawX11Counts {
        managed_window_count: 2,
        override_redirect_window_count: 1,
        above_window_count: 0,
        fullscreen_window_count: 0,
        skip_taskbar_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: 3,
    };
    let summary = raw_to_summary(raw);
    assert_eq!(summary.scanner_state, "healthy");
    assert_eq!(summary.x11_override_redirect_window_count, 1);
}
```

- [ ] **Step 2: Run to verify failure**

Run:

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml x11_scanner
```

Expected: FAIL — `scanner::privacy` module does not exist yet.

- [ ] **Step 3: Commit red test**

```bash
git add tools/simurgh-daemon-linux/tests/x11_scanner_tests.rs
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8b): red — X11 privacy filter module missing"
```

---

## Task 2: Green — implement `scanner/privacy.rs`

**Files:**

- Create: `tools/simurgh-daemon-linux/src/scanner/privacy.rs`
- Modify: `tools/simurgh-daemon-linux/src/scanner/mod.rs`

- [ ] **Step 1: Create `tools/simurgh-daemon-linux/src/scanner/privacy.rs`**

```rust
#[derive(Debug, Clone, Copy)]
pub struct RawX11Counts {
    pub managed_window_count: u32,
    pub override_redirect_window_count: u32,
    pub above_window_count: u32,
    pub fullscreen_window_count: u32,
    pub skip_taskbar_window_count: u32,
    pub suspicious_window_count: u32,
    pub visible_window_count: u32,
}

#[derive(Debug, Clone)]
pub struct X11ScannerSummary {
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub x11_managed_window_count: u32,
    pub x11_override_redirect_window_count: u32,
    pub x11_above_window_count: u32,
    pub x11_fullscreen_window_count: u32,
    pub x11_skip_taskbar_window_count: u32,
    pub suspicious_window_count: u32,
    pub visible_window_count: u32,
}

pub fn raw_to_summary(raw: RawX11Counts) -> X11ScannerSummary {
    // Privacy boundary: only counts cross this function. No raw window IDs,
    // titles, classes, or process names exist on this side of the API.
    X11ScannerSummary {
        scanner_state: "healthy",
        scanner_reason: "none",
        coverage: "x11_full",
        x11_managed_window_count: raw.managed_window_count,
        x11_override_redirect_window_count: raw.override_redirect_window_count,
        x11_above_window_count: raw.above_window_count,
        x11_fullscreen_window_count: raw.fullscreen_window_count,
        x11_skip_taskbar_window_count: raw.skip_taskbar_window_count,
        suspicious_window_count: raw.suspicious_window_count,
        visible_window_count: raw.visible_window_count,
    }
}

pub fn scanner_unavailable(reason: &'static str) -> X11ScannerSummary {
    X11ScannerSummary {
        scanner_state: "scanner_unavailable",
        scanner_reason: reason,
        coverage: "unknown",
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

- [ ] **Step 2: Update `tools/simurgh-daemon-linux/src/scanner/mod.rs`**

```rust
pub mod privacy;
pub mod session;
```

- [ ] **Step 3: Run tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml x11_scanner
```

Expected: 2/2 PASS.

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): X11 scanner privacy filter (counts-only output)"
```

---

## Task 3: Add `x11rb` dependency + scanner skeleton

**Files:**

- Modify: `tools/simurgh-daemon-linux/Cargo.toml`
- Create: `tools/simurgh-daemon-linux/src/scanner/x11.rs`
- Modify: `tools/simurgh-daemon-linux/src/scanner/mod.rs`

- [ ] **Step 1: Add `x11rb` to `[dependencies]` in `Cargo.toml`**

```toml
x11rb = { version = "0.13", default-features = false, features = ["allow-unsafe-code"] }
```

(`allow-unsafe-code` is a misnamed feature in x11rb that unlocks the standard transport — it does NOT enable arbitrary unsafe in our code.)

- [ ] **Step 2: Create `tools/simurgh-daemon-linux/src/scanner/x11.rs`**

```rust
use crate::scanner::privacy::{raw_to_summary, scanner_unavailable, RawX11Counts, X11ScannerSummary};
use crate::scanner::session::is_local_display;

/// High-level entry point: open an X11 connection from $DISPLAY, run the scan,
/// return a privacy-filtered summary. Errors return scanner_unavailable with a
/// stable reason code — they MUST NOT propagate connection details to callers.
///
/// Defence-in-depth: refuses non-local $DISPLAY before connecting. The session
/// detector also enforces this in /status, but the scanner enforces it again
/// so any direct caller of `scan()` cannot bypass the privacy boundary.
pub fn scan() -> X11ScannerSummary {
    let display = std::env::var("DISPLAY").unwrap_or_default();
    if !is_local_display(&display) {
        return scanner_unavailable("non_local_display");
    }
    match scan_inner() {
        Ok(raw) => raw_to_summary(raw),
        Err(reason) => scanner_unavailable(reason),
    }
}

fn scan_inner() -> Result<RawX11Counts, &'static str> {
    let (conn, screen_num) = x11rb::connect(None).map_err(|_| "scanner_unavailable")?;
    let setup = conn.setup();
    let screen = setup.roots.get(screen_num).ok_or("scanner_unavailable")?;
    let root = screen.root;
    scan_with_connection(&conn, root)
}

pub(crate) fn scan_with_connection<C: x11rb::connection::Connection>(
    conn: &C,
    root: x11rb::protocol::xproto::Window,
) -> Result<RawX11Counts, &'static str> {
    use x11rb::protocol::xproto::{AtomEnum, ConnectionExt};

    // Intern the EWMH atoms we need. Names from the EWMH spec.
    let atoms = InternedAtoms::intern(conn)?;

    // (a) Managed top-level windows from _NET_CLIENT_LIST.
    let client_list_cookie = conn
        .get_property(false, root, atoms.net_client_list, AtomEnum::WINDOW, 0, u32::MAX)
        .map_err(|_| "scanner_unavailable")?;
    let client_list_reply = client_list_cookie.reply().map_err(|_| "scanner_unavailable")?;
    let managed: Vec<u32> = client_list_reply
        .value32()
        .map(|iter| iter.collect())
        .unwrap_or_default();

    // (b) ALL root children via query_tree. Needed because override_redirect
    // windows (e.g. tooltips, menus, overlays used for cheating attempts) are
    // typically NOT listed in _NET_CLIENT_LIST. The X11 spec puts unmanaged
    // top-levels under the root window's children, not in the WM client list.
    let tree_reply = conn
        .query_tree(root)
        .map_err(|_| "scanner_unavailable")?
        .reply()
        .map_err(|_| "scanner_unavailable")?;
    let root_children: Vec<u32> = tree_reply.children.into_iter().collect();

    let mut above = 0u32;
    let mut fullscreen = 0u32;
    let mut skip_taskbar = 0u32;
    let mut override_redirect = 0u32;

    // Per-window _NET_WM_STATE on managed windows (state hints only meaningful
    // when the WM is in the loop — overrides skip state-hint enumeration).
    for win in &managed {
        if let Ok(reply) = conn
            .get_property(false, *win, atoms.net_wm_state, AtomEnum::ATOM, 0, u32::MAX)
            .and_then(|c| Ok(c.reply().ok()))
        {
            if let Some(reply) = reply {
                if let Some(atoms_iter) = reply.value32() {
                    for atom in atoms_iter {
                        if atom == atoms.net_wm_state_above {
                            above += 1;
                        }
                        if atom == atoms.net_wm_state_fullscreen {
                            fullscreen += 1;
                        }
                        if atom == atoms.net_wm_state_skip_taskbar {
                            skip_taskbar += 1;
                        }
                    }
                }
            }
        }
    }

    // override_redirect must be counted across ALL root children, not just the
    // managed set — that's where overlays hide. Skip the root window itself.
    for win in &root_children {
        if *win == root {
            continue;
        }
        if let Ok(attrs) = conn.get_window_attributes(*win).and_then(|c| Ok(c.reply().ok())) {
            if let Some(attrs) = attrs {
                if attrs.override_redirect {
                    override_redirect += 1;
                }
            }
        }
    }

    // visible_window_count policy: managed + override_redirect. Documented so
    // future readers know the math behind the number.
    let managed_count = managed.len() as u32;
    let visible_count = managed_count + override_redirect;
    Ok(RawX11Counts {
        managed_window_count: managed_count,
        override_redirect_window_count: override_redirect,
        above_window_count: above,
        fullscreen_window_count: fullscreen,
        skip_taskbar_window_count: skip_taskbar,
        suspicious_window_count: 0,
        visible_window_count: visible_count,
    })
}

struct InternedAtoms {
    net_client_list: u32,
    net_wm_state: u32,
    net_wm_state_above: u32,
    net_wm_state_fullscreen: u32,
    net_wm_state_skip_taskbar: u32,
}

impl InternedAtoms {
    fn intern<C: x11rb::connection::Connection>(conn: &C) -> Result<Self, &'static str> {
        use x11rb::protocol::xproto::ConnectionExt;
        fn intern<C: x11rb::connection::Connection>(
            conn: &C,
            name: &[u8],
        ) -> Result<u32, &'static str> {
            conn.intern_atom(false, name)
                .map_err(|_| "scanner_unavailable")?
                .reply()
                .map(|r| r.atom)
                .map_err(|_| "scanner_unavailable")
        }
        Ok(Self {
            net_client_list: intern(conn, b"_NET_CLIENT_LIST")?,
            net_wm_state: intern(conn, b"_NET_WM_STATE")?,
            net_wm_state_above: intern(conn, b"_NET_WM_STATE_ABOVE")?,
            net_wm_state_fullscreen: intern(conn, b"_NET_WM_STATE_FULLSCREEN")?,
            net_wm_state_skip_taskbar: intern(conn, b"_NET_WM_STATE_SKIP_TASKBAR")?,
        })
    }
}
```

- [ ] **Step 3: Update `tools/simurgh-daemon-linux/src/scanner/mod.rs`**

```rust
pub mod privacy;
pub mod session;
pub mod x11;
```

- [ ] **Step 4: Build (no tests yet for connection logic — Task 5 adds Xvfb tests)**

```bash
source ~/.cargo/env && cargo build --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: build succeeds. May take a few minutes on first build to fetch `x11rb`.

If `x11rb` 0.13 API differs (the API has been stable but check), adjust property-read calls to compile. Document any deviation in the report.

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): X11 scanner skeleton reading _NET_CLIENT_LIST + EWMH state"
```

---

## Task 4: Verify privacy filter unit tests still pass + run clippy

**Files:**

- Verify-only.

- [ ] **Step 1: Run tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: 15 prior + 2 new (privacy filter) = 17 PASS. The `scan_with_connection` function has no unit tests yet — that's Task 5 (Xvfb).

- [ ] **Step 2: Run clippy**

```bash
source ~/.cargo/env && cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
```

Expected: clean. If clippy complains about unused `screen` variable or similar, fix inline and re-run.

- [ ] **Step 3: Commit (only if clippy required changes)**

```bash
git status
# If clean, skip. Otherwise:
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -am "chore(stage-2-8b): clippy clean"
```

---

## Task 5: Xvfb integration test (gracefully skipped if Xvfb missing)

**Files:**

- Create: `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs`

- [ ] **Step 1: Check Xvfb availability**

```bash
which Xvfb || echo "MISSING"
```

If missing, install with `sudo apt-get install -y xvfb x11-utils xterm` (reviewer note: this is local — Ubuntu CI will install in PR #22). If you cannot install, write the test anyway with the skip guard described below; it will simply pass-as-skipped.

- [ ] **Step 2: Write the integration test**

Write `tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs`:

```rust
use simurgh_daemon_linux::scanner::x11::{scan, scan_with_connection};
use std::process::{Child, Command, Stdio};
use std::sync::OnceLock;
use std::time::Duration;
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{
    AtomEnum, ChangeWindowAttributesAux, ConnectionExt, CreateWindowAux, EventMask,
    PropMode, WindowClass,
};

fn xvfb_available() -> bool {
    Command::new("which")
        .arg("Xvfb")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

struct XvfbGuard {
    child: Child,
}
impl Drop for XvfbGuard {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn start_xvfb(display_num: u32) -> Option<XvfbGuard> {
    if !xvfb_available() {
        return None;
    }
    let display = format!(":{display_num}");
    let child = Command::new("Xvfb")
        .args([&display, "-screen", "0", "1024x768x24", "-nolisten", "tcp"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;
    std::thread::sleep(Duration::from_millis(500));
    Some(XvfbGuard { child })
}

static DISPLAY_LOCK: OnceLock<std::sync::Mutex<()>> = OnceLock::new();

#[test]
fn scan_returns_summary_against_empty_xvfb_root() {
    if !xvfb_available() {
        eprintln!("Xvfb not installed; skipping (PR #22 Ubuntu CI will enforce)");
        return;
    }
    let _guard_lock = DISPLAY_LOCK.get_or_init(|| std::sync::Mutex::new(())).lock().unwrap();
    let _xvfb = start_xvfb(99).expect("Xvfb spawn");
    std::env::set_var("DISPLAY", ":99");
    let summary = scan();
    assert_eq!(summary.x11_managed_window_count, 0);
    assert_eq!(summary.scanner_state, "healthy");
    assert_eq!(summary.scanner_reason, "none");
}

#[test]
fn scan_returns_scanner_unavailable_when_display_invalid() {
    let _guard_lock = DISPLAY_LOCK.get_or_init(|| std::sync::Mutex::new(())).lock().unwrap();
    std::env::set_var("DISPLAY", ":invalid-display");
    let summary = scan();
    assert_eq!(summary.scanner_state, "scanner_unavailable");
}

#[test]
fn scan_counts_managed_above_and_fullscreen_windows() {
    if !xvfb_available() {
        eprintln!("Xvfb not installed; skipping");
        return;
    }
    let _guard_lock = DISPLAY_LOCK.get_or_init(|| std::sync::Mutex::new(())).lock().unwrap();
    let _xvfb = start_xvfb(100).expect("Xvfb spawn");
    std::env::set_var("DISPLAY", ":100");

    let (conn, screen_num) = x11rb::connect(None).expect("connect");
    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    // Intern atoms we'll need to set on root + on the test windows.
    let net_client_list = conn.intern_atom(false, b"_NET_CLIENT_LIST").unwrap().reply().unwrap().atom;
    let net_wm_state = conn.intern_atom(false, b"_NET_WM_STATE").unwrap().reply().unwrap().atom;
    let net_wm_state_above = conn.intern_atom(false, b"_NET_WM_STATE_ABOVE").unwrap().reply().unwrap().atom;
    let net_wm_state_fullscreen = conn.intern_atom(false, b"_NET_WM_STATE_FULLSCREEN").unwrap().reply().unwrap().atom;

    // Create two managed top-level windows.
    let win1 = conn.generate_id().unwrap();
    let win2 = conn.generate_id().unwrap();
    for w in [win1, win2] {
        conn.create_window(
            x11rb::COPY_DEPTH_FROM_PARENT, w, root, 0, 0, 100, 100, 0,
            WindowClass::INPUT_OUTPUT, x11rb::COPY_FROM_PARENT,
            &CreateWindowAux::new().event_mask(EventMask::EXPOSURE),
        ).unwrap();
    }
    // Mark win1 _NET_WM_STATE_ABOVE; mark win2 _NET_WM_STATE_FULLSCREEN.
    conn.change_property32(PropMode::REPLACE, win1, net_wm_state, AtomEnum::ATOM, &[net_wm_state_above]).unwrap();
    conn.change_property32(PropMode::REPLACE, win2, net_wm_state, AtomEnum::ATOM, &[net_wm_state_fullscreen]).unwrap();
    // Populate root's _NET_CLIENT_LIST with both managed windows.
    conn.change_property32(PropMode::REPLACE, root, net_client_list, AtomEnum::WINDOW, &[win1, win2]).unwrap();
    conn.flush().unwrap();

    // Drive the scanner directly against our prepared connection + root.
    let raw = scan_with_connection(&conn, root).expect("scan_with_connection");
    assert_eq!(raw.managed_window_count, 2);
    assert_eq!(raw.above_window_count, 1);
    assert_eq!(raw.fullscreen_window_count, 1);
}

#[test]
fn scan_counts_override_redirect_root_children() {
    if !xvfb_available() {
        eprintln!("Xvfb not installed; skipping");
        return;
    }
    let _guard_lock = DISPLAY_LOCK.get_or_init(|| std::sync::Mutex::new(())).lock().unwrap();
    let _xvfb = start_xvfb(101).expect("Xvfb spawn");
    std::env::set_var("DISPLAY", ":101");

    let (conn, screen_num) = x11rb::connect(None).expect("connect");
    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    // Create an override_redirect window as a direct root child (the kind
    // _NET_CLIENT_LIST does NOT include — overlays, tooltips, exam-cheat surfaces).
    let overlay = conn.generate_id().unwrap();
    conn.create_window(
        x11rb::COPY_DEPTH_FROM_PARENT, overlay, root, 0, 0, 80, 80, 0,
        WindowClass::INPUT_OUTPUT, x11rb::COPY_FROM_PARENT,
        &CreateWindowAux::new().override_redirect(1).event_mask(EventMask::EXPOSURE),
    ).unwrap();
    conn.flush().unwrap();

    let raw = scan_with_connection(&conn, root).expect("scan_with_connection");
    assert!(raw.override_redirect_window_count >= 1,
        "expected >=1 override_redirect window, got {}", raw.override_redirect_window_count);
}
```

NOTE: this test imports `scan_with_connection` which is `pub(crate)` in Task 3. Promote it to `pub` (still inside the `x11` module) so integration tests can drive the scanner against a hand-prepared connection deterministically.

- [ ] **Step 3: Run tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml --test xvfb_integration_tests
```

Expected:

- Xvfb installed: 4/4 PASS.
- Xvfb missing: tests 1, 3, 4 print "skipping" and return ok; test 2 PASSes (invalid display → scanner_unavailable).

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8b): Xvfb integration tests for X11 scanner (gracefully skipped if missing)"
```

---

## Task 6: Wire X11 scanner into `/status` endpoint

**Files:**

- Modify: `tools/simurgh-daemon-linux/src/http.rs`

- [ ] **Step 1: Update `tools/simurgh-daemon-linux/src/http.rs`**

After the existing `use crate::scanner::session::...` line add:

```rust
use crate::scanner::x11;
```

Update the `status` async handler so that when `display_server == "x11"` AND scanner is meant to run (i.e., `scanner_reason == "none"` per the detector), the X11 scanner runs and overlays its counts onto the response:

```rust
async fn status() -> Json<serde_json::Value> {
    let det = detect(&SessionEnv::from_process_env());
    let scanner = if det.display_server == "x11" && det.scanner_reason == "none" {
        Some(x11::scan())
    } else {
        None
    };
    let mut body = serde_json::json!({
        "platform": DAEMON_PLATFORM,
        "daemon_version": DAEMON_VERSION,
        "scanner_version": SCANNER_VERSION,
        "display_server": det.display_server,
        "scanner_state": scanner.as_ref().map(|s| s.scanner_state).unwrap_or(det.scanner_state),
        "scanner_reason": scanner.as_ref().map(|s| s.scanner_reason).unwrap_or(det.scanner_reason),
        "coverage": scanner.as_ref().map(|s| s.coverage).unwrap_or(det.coverage),
        "privacy_mode": "metadata_only",
    });
    if let Some(s) = scanner {
        let obj = body.as_object_mut().unwrap();
        obj.insert("x11_managed_window_count".into(), s.x11_managed_window_count.into());
        obj.insert(
            "x11_override_redirect_window_count".into(),
            s.x11_override_redirect_window_count.into(),
        );
        obj.insert("x11_above_window_count".into(), s.x11_above_window_count.into());
        obj.insert("x11_fullscreen_window_count".into(), s.x11_fullscreen_window_count.into());
        obj.insert("x11_skip_taskbar_window_count".into(), s.x11_skip_taskbar_window_count.into());
        obj.insert("suspicious_window_count".into(), s.suspicious_window_count.into());
        obj.insert("visible_window_count".into(), s.visible_window_count.into());
    }
    Json(body)
}
```

Remove the `StatusResponse` struct (no longer used). Keep `HealthResponse`.

- [ ] **Step 2: Update existing headless test for /status (Task 16 from PR #19) — it should still pass because in headless mode `display_server == "headless"`, so the scanner block is skipped and the body shape stays the same.**

Verify by running:

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml status_endpoint_returns_scanner_unavailable_when_headless
```

Expected: PASS unchanged.

- [ ] **Step 3: Run all daemon tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: all PASS (Xvfb-dependent ones may skip).

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): /status endpoint runs X11 scanner when display=x11"
```

---

## Task 6.5: Wire X11 scanner summary into POST /proof (the trusted payload)

**Files:**

- Modify: `tools/simurgh-daemon-linux/src/http.rs` — add `current_scanner_summary()` shared helper + POST `/proof` route.
- Modify: `tools/simurgh-daemon-linux/src/proof.rs` — `ProofInputs` already carries the count fields; nothing structural to change.
- Create: `tools/simurgh-daemon-linux/tests/proof_endpoint_tests.rs` — Rust integration test asserting POST /proof returns a signed payload whose x11 counts come from the scanner.
- Create: `tests/unit/daemonProofLinuxXcountsRollup.test.js` — Node test asserting Linux proofs with x11 counts roll up into report `x11_*_count_max`.

This is the most important task in PR #20 — without it, the live daemon would only expose scanner data via `/status` (UX-only) while signing proofs with stale defaults. The signed payload is the trust boundary.

- [ ] **Step 1: Refactor `tools/simurgh-daemon-linux/src/http.rs` to extract `current_scanner_summary`**

Add module-private helper:

```rust
use crate::scanner::privacy::X11ScannerSummary;
use crate::scanner::session::{detect, SessionDetection, SessionEnv};
use crate::scanner::x11;

pub(crate) struct CurrentScan {
    pub detection: SessionDetection,
    pub x11: Option<X11ScannerSummary>,
}

pub(crate) fn current_scanner_summary() -> CurrentScan {
    let det = detect(&SessionEnv::from_process_env());
    let x11 = if det.display_server == "x11" && det.scanner_reason == "none" {
        Some(x11::scan())
    } else {
        None
    };
    CurrentScan { detection: det, x11 }
}
```

Update `status()` to use this helper (replaces the inline scanner call from Task 6). The /status JSON body shape stays the same.

- [ ] **Step 2: Add POST /proof handler**

The browser SDK calls this endpoint with a challenge from the Node server. The daemon builds a signed proof using its identity + current scanner output.

Add to `http.rs`:

```rust
use axum::{extract::Json, routing::post};
use serde::Deserialize;

use crate::identity::{load_or_create_identity, IdentityPaths};
use crate::proof::{build_proof, ProofInputs};

#[derive(Deserialize)]
pub struct ProofRequest {
    pub session_id: String,
    pub exam_id: String,
    pub sequence: u64,
    pub challenge: String,
}

async fn proof(Json(req): Json<ProofRequest>) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let identity = load_or_create_identity(&IdentityPaths::from_xdg())
        .map_err(|_| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "identity_unavailable".into()))?;
    let scan = current_scanner_summary();
    let display_server: &'static str = match scan.detection.display_server {
        "x11" => "x11",
        "wayland" => "wayland",
        "xwayland" => "xwayland",
        "headless" => "headless",
        _ => "unknown",
    };
    let (scanner_state, scanner_reason, coverage, counts, visible) = match &scan.x11 {
        Some(s) => (
            s.scanner_state,
            s.scanner_reason,
            s.coverage,
            [
                s.x11_managed_window_count,
                s.x11_override_redirect_window_count,
                s.x11_above_window_count,
                s.x11_fullscreen_window_count,
                s.x11_skip_taskbar_window_count,
            ],
            s.visible_window_count,
        ),
        None => (
            scan.detection.scanner_state,
            scan.detection.scanner_reason,
            scan.detection.coverage,
            [0, 0, 0, 0, 0],
            0,
        ),
    };
    let timestamp = chrono_like_iso8601_utc_now();
    let inputs = ProofInputs {
        session_id: req.session_id,
        exam_id: req.exam_id,
        sequence: req.sequence,
        timestamp,
        challenge: req.challenge,
        display_server,
        scanner_state,
        scanner_reason,
        coverage,
        portal_advertised: None,
        portal_active: None,
        x11_counts: counts,
        xwayland_window_count: 0,
        suspicious_window_count: 0,
        visible_window_count: visible,
    };
    Ok(Json(build_proof(&identity, &inputs)))
}

// Minimal ISO-8601 UTC timestamp without pulling chrono (keep dep surface small).
fn chrono_like_iso8601_utc_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = d.as_secs();
    let millis = d.subsec_millis();
    let days = (secs / 86_400) as i64;
    let secs_of_day = secs % 86_400;
    let h = secs_of_day / 3600;
    let m = (secs_of_day % 3600) / 60;
    let s = secs_of_day % 60;
    let (y, mo, da) = days_to_ymd(days + 719_468); // 1970-01-01 in days_to_ymd's epoch
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z", y, mo, da, h, m, s, millis)
}

// Howard Hinnant's civil-from-days algorithm — compact, correct, no deps.
fn days_to_ymd(z: i64) -> (i32, u32, u32) {
    let z = z - 60; // adjust epoch to civil 0000-03-01
    let era = if z >= 0 { z / 146_097 } else { (z - 146_096) / 146_097 };
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y as i32, m as u32, d as u32)
}
```

Add the route in `router()`:

```rust
.route("/proof", post(proof))
```

- [ ] **Step 3: Rust integration test for /proof endpoint**

Write `tools/simurgh-daemon-linux/tests/proof_endpoint_tests.rs`:

```rust
use axum::body::Body;
use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use simurgh_daemon_linux::http::router;
use tower::ServiceExt;

#[tokio::test]
async fn post_proof_returns_signed_payload_with_required_linux_fields() {
    // Force a deterministic identity dir for the test process.
    let tmp = tempfile::tempdir().unwrap();
    std::env::set_var("XDG_STATE_HOME", tmp.path());

    let app = router();
    let body = serde_json::json!({
        "session_id": "sess_proof_test",
        "exam_id": "exam_proof_test",
        "sequence": 1,
        "challenge": "Y2hhbGxlbmdl"
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/proof")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    let proof: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(proof["type"], "simurgh.daemon.proof");
    assert_eq!(proof["platform"], "linux");
    assert_eq!(proof["scanner_version"], "2.8.0");
    assert!(proof["signature"].is_string());
    assert!(proof["node_id_hash"].is_string());
    // Required Linux fields must all be present (headless env still emits them).
    for key in [
        "display_server", "scanner_state", "scanner_reason", "coverage",
        "x11_managed_window_count", "x11_override_redirect_window_count",
        "x11_above_window_count", "x11_fullscreen_window_count",
        "x11_skip_taskbar_window_count", "xwayland_window_count",
    ] {
        assert!(proof.get(key).is_some(), "missing {key} in proof");
    }
}
```

- [ ] **Step 4: Node test — Linux x11 counts roll up into report max**

This requires Linux rollup in `src/device/daemonState.js`. Check first whether `daemonState` already aggregates Linux fields; if not, add to the existing rollup logic the new fields:

- `x11_managed_window_count_max`
- `x11_override_redirect_window_count_max`
- `x11_above_window_count_max`
- `x11_fullscreen_window_count_max`
- `x11_skip_taskbar_window_count_max`
- `xwayland_window_count_max`

Then write `tests/unit/daemonProofLinuxXcountsRollup.test.js`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";

// Read existing daemonState aggregator API and exercise it with Linux proofs.
// Assertion: after three proofs with managed=2, managed=5, managed=4 in the same
// session, the rolled-up state has x11_managed_window_count_max === 5.

import { createDaemonState } from "../../src/device/daemonState.js";

function linuxProof(seq, x11_managed) {
  return {
    platform: "linux",
    sequence: seq,
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scanner_reason: "none",
    display_server: "x11",
    coverage: "x11_full",
    x11_managed_window_count: x11_managed,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    visible_window_count: x11_managed,
  };
}

test("Linux x11_managed rolls up to max across proofs", () => {
  const state = createDaemonState();
  state.observe("sess_a", linuxProof(1, 2));
  state.observe("sess_a", linuxProof(2, 5));
  state.observe("sess_a", linuxProof(3, 4));
  const summary = state.summary("sess_a");
  assert.equal(summary.x11_managed_window_count_max, 5);
});
```

NOTE: the exact `createDaemonState` / `observe` / `summary` API surface in `daemonState.js` may differ from this sketch — read the file first and adapt the test to the actual factory shape. The invariant is: max of x11_managed across proofs in a session is reported.

- [ ] **Step 5: Build + run tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml --test proof_endpoint_tests
node --test tests/unit/daemonProofLinuxXcountsRollup.test.js
npm test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/simurgh-daemon-linux/ src/device/daemonState.js tests/unit/daemonProofLinuxXcountsRollup.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): wire X11 scanner into signed /proof + Linux count rollup"
```

---

## Task 7: Update fixture binary to use real scanner when X11 is available

**Files:**

- Modify: `tools/simurgh-daemon-linux/src/bin/simurgh-daemon-linux-fixture.rs`

- [ ] **Step 1: Update the fixture binary**

Replace the hardcoded `x11_counts: [3, 0, 0, 0, 0]` line in `tools/simurgh-daemon-linux/src/bin/simurgh-daemon-linux-fixture.rs` with code that uses the real scanner when `display_server` from the detector is `"x11"` AND the scanner returns `"healthy"`, otherwise keeps the documented fixture defaults (so the existing `tests/unit/daemonProofLinuxEndToEnd.test.js` continues to pass in headless CI):

```rust
use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};
use simurgh_daemon_linux::scanner::x11;
```

In `main()`, before constructing `inputs`:

```rust
let det = detect(&SessionEnv::from_process_env());
let scanned = if det.display_server == "x11" && det.scanner_reason == "none" {
    Some(x11::scan())
} else {
    None
};
let x11_counts = match &scanned {
    Some(s) if s.scanner_state == "healthy" => [
        s.x11_managed_window_count,
        s.x11_override_redirect_window_count,
        s.x11_above_window_count,
        s.x11_fullscreen_window_count,
        s.x11_skip_taskbar_window_count,
    ],
    _ => [3, 0, 0, 0, 0],
};
let visible_window_count = match &scanned {
    Some(s) if s.scanner_state == "healthy" => s.visible_window_count,
    _ => 3,
};
```

Then use `x11_counts` and `visible_window_count` in `ProofInputs`.

- [ ] **Step 2: Regenerate the fixture (only if you have X11 — otherwise leave the committed fixture alone)**

```bash
source ~/.cargo/env && \
cargo run --manifest-path tools/simurgh-daemon-linux/Cargo.toml --bin simurgh-daemon-linux-fixture > /tmp/preview.json 2>/dev/null && \
diff -q tests/fixtures/stage-2-8/linux-proof.json /tmp/preview.json
```

If the diff is non-empty in a way that breaks the existing test (e.g., the `node_id_hash` differs because the temp identity is fresh each run), revert by NOT regenerating — the fixture from PR #19 stays valid because the headless branch preserves the original `[3, 0, 0, 0, 0]` defaults.

(The fixture's signature changes every run because identity is fresh; we keep PR #19's committed fixture for reproducibility. Re-generation is reviewer-discretion only.)

- [ ] **Step 3: Run the cross-language bridge test**

```bash
node --test tests/unit/daemonProofLinuxEndToEnd.test.js
```

Expected: PASS — the committed fixture's signature still verifies because the fixture file itself is unchanged.

- [ ] **Step 4: Commit**

```bash
git add tools/simurgh-daemon-linux/
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): fixture binary uses real X11 scanner when available"
```

---

## Task 8: Red — `reportBuilder` does not emit Linux device_integrity signals

**Files:**

- Create: `tests/unit/reportBuilderLinuxDeviceShield.test.js`

- [ ] **Step 1: Write the failing test**

Write `tests/unit/reportBuilderLinuxDeviceShield.test.js`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import { buildReport } from "../../src/academic/reportBuilder.js";

function baseSession() {
  return {
    sessionId: "sess_linux_report",
    examId: "exam_linux_report",
    studentIdHash: "sha256:" + "a".repeat(64),
    state: "submitted",
    events: [],
    riskLevel: "Safe",
    summary: "no anomalies",
    helperConnected: true,
    daemon: {
      platform: "linux",
      daemon_state: "healthy",
      scanner_state: "healthy",
      scanner_version: "2.8.0",
      daemon_version: "2.8.0",
      proofs_verified: 5,
      proofs_rejected: 0,
      display_server: "x11",
      display_server_locked: true,
      coverage: "x11_full",
      portal_advertised: null,
      portal_active: null,
      x11_managed_window_count_max: 4,
      x11_override_redirect_window_count_max: 0,
      x11_above_window_count_max: 1,
      x11_fullscreen_window_count_max: 0,
      x11_skip_taskbar_window_count_max: 0,
      xwayland_window_count_max: 0,
    },
  };
}

test("Linux device_integrity emits display_server + coverage + portal fields", () => {
  const report = buildReport(baseSession());
  const d = report.device_integrity;
  assert.equal(d.daemon_platform, "linux");
  assert.equal(d.display_server, "x11");
  assert.equal(d.display_server_locked, true);
  assert.equal(d.coverage, "x11_full");
  assert.equal(d.portal_advertised, null);
  assert.equal(d.portal_active, null);
  assert.equal(d.x11_managed_window_count_max, 4);
  assert.equal(d.x11_above_window_count_max, 1);
  assert.equal(d.manual_review_recommendation, "No device-integrity anomaly detected.");
});

test("Linux device_integrity rolls up Warning when coverage is wayland_limited", () => {
  const session = baseSession();
  session.daemon.display_server = "wayland";
  session.daemon.coverage = "wayland_limited";
  session.daemon.scanner_state = "wayland_compositor_restricted";
  const d = buildReport(session).device_integrity;
  assert.equal(d.display_server, "wayland");
  assert.equal(d.coverage, "wayland_limited");
  // Wayland limited coverage is Warning context — not safe-clear, not misconduct.
  assert.equal(
    d.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("Linux device_integrity does not include macOS/Windows-only count fields when platform=linux", () => {
  const d = buildReport(baseSession()).device_integrity;
  // The macOS/Windows shape used capture_excluded/capture_restricted/monitor_only.
  // Linux reports MUST NOT surface those keys at all — they belong to other platforms.
  assert.ok(
    !("capture_excluded_window_count_max" in d),
    "Linux report leaked macOS/Windows capture_excluded_window_count_max"
  );
  assert.ok(
    !("capture_restricted_window_count_max" in d),
    "Linux report leaked macOS/Windows capture_restricted_window_count_max"
  );
  assert.ok(
    !("monitor_only_window_count_max" in d),
    "Linux report leaked macOS/Windows monitor_only_window_count_max"
  );
});
```

- [ ] **Step 2: Run to verify failure**

```bash
node --test tests/unit/reportBuilderLinuxDeviceShield.test.js
```

Expected: FAIL — current `buildDeviceIntegritySection` does not emit `display_server`, `coverage`, etc.

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/reportBuilderLinuxDeviceShield.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8b): red — reportBuilder lacks Linux device_integrity fields"
```

---

## Task 9: Green — extend `buildDeviceIntegritySection` for Linux

**Files:**

- Modify: `src/academic/reportBuilder.js`

- [ ] **Step 1: Read `src/academic/reportBuilder.js` to find `buildDeviceIntegritySection` (around line 68).**

- [ ] **Step 2: Refactor `buildDeviceIntegritySection`**

Replace the `return { ... }` block with platform-aware logic. The macOS/Windows path must stay byte-identical (no regression). New Linux path adds `display_server`, `display_server_locked`, `coverage`, `portal_advertised`, `portal_active`, the six x11 counts and `xwayland_window_count_max`.

Add a helper at the bottom of the file:

```javascript
function linuxAnomaly(state) {
  if (state.scanner_state === "wayland_compositor_restricted") return true;
  if (state.scanner_state === "wayland_compositor_unsupported") return true;
  if (state.scanner_state === "scanner_unavailable") return true;
  if (state.scanner_state === "permission_denied") return true;
  if (state.coverage === "wayland_limited") return true;
  if (state.coverage === "xwayland_partial") return true;
  if ((state.x11_override_redirect_window_count_max ?? 0) > 0) return true;
  if ((state.x11_above_window_count_max ?? 0) > 0) return true;
  if ((state.proofs_rejected ?? 0) > 0) return true;
  return false;
}
```

In `buildDeviceIntegritySection`, after the existing `anomaly = ...` line, add a Linux branch BEFORE the `return` block:

```javascript
if (platform === "linux") {
  const linuxAnom = linuxAnomaly(state);
  return {
    daemon_required: state.daemon_required ?? true,
    daemon_final_state: state.daemon_state ?? "missing",
    daemon_platform: "linux",
    platform: "linux",
    node_id_hash: state.node_id_hash ?? null,
    daemon_version: state.daemon_version ?? null,
    scanner_final_state: state.scanner_state ?? "unknown",
    scanner_version: state.scanner_version ?? null,
    proofs_verified: state.proofs_verified ?? 0,
    proofs_rejected: state.proofs_rejected ?? 0,
    stale_periods: state.stale_periods ?? 0,
    display_server: state.display_server ?? "unknown",
    display_server_locked: state.display_server_locked ?? false,
    coverage: state.coverage ?? "unknown",
    portal_advertised: state.portal_advertised ?? null,
    portal_active: state.portal_active ?? null,
    x11_managed_window_count_max: state.x11_managed_window_count_max ?? 0,
    x11_override_redirect_window_count_max: state.x11_override_redirect_window_count_max ?? 0,
    x11_above_window_count_max: state.x11_above_window_count_max ?? 0,
    x11_fullscreen_window_count_max: state.x11_fullscreen_window_count_max ?? 0,
    x11_skip_taskbar_window_count_max: state.x11_skip_taskbar_window_count_max ?? 0,
    xwayland_window_count_max: state.xwayland_window_count_max ?? 0,
    scanner_error_count: state.scanner_error_count ?? 0,
    permission_denied_count: state.permission_denied_count ?? 0,
    manual_review_recommendation: getManualReviewReason(linuxAnom ? "Warning" : "Safe", {
      context: "device_integrity",
    }),
  };
}
```

- [ ] **Step 3: Run tests**

```bash
node --test tests/unit/reportBuilderLinuxDeviceShield.test.js
```

Expected: 3/3 PASS.

```bash
npm test
```

Expected: full suite passes — macOS/Windows report tests must still pass byte-identically.

- [ ] **Step 4: Commit**

```bash
git add src/academic/reportBuilder.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): reportBuilder emits Linux device_integrity block"
```

---

## Task 9.5: Extend `scannerRiskPolicy.js` for Linux signals

**Files:**

- Create: `tests/unit/scannerRiskPolicyLinux.test.js`
- Modify: `src/device/scannerRiskPolicy.js`

Linux signals must map to risk so the dashboard / report / risk score stay aligned with the new `device_integrity` block. macOS/Windows mapping must remain byte-identical.

- [ ] **Step 1: Write the failing test**

Write `tests/unit/scannerRiskPolicyLinux.test.js`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import { mapScannerSummaryToRisk } from "../../src/device/scannerRiskPolicy.js";

test("Linux healthy x11 counts → Safe (daemon_risk 0, no force)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 0,
    x11_override_redirect_window_count_max: 0,
  });
  assert.equal(r.daemon_risk, 0);
  assert.equal(r.forceCritical, false);
});

test("Linux x11_above_window_count_max > 0 → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 1,
    x11_override_redirect_window_count_max: 0,
  });
  assert.ok(r.daemon_risk >= 40, `expected ≥40 risk, got ${r.daemon_risk}`);
  assert.equal(r.forceCritical, false);
});

test("Linux x11_override_redirect_window_count_max > 0 → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 0,
    x11_override_redirect_window_count_max: 1,
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("Linux wayland_compositor_restricted → Warning context (not misconduct)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "wayland_compositor_restricted",
    coverage: "wayland_limited",
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("Linux xwayland_partial coverage → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "xwayland_detected",
    coverage: "xwayland_partial",
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("macOS capture_excluded_window_count_max > 0 still forces Critical (no regression)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 1,
  });
  assert.equal(r.daemon_risk, 100);
  assert.equal(r.forceCritical, true);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
node --test tests/unit/scannerRiskPolicyLinux.test.js
```

Expected: Linux-specific tests FAIL; macOS regression test PASSes.

- [ ] **Step 3: Extend `src/device/scannerRiskPolicy.js`**

Read the file first. In `mapScannerSummaryToRisk`, after the existing macOS/Windows-shaped checks (capture_excluded / capture_restricted / monitor_only) and BEFORE the daemon-state fallbacks, add a Linux-aware branch:

```javascript
const x11Above = record?.x11_above_window_count_max ?? 0;
const x11Override = record?.x11_override_redirect_window_count_max ?? 0;
if (x11Above > 0 || x11Override > 0) {
  return { daemon_risk: 40, forceCritical: false };
}
if (
  record?.scanner_state === "wayland_compositor_restricted" ||
  record?.scanner_state === "wayland_compositor_unsupported" ||
  record?.scanner_state === "xwayland_detected" ||
  record?.coverage === "wayland_limited" ||
  record?.coverage === "xwayland_partial"
) {
  return { daemon_risk: 40, forceCritical: false };
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/unit/scannerRiskPolicyLinux.test.js
npm test
```

Expected: 6/6 Linux risk tests PASS; full suite green (macOS/Windows byte-identical).

- [ ] **Step 5: Commit**

```bash
git add src/device/scannerRiskPolicy.js tests/unit/scannerRiskPolicyLinux.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): scannerRiskPolicy maps Linux x11/Wayland signals to Warning"
```

---

## Task 10: Red — privacy-audit does not sweep Linux daemon paths

**Files:**

- Create: `tests/unit/privacyAuditLinux.test.js`

- [ ] **Step 1: Write the failing test**

Write `tests/unit/privacyAuditLinux.test.js`:

```javascript
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("privacy-audit DEFAULT_SCAN_DIRS includes the Linux daemon path", () => {
  const src = readFileSync("tools/privacy-audit.mjs", "utf8");
  // Match the constant definition robustly.
  const match = src.match(/DEFAULT_SCAN_DIRS\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, "DEFAULT_SCAN_DIRS constant not found");
  const list = match[1];
  assert.ok(
    list.includes("tools/simurgh-daemon-linux"),
    "DEFAULT_SCAN_DIRS missing tools/simurgh-daemon-linux"
  );
  assert.ok(
    list.includes("tests/fixtures/stage-2-8"),
    "DEFAULT_SCAN_DIRS missing tests/fixtures/stage-2-8"
  );
});

test("privacy-audit walk function skips target/ build directories", () => {
  // The walk function should not crawl into Rust target/ directories — they
  // contain build-artifact JSON files that may legitimately mention forbidden
  // field names (e.g., from Rust crate source comments) and would create false
  // positives. The walk function should explicitly skip directories named "target".
  const src = readFileSync("tools/privacy-audit.mjs", "utf8");
  assert.ok(
    /target/.test(src) && /skip|exclude|ignore/i.test(src),
    "privacy-audit must skip target/ directories (look for an explicit guard)"
  );
});
```

- [ ] **Step 2: Run to verify failure**

```bash
node --test tests/unit/privacyAuditLinux.test.js
```

Expected: FAIL — `DEFAULT_SCAN_DIRS` currently does not include the Linux daemon path, and there is no `target/` skip.

- [ ] **Step 3: Commit red test**

```bash
git add tests/unit/privacyAuditLinux.test.js
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "test(stage-2-8b): red — privacy-audit lacks Linux daemon sweep"
```

---

## Task 11: Green — extend privacy-audit for Linux paths + target/ skip

**Files:**

- Modify: `tools/privacy-audit.mjs`

- [ ] **Step 1: Find `DEFAULT_SCAN_DIRS` (line 24) and update it**

```javascript
const DEFAULT_SCAN_DIRS = [
  "data",
  "data/sessions",
  "data/audit",
  "data/reports",
  "data/exams",
  "tools/simurgh-daemon-linux",
  "tests/fixtures/stage-2-8",
];
```

- [ ] **Step 2: Find the `walk` function and add a `target/` skip**

Locate `function walk(dir) { ... }` and at the top of its body, before recursing into subdirectories, add:

```javascript
function walk(dir) {
  try {
    const stat = statSync(dir);
    if (!stat.isDirectory()) {
      if (dir.endsWith(".json")) scanFile(dir);
      return;
    }
    // Skip Rust build directories — they contain artifact JSONs that may
    // legitimately reference forbidden field names from crate source
    // comments (e.g., "process_name" in tower-http docs). Ignore the whole
    // subtree to avoid false positives.
    if (basename(dir) === "target") return;
    // ... existing readdirSync + recursion ...
```

Adjust the existing `walk` flow accordingly — keep `readdirSync` logic intact, only inject the `target` short-circuit and (if not already present) `node_modules` skip.

If the `walk` function is structured differently than shown, adapt the patch — the key invariants are: (1) directories named `target` are skipped entirely; (2) `node_modules` is skipped (might already be).

- [ ] **Step 3: Run privacy-audit + tests**

```bash
node tools/privacy-audit.mjs
```

Expected: PASS — should sweep more files now but find no violations.

```bash
node --test tests/unit/privacyAuditLinux.test.js
```

Expected: 2/2 PASS.

```bash
npm test
```

Expected: full suite passes.

- [ ] **Step 4: Commit**

```bash
git add tools/privacy-audit.mjs
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -m "feat(stage-2-8b): privacy-audit sweeps Linux daemon + skips target/"
```

---

## Task 12: Rust gates — fmt + clippy + test

**Files:**

- Verify-only.

- [ ] **Step 1: Run `cargo fmt --check`**

```bash
source ~/.cargo/env && cargo fmt --check --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: PASS. If FAIL, run `cargo fmt` and recheck.

- [ ] **Step 2: Run `cargo clippy`**

```bash
source ~/.cargo/env && cargo clippy --manifest-path tools/simurgh-daemon-linux/Cargo.toml --all-targets -- -D warnings
```

Expected: clean.

- [ ] **Step 3: Run all Rust tests**

```bash
source ~/.cargo/env && cargo test --manifest-path tools/simurgh-daemon-linux/Cargo.toml
```

Expected: prior 15 + 2 privacy + 2 xvfb (skipped if no Xvfb) = 19 PASS minimum.

- [ ] **Step 4: Commit if fmt required changes**

```bash
git status
# If clean, skip. Otherwise:
GIT_AUTHOR_NAME="Raoof Abedini" GIT_AUTHOR_EMAIL="raoof.r12@gmail.com" \
GIT_COMMITTER_NAME="Raoof Abedini" GIT_COMMITTER_EMAIL="raoof.r12@gmail.com" \
git commit -am "chore(stage-2-8b): cargo fmt + clippy clean"
```

---

## Task 13: Umbrella regression — Stage 2.7 smoke + closeout audit + full Node suite

**Files:**

- Verify-only.

- [ ] **Step 1: Stage 2.7 smoke**

```bash
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh
```

Expected: all 7 scenarios PASS.

- [ ] **Step 2: Stage 2.6/2.7 closeout audit**

```bash
bash scripts/security-audit-stage-2-6-2-7-closeout.sh
```

Expected: PASS.

- [ ] **Step 3: Full Node suite**

```bash
npm test
```

Expected: all PASS (288 prior + ~5 new = ~293).

- [ ] **Step 4: prettier check**

```bash
npm run format:check
```

Expected: PASS.

- [ ] **Step 5: npm audit**

```bash
npm audit --audit-level=high
```

Expected: 0 vulnerabilities.

- [ ] **Step 6: Privacy audit**

```bash
node tools/privacy-audit.mjs
```

Expected: PASS — and should now report more files scanned than before (Linux daemon tree included).

If any gate fails, fix the cause and re-run from Step 1. Do not advance to Task 14 until every gate is green.

---

## Task 14: Push, open PR #20, release tag

**Files:**

- Verify-only + git operations.

- [ ] **Step 1: Push branch**

```bash
git push -u origin stage-2-8b-linux-x11-scanner
```

(Branch name assumes you started from `main` post-merge: `git checkout -b stage-2-8b-linux-x11-scanner`. If the implementer started on a different branch, push under that name.)

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "Stage 2.8B: Linux X11 metadata scanner (PR #20)" --body "$(cat <<'EOF'
## Summary

- Real X11 metadata scanner via `x11rb` — reads `_NET_CLIENT_LIST`, `_NET_WM_STATE` (above / fullscreen / skip_taskbar), and `GetWindowAttributes` override_redirect.
- Privacy filter (`scanner::privacy`) guarantees counts-only output — no raw window IDs, classes, titles, or process names ever cross the API boundary.
- `/status` endpoint runs the scanner when `display_server == x11` and the detector reports clean local-display state; otherwise unchanged.
- Fixture binary uses the real scanner when X11 is available, falls back to deterministic defaults in headless / CI.
- `reportBuilder` emits Linux `device_integrity` block (`display_server`, `display_server_locked`, `coverage`, `portal_*`, six x11 counts, `xwayland_window_count_max`).
- `privacy-audit` sweeps `tools/simurgh-daemon-linux/` and `tests/fixtures/stage-2-8/`, skipping `target/` build artifacts.

## Spec

`docs/superpowers/specs/2026-05-17-stage-2-8-linux-display-integrity-design.md` §6.10, §7.1, §7.3.

## Out of scope (later sub-releases)

- Wayland portal advertised/active probe — PR #21.
- Snap/Flatpak hint detection — PR #21.
- XWayland scanner — PR #21.
- systemd `--user` unit + Ubuntu CI Rust job — PR #22.
- Reviewer checklist / validation matrix / closeout docs — PR #23.

## Test plan

- [ ] `npm test` green
- [ ] `node tools/privacy-audit.mjs` green
- [ ] `npm audit --audit-level=high` green
- [ ] `cargo fmt --check && cargo clippy -- -D warnings && cargo test` green
- [ ] Xvfb integration tests (locally: 2/2 when Xvfb installed; gracefully skipped otherwise)
- [ ] Stage 2.7 smoke + Stage 2.6/2.7 closeout audit green
- [ ] CI Quality Gate (GitHub Actions — pending after push)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Watch CI**

```bash
gh pr checks <new-pr-number> --watch
```

When green, merge per Raouf's preferred policy (`gh pr merge <N> --auto --squash --delete-branch` for review-gated, or `--admin` for self-approved).

- [ ] **Step 4: Tag and release after merge**

```bash
git checkout main
git pull --ff-only
git tag v0.4.15-stage-2-8B-linux-x11-scanner
git push origin v0.4.15-stage-2-8B-linux-x11-scanner
gh release create v0.4.15-stage-2-8B-linux-x11-scanner --title "Stage 2.8B — Linux X11 Scanner" --notes "..."
```

(Release notes follow the same shape as the v0.4.14 release. Highlight: real metadata scanner now backs Linux Device Shield; privacy-audit coverage extended; reportBuilder Linux block.)

---

## Self-Review (post-write, pre-handoff)

**Spec coverage** (§ references to design spec):

- §6.10 platform-specific validators: covered by PR #19 — extended here by Task 9 reportBuilder Linux branch + Task 9.5 risk policy.
- §7.1 Linux daemon proof payload x11 counts: Tasks 3, 6, 6.5, 7 — Task 6.5 wires the scanner into the **signed `/proof`** payload (the trust boundary), not only `/status`.
- §7.3 Linux `device_integrity` shape: Task 9 emits every field (`display_server`, `display_server_locked`, `coverage`, `portal_advertised`, `portal_active`, six x11 counts, `xwayland_window_count_max`).
- §7.4 risk policy (Linux Warning context for above/override-redirect/wayland_limited/xwayland_partial): Task 9.5.
- §15.5 red-test checklist items 6 (reportBuilder Linux fields) + 7 (privacy-audit Linux coverage): closed by Tasks 8/9 + Tasks 10/11 respectively. These were the two checklist items deferred from PR #19.

**Raouf review fixes (applied 2026-05-18):**

1. ✅ `/proof` wiring — Task 6.5 added (scanner into signed payload + Linux count rollup in daemonState).
2. ✅ `query_tree(root)` for override_redirect (overlay windows are NOT in `_NET_CLIENT_LIST`) — Task 3 updated.
3. ✅ Real synthetic-window Xvfb tests (create managed windows + override_redirect child) — Task 5 strengthened.
4. ✅ `x11::scan()` defence-in-depth non-local `$DISPLAY` refusal — Task 3 updated.
5. ✅ `cargo test --test xvfb_integration_tests` (not name filter) — Task 5 command fixed.
6. ✅ Node ≥ 22 — header fixed.
7. ✅ Strict `assert.ok(!("key" in d))` for macOS/Windows field absence — Task 8 fixed.
8. ✅ scannerRiskPolicy Linux coverage — Task 9.5 added.

**Placeholder scan:** No TBDs. Each step has runnable code. The fixture-regeneration in Task 7 is deliberately optional with explicit revert guidance to preserve PR #19's signed fixture.

**Type consistency:**

- `RawX11Counts` field set matches `X11ScannerSummary` field set: managed / override_redirect / above / fullscreen / skip_taskbar + suspicious + visible counts. Same names used in scanner module (Task 2/3), `/status` JSON (Task 6), fixture binary (Task 7).
- `x11_counts: [u32; 5]` ordering preserved from PR #19: managed, override_redirect, above, fullscreen, skip_taskbar. Task 7's mapping respects this order.
- Linux `device_integrity` field names in Task 8 test match Task 9 implementation: `display_server_locked`, `coverage`, `portal_advertised`, `portal_active`, `x11_*_count_max`, `xwayland_window_count_max`.
- `scanner_unavailable` function name is consistent between privacy module and x11 module.

**Issues fixed during review:** none.

**Risk: x11rb 0.13 API shape.** The biggest unknown is whether x11rb's GetProperty + GetWindowAttributes API exactly matches the code in Task 3. If it doesn't, the implementer should adjust inline — the spec is the privacy contract (counts only), not the specific x11rb method names. Document any deviation in commit message.

**Risk: Xvfb integration test flakiness.** Mitigated by `DISPLAY_LOCK` mutex serialising the env-var mutation and by graceful skip when Xvfb is not installed.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-17-stage-2-8b-linux-x11-scanner.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration.

**2. Inline Execution** — execute all tasks in this session using `executing-plans`, batch with checkpoints.

**Which approach?**
