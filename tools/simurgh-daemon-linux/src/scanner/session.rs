#[derive(Debug, Clone)]
pub struct SessionEnv {
    pub xdg_session_type: Option<String>,
    pub wayland_display: Option<String>,
    pub x_display: Option<String>,
}

impl SessionEnv {
    pub fn from_process_env() -> Self {
        Self {
            xdg_session_type: std::env::var("XDG_SESSION_TYPE").ok(),
            wayland_display: std::env::var("WAYLAND_DISPLAY").ok(),
            x_display: std::env::var("DISPLAY").ok(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SessionDetection {
    pub display_server: &'static str,
    pub scanner_state: &'static str,
    pub scanner_reason: &'static str,
    pub coverage: &'static str,
}

pub fn detect(env: &SessionEnv) -> SessionDetection {
    let has_wl = env.wayland_display.is_some();
    let has_x = env.x_display.is_some();
    match (has_wl, has_x) {
        (false, false) => SessionDetection {
            display_server: "headless",
            scanner_state: "scanner_unavailable",
            scanner_reason: "no_display_server",
            coverage: "headless_none",
        },
        (true, true) => SessionDetection {
            display_server: "xwayland",
            scanner_state: "xwayland_detected",
            scanner_reason: "none",
            coverage: "xwayland_partial",
        },
        (true, false) => SessionDetection {
            display_server: "wayland",
            scanner_state: "wayland_compositor_restricted",
            scanner_reason: "none",
            coverage: "wayland_limited",
        },
        (false, true) => {
            if is_local_display(env.x_display.as_deref().unwrap_or("")) {
                SessionDetection {
                    display_server: "x11",
                    scanner_state: "healthy",
                    scanner_reason: "none",
                    coverage: "x11_full",
                }
            } else {
                SessionDetection {
                    display_server: "x11",
                    scanner_state: "scanner_unavailable",
                    scanner_reason: "non_local_display",
                    coverage: "unknown",
                }
            }
        }
    }
}

fn is_local_display(d: &str) -> bool {
    // Local forms: ":N", ":N.M", "unix/:N", "unix:N", absolute paths.
    if d.is_empty() {
        return false;
    }
    if d.starts_with(':') {
        return true;
    }
    if d.starts_with("unix/") || d.starts_with("unix:") {
        return true;
    }
    if d.starts_with('/') {
        return true;
    }
    // Anything before the first ':' is a host. Empty / loopback hosts only.
    let host = d.split(':').next().unwrap_or("");
    matches!(host, "" | "localhost" | "127.0.0.1" | "::1")
}
