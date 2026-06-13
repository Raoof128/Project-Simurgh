// SPDX-License-Identifier: AGPL-3.0-or-later
use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};

#[test]
fn local_display_colon_zero_allowed() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some(":0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_reason, "none");
}

#[test]
fn local_unix_display_allowed() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("unix/:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_reason, "none");
}

#[test]
fn remote_hostname_display_refused() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("host.tld:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "x11");
    assert_eq!(s.scanner_state, "scanner_unavailable");
    assert_eq!(s.scanner_reason, "non_local_display");
}

#[test]
fn remote_ip_display_refused() {
    let env = SessionEnv {
        xdg_session_type: Some("x11".into()),
        wayland_display: None,
        x_display: Some("192.168.1.5:0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.scanner_reason, "non_local_display");
}
