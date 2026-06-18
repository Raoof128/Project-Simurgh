// SPDX-License-Identifier: AGPL-3.0-or-later
use simurgh_daemon_linux::scanner::x11::{scan, scan_with_connection};
use std::process::{Child, Command, Stdio};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use x11rb::connection::Connection;
use x11rb::protocol::xproto::{
    AtomEnum, ConnectionExt, CreateWindowAux, EventMask, PropMode, WindowClass,
};
use x11rb::wrapper::ConnectionExt as WrapperConnectionExt;

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
    let mut child = Command::new("Xvfb")
        .args([&display, "-screen", "0", "1024x768x24", "-nolisten", "tcp"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .ok()?;

    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline {
        if matches!(child.try_wait(), Ok(Some(_))) {
            return None;
        }
        if x11rb::connect(Some(display.as_str())).is_ok() {
            return Some(XvfbGuard { child });
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    let _ = child.kill();
    let _ = child.wait();
    None
}

fn require_xvfb(display_num: u32) -> XvfbGuard {
    start_xvfb(display_num).unwrap_or_else(|| {
        panic!(
            "Xvfb display :{display_num} did not become ready; \
             verify xvfb can bind and accept local X11 connections"
        )
    })
}

static DISPLAY_LOCK: OnceLock<std::sync::Mutex<()>> = OnceLock::new();
fn lock() -> std::sync::MutexGuard<'static, ()> {
    DISPLAY_LOCK
        .get_or_init(|| std::sync::Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[test]
fn scan_returns_summary_against_empty_xvfb_root() {
    if !xvfb_available() {
        if std::env::var("SIMURGH_REQUIRE_XVFB_TESTS").is_ok() {
            panic!(
                "SIMURGH_REQUIRE_XVFB_TESTS is set but Xvfb is not installed — \
                 install xvfb + x11-utils + dbus-x11 in CI"
            );
        }
        eprintln!("Xvfb not installed; skipping (set SIMURGH_REQUIRE_XVFB_TESTS=1 in CI)");
        return;
    }
    let _g = lock();
    let _xvfb = require_xvfb(99);
    std::env::set_var("DISPLAY", ":99");
    let summary = scan();
    assert_eq!(summary.x11_managed_window_count, 0);
    assert_eq!(summary.scanner_state, "healthy");
    assert_eq!(summary.scanner_reason, "none");
}

#[test]
fn scan_returns_scanner_unavailable_when_display_invalid() {
    let _g = lock();
    std::env::set_var("DISPLAY", ":invalid-display");
    let summary = scan();
    assert_eq!(summary.scanner_state, "scanner_unavailable");
}

#[test]
fn scan_counts_managed_above_and_fullscreen_windows() {
    if !xvfb_available() {
        if std::env::var("SIMURGH_REQUIRE_XVFB_TESTS").is_ok() {
            panic!(
                "SIMURGH_REQUIRE_XVFB_TESTS is set but Xvfb is not installed — \
                 install xvfb + x11-utils + dbus-x11 in CI"
            );
        }
        eprintln!("Xvfb not installed; skipping (set SIMURGH_REQUIRE_XVFB_TESTS=1 in CI)");
        return;
    }
    let _g = lock();
    let _xvfb = require_xvfb(100);
    std::env::set_var("DISPLAY", ":100");

    let (conn, screen_num) = x11rb::connect(None).expect("connect");
    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    let net_client_list = conn
        .intern_atom(false, b"_NET_CLIENT_LIST")
        .unwrap()
        .reply()
        .unwrap()
        .atom;
    let net_wm_state = conn
        .intern_atom(false, b"_NET_WM_STATE")
        .unwrap()
        .reply()
        .unwrap()
        .atom;
    let net_wm_state_above = conn
        .intern_atom(false, b"_NET_WM_STATE_ABOVE")
        .unwrap()
        .reply()
        .unwrap()
        .atom;
    let net_wm_state_fullscreen = conn
        .intern_atom(false, b"_NET_WM_STATE_FULLSCREEN")
        .unwrap()
        .reply()
        .unwrap()
        .atom;

    let win1 = conn.generate_id().unwrap();
    let win2 = conn.generate_id().unwrap();
    for w in [win1, win2] {
        conn.create_window(
            x11rb::COPY_DEPTH_FROM_PARENT,
            w,
            root,
            0,
            0,
            100,
            100,
            0,
            WindowClass::INPUT_OUTPUT,
            x11rb::COPY_FROM_PARENT,
            &CreateWindowAux::new().event_mask(EventMask::EXPOSURE),
        )
        .unwrap();
    }
    conn.change_property32(
        PropMode::REPLACE,
        win1,
        net_wm_state,
        AtomEnum::ATOM,
        &[net_wm_state_above],
    )
    .unwrap();
    conn.change_property32(
        PropMode::REPLACE,
        win2,
        net_wm_state,
        AtomEnum::ATOM,
        &[net_wm_state_fullscreen],
    )
    .unwrap();
    conn.change_property32(
        PropMode::REPLACE,
        root,
        net_client_list,
        AtomEnum::WINDOW,
        &[win1, win2],
    )
    .unwrap();
    conn.flush().unwrap();

    let raw = scan_with_connection(&conn, root).expect("scan_with_connection");
    assert_eq!(raw.managed_window_count, 2);
    assert_eq!(raw.above_window_count, 1);
    assert_eq!(raw.fullscreen_window_count, 1);
}

#[test]
fn scan_counts_override_redirect_root_children() {
    if !xvfb_available() {
        if std::env::var("SIMURGH_REQUIRE_XVFB_TESTS").is_ok() {
            panic!(
                "SIMURGH_REQUIRE_XVFB_TESTS is set but Xvfb is not installed — \
                 install xvfb + x11-utils + dbus-x11 in CI"
            );
        }
        eprintln!("Xvfb not installed; skipping (set SIMURGH_REQUIRE_XVFB_TESTS=1 in CI)");
        return;
    }
    let _g = lock();
    let _xvfb = require_xvfb(101);
    std::env::set_var("DISPLAY", ":101");

    let (conn, screen_num) = x11rb::connect(None).expect("connect");
    let screen = &conn.setup().roots[screen_num];
    let root = screen.root;

    let overlay = conn.generate_id().unwrap();
    conn.create_window(
        x11rb::COPY_DEPTH_FROM_PARENT,
        overlay,
        root,
        0,
        0,
        80,
        80,
        0,
        WindowClass::INPUT_OUTPUT,
        x11rb::COPY_FROM_PARENT,
        &CreateWindowAux::new()
            .override_redirect(1)
            .event_mask(EventMask::EXPOSURE),
    )
    .unwrap();
    conn.flush().unwrap();

    let raw = scan_with_connection(&conn, root).expect("scan_with_connection");
    assert!(
        raw.override_redirect_window_count >= 1,
        "expected >=1 override_redirect, got {}",
        raw.override_redirect_window_count
    );
}
