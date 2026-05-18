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
