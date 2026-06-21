// SPDX-License-Identifier: AGPL-3.0-or-later
use simurgh_daemon_linux::scanner::xwayland;

// These tests inject DISPLAY explicitly via `scan_with_display` instead of
// mutating the process-global `DISPLAY` env var. Cargo runs the tests in a
// binary across parallel threads, so a shared env var races (one test setting
// DISPLAY=":0" flips another's non-local-display assertion). Explicit injection
// makes each case self-contained and deterministic.

/// XWayland scanner inherits the X11 non-local-display refusal as a
/// privacy/security boundary.
#[test]
fn xwayland_refuses_non_local_display() {
    let s = xwayland::scan_with_display("host.tld:0");
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
    let s = xwayland::scan_with_display(":0");
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
    let s = xwayland::scan_with_display(":0");
    assert_eq!(s.portal_advertised, None);
    assert_eq!(s.portal_active, None);
}
