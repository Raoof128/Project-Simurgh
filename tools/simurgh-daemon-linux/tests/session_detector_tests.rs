use simurgh_daemon_linux::scanner::session::{detect, SessionEnv};

#[test]
fn headless_when_no_env_is_set() {
    let env = SessionEnv {
        xdg_session_type: None,
        wayland_display: None,
        x_display: None,
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "headless");
    assert_eq!(s.scanner_reason, "no_display_server");
}

#[test]
fn x11_when_display_set() {
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
fn wayland_when_wayland_display_set() {
    let env = SessionEnv {
        xdg_session_type: Some("wayland".into()),
        wayland_display: Some("wayland-0".into()),
        x_display: None,
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "wayland");
}

#[test]
fn xwayland_when_wayland_and_display_both_set() {
    let env = SessionEnv {
        xdg_session_type: Some("wayland".into()),
        wayland_display: Some("wayland-0".into()),
        x_display: Some(":0".into()),
    };
    let s = detect(&env);
    assert_eq!(s.display_server, "xwayland");
}
