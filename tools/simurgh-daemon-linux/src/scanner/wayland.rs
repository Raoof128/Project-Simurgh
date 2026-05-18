//! Wayland portal probe — `portal_advertised` (cheap DBus name check) and
//! `portal_active` (no-consent capability probe — property read only, NEVER
//! a session-creation call). Never starts a ScreenCast session. Falls back
//! to `portal_active_probe_unavailable` if the compositor cannot provide
//! a safe probe.
//!
//! Hard rule: this module MUST NOT call any of:
//!   - org.freedesktop.portal.ScreenCast.CreateSession
//!   - org.freedesktop.portal.ScreenCast.SelectSources
//!   - org.freedesktop.portal.ScreenCast.Start
//!   - org.freedesktop.portal.ScreenCast.OpenPipeWireRemote
//!     Any of those would surface a user consent dialog. The phase-H security
//!     audit greps this file's source to enforce that invariant.

use crate::scanner::privacy::LinuxScannerSummary;

#[derive(Debug, Clone, Copy)]
pub struct WaylandProbe {
    pub portal_advertised: bool,
    pub portal_active: bool,
    pub probe_unavailable: bool,
}

pub fn probe() -> WaylandProbe {
    std::panic::catch_unwind(probe_inner).unwrap_or(WaylandProbe {
        portal_advertised: false,
        portal_active: false,
        probe_unavailable: true,
    })
}

fn probe_inner() -> WaylandProbe {
    use tokio::runtime::Builder;
    let rt = match Builder::new_current_thread().enable_all().build() {
        Ok(rt) => rt,
        Err(_) => {
            return WaylandProbe {
                portal_advertised: false,
                portal_active: false,
                probe_unavailable: true,
            };
        }
    };
    rt.block_on(async {
        let conn = match zbus::Connection::session().await {
            Ok(c) => c,
            Err(_) => {
                return WaylandProbe {
                    portal_advertised: false,
                    portal_active: false,
                    probe_unavailable: true,
                };
            }
        };
        let advertised = name_has_owner(&conn, "org.freedesktop.portal.Desktop").await;
        if !advertised {
            return WaylandProbe {
                portal_advertised: false,
                portal_active: false,
                probe_unavailable: false,
            };
        }
        // Property read only — NO consent dialog can fire from get_property.
        let active = read_available_source_types(&conn).await.is_some();
        WaylandProbe {
            portal_advertised: true,
            portal_active: active,
            probe_unavailable: !active,
        }
    })
}

async fn name_has_owner(conn: &zbus::Connection, name: &str) -> bool {
    let proxy = match zbus::Proxy::new(
        conn,
        "org.freedesktop.DBus",
        "/org/freedesktop/DBus",
        "org.freedesktop.DBus",
    )
    .await
    {
        Ok(p) => p,
        Err(_) => return false,
    };
    proxy
        .call::<_, _, bool>("NameHasOwner", &(name,))
        .await
        .unwrap_or(false)
}

async fn read_available_source_types(conn: &zbus::Connection) -> Option<u32> {
    let proxy = zbus::Proxy::new(
        conn,
        "org.freedesktop.portal.Desktop",
        "/org/freedesktop/portal/desktop",
        "org.freedesktop.portal.ScreenCast",
    )
    .await
    .ok()?;
    proxy.get_property::<u32>("AvailableSourceTypes").await.ok()
}

pub fn wayland_summary(probe_result: WaylandProbe) -> LinuxScannerSummary {
    let scanner_state = if probe_result.portal_advertised && probe_result.portal_active {
        "wayland_portal_available"
    } else if probe_result.portal_advertised {
        "wayland_compositor_restricted"
    } else {
        "wayland_compositor_unsupported"
    };
    let scanner_reason = if probe_result.probe_unavailable {
        "portal_active_probe_unavailable"
    } else if probe_result.portal_advertised && !probe_result.portal_active {
        "portal_not_active"
    } else {
        "none"
    };
    LinuxScannerSummary {
        scanner_state,
        scanner_reason,
        coverage: "wayland_limited",
        portal_advertised: Some(probe_result.portal_advertised),
        portal_active: Some(probe_result.portal_active),
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
