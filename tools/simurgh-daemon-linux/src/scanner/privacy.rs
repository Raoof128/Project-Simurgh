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
