use simurgh_daemon_linux::scanner::wayland::{wayland_summary, WaylandProbe};

#[test]
fn wayland_summary_active_emits_portal_available_state() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: true,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_portal_available");
    assert_eq!(s.scanner_reason, "none");
    assert_eq!(s.coverage, "wayland_limited");
    assert_eq!(s.portal_advertised, Some(true));
    assert_eq!(s.portal_active, Some(true));
}

#[test]
fn wayland_summary_advertised_only_emits_compositor_restricted() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: false,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_compositor_restricted");
    assert_eq!(s.scanner_reason, "portal_not_active");
    assert_eq!(s.portal_advertised, Some(true));
    assert_eq!(s.portal_active, Some(false));
}

#[test]
fn wayland_summary_probe_unavailable_emits_portal_active_probe_unavailable() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: false,
        probe_unavailable: true,
    });
    assert_eq!(s.scanner_reason, "portal_active_probe_unavailable");
}

#[test]
fn wayland_summary_not_advertised_emits_compositor_unsupported() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: false,
        portal_active: false,
        probe_unavailable: false,
    });
    assert_eq!(s.scanner_state, "wayland_compositor_unsupported");
    assert_eq!(s.portal_advertised, Some(false));
    assert_eq!(s.portal_active, Some(false));
}

#[test]
fn wayland_summary_emits_zero_counts() {
    let s = wayland_summary(WaylandProbe {
        portal_advertised: true,
        portal_active: true,
        probe_unavailable: false,
    });
    // Wayland security model: no cross-client surface enumeration possible.
    // Counts MUST stay zero regardless of probe outcome.
    assert_eq!(s.x11_managed_window_count, 0);
    assert_eq!(s.x11_above_window_count, 0);
    assert_eq!(s.xwayland_window_count, 0);
    assert_eq!(s.visible_window_count, 0);
}

/// SECURITY: the Wayland scanner source MUST NOT reference any DBus method
/// name that would trigger a user consent dialog. Phase H's security audit
/// also enforces this; we keep it co-located with the wayland module so a
/// breaking change fails fast.
#[test]
fn wayland_rs_never_references_consent_triggering_methods() {
    let src = std::fs::read_to_string("src/scanner/wayland.rs")
        .expect("read scanner/wayland.rs from manifest dir");
    for banned in &["CreateSession", "SelectSources", "OpenPipeWireRemote"] {
        assert!(
            !src.contains(&format!("\"{banned}\"")) && !src.contains(&format!(".{banned}(")),
            "wayland.rs references ScreenCast method `{banned}` — would trigger consent dialog"
        );
    }
    // "Start" is a more common word; check only specifically-quoted forms.
    assert!(
        !src.contains("\"Start\""),
        "wayland.rs references ScreenCast method `Start` — would trigger consent dialog"
    );
}
