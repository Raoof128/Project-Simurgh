// SPDX-License-Identifier: AGPL-3.0-or-later
//! XWayland scanner — reuses the X11 path against $DISPLAY but maps results
//! into the xwayland-partial coverage shape so reports never claim full
//! Wayland coverage from XWayland-only visibility.
//!
//! XWayland windows are X11 clients running inside a Wayland session. We
//! enumerate them with the existing X11 EWMH path, but the count goes to
//! `xwayland_window_count` (not `x11_managed_window_count`) and coverage
//! is explicitly `xwayland_partial`. Native Wayland clients in the same
//! session remain invisible to us — that's the Wayland security model.

use crate::scanner::privacy::LinuxScannerSummary;
use crate::scanner::session::is_local_display;

pub fn scan() -> LinuxScannerSummary {
    let display = std::env::var("DISPLAY").unwrap_or_default();
    scan_with_display(&display)
}

/// Display-injected scan. `scan()` is the thin `$DISPLAY`-reading wrapper;
/// this carries the actual logic. Taking the display explicitly keeps tests
/// off the process-global `DISPLAY` env var, which races when cargo runs the
/// tests in a binary across parallel threads.
pub fn scan_with_display(display: &str) -> LinuxScannerSummary {
    if !is_local_display(display) {
        return LinuxScannerSummary::unavailable("non_local_display");
    }
    match crate::scanner::x11::scan_inner_public() {
        Ok(raw) => LinuxScannerSummary {
            scanner_state: "xwayland_detected",
            scanner_reason: "none",
            coverage: "xwayland_partial",
            portal_advertised: None,
            portal_active: None,
            // XWayland-mapped X11 visibility counts surface as xwayland_window_count,
            // NOT as x11_managed_window_count — native Wayland-side surfaces are
            // still unreachable and we must never claim full Wayland coverage.
            x11_managed_window_count: 0,
            x11_override_redirect_window_count: raw.override_redirect_window_count,
            x11_above_window_count: raw.above_window_count,
            x11_fullscreen_window_count: raw.fullscreen_window_count,
            x11_skip_taskbar_window_count: raw.skip_taskbar_window_count,
            xwayland_window_count: raw.managed_window_count + raw.override_redirect_window_count,
            suspicious_window_count: 0,
            visible_window_count: raw.managed_window_count + raw.override_redirect_window_count,
        },
        Err(reason) => LinuxScannerSummary::unavailable(reason),
    }
}
