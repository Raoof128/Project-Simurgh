use simurgh_daemon_linux::scanner::xwayland;

/// XWayland scanner inherits the X11 non-local-display refusal as a
/// privacy/security boundary.
#[test]
fn xwayland_refuses_non_local_display() {
    // Lock DISPLAY for the duration of this test. Other tests in this binary
    // run sequentially by default (no #[tokio::test] threading here).
    std::env::set_var("DISPLAY", "host.tld:0");
    let s = xwayland::scan();
    assert_eq!(s.scanner_state, "scanner_unavailable");
    assert_eq!(s.scanner_reason, "non_local_display");
    assert_eq!(s.coverage, "unknown");
}

/// XWayland scan against a local display either succeeds with the
/// xwayland_partial coverage label or falls back to scanner_unavailable
/// (e.g., when there is no real X server). Either is a valid outcome;
/// what matters is the coverage label NEVER claims full Wayland parity.
#[test]
fn xwayland_local_display_emits_partial_coverage_or_unavailable() {
    std::env::set_var("DISPLAY", ":0");
    let s = xwayland::scan();
    match s.scanner_state {
        "xwayland_detected" => {
            assert_eq!(s.coverage, "xwayland_partial");
            assert_eq!(s.scanner_reason, "none");
            // Native Wayland clients remain invisible — managed count must
            // route to xwayland_window_count, never x11_managed_window_count.
            assert_eq!(s.x11_managed_window_count, 0);
        }
        "scanner_unavailable" => {
            // OK — no X server reachable on this host.
            assert_eq!(s.coverage, "unknown");
        }
        other => panic!("unexpected scanner_state for XWayland: {other}"),
    }
}

/// Defence in depth: XWayland output never advertises portal_advertised
/// or portal_active (those are Wayland-portal-only fields).
#[test]
fn xwayland_output_carries_no_portal_fields() {
    std::env::set_var("DISPLAY", ":0");
    let s = xwayland::scan();
    assert_eq!(s.portal_advertised, None);
    assert_eq!(s.portal_active, None);
}
