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

/// Cross-platform Linux scanner summary. Carries every field the signed
/// /proof payload needs from a scan, regardless of whether the source was
/// X11, Wayland, XWayland, or headless. This is the trust-boundary output
/// shape — fields here are the ones that cross from scanner to proof.
#[derive(Debug, Clone)]
pub struct LinuxScannerSummary {
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
    pub portal_advertised: Option<bool>,
    pub portal_active: Option<bool>,
    pub x11_managed_window_count: u32,
    pub x11_override_redirect_window_count: u32,
    pub x11_above_window_count: u32,
    pub x11_fullscreen_window_count: u32,
    pub x11_skip_taskbar_window_count: u32,
    pub xwayland_window_count: u32,
    pub suspicious_window_count: u32,
    pub visible_window_count: u32,
}

impl LinuxScannerSummary {
    pub fn unavailable(reason: &'static str) -> Self {
        Self {
            scanner_state: "scanner_unavailable",
            scanner_reason: reason,
            coverage: "unknown",
            portal_advertised: None,
            portal_active: None,
            x11_managed_window_count: 0,
            x11_override_redirect_window_count: 0,
            x11_above_window_count: 0,
            x11_fullscreen_window_count: 0,
            x11_skip_taskbar_window_count: 0,
            xwayland_window_count: 0,
            suspicious_window_count: 0,
            visible_window_count: 0,
        }
    }
}

/// Promote an X11ScannerSummary into the cross-platform LinuxScannerSummary
/// shape. Used when the existing PR #20 X11 path feeds the new combined
/// `/status` and `/proof` dispatch.
pub fn x11_to_linux_summary(s: X11ScannerSummary) -> LinuxScannerSummary {
    LinuxScannerSummary {
        scanner_state: s.scanner_state,
        scanner_reason: s.scanner_reason,
        coverage: s.coverage,
        portal_advertised: None,
        portal_active: None,
        x11_managed_window_count: s.x11_managed_window_count,
        x11_override_redirect_window_count: s.x11_override_redirect_window_count,
        x11_above_window_count: s.x11_above_window_count,
        x11_fullscreen_window_count: s.x11_fullscreen_window_count,
        x11_skip_taskbar_window_count: s.x11_skip_taskbar_window_count,
        xwayland_window_count: 0,
        suspicious_window_count: s.suspicious_window_count,
        visible_window_count: s.visible_window_count,
    }
}
