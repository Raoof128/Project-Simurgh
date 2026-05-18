use crate::scanner::privacy::{
    raw_to_summary, scanner_unavailable, RawX11Counts, X11ScannerSummary,
};
use crate::scanner::session::is_local_display;

/// High-level entry point: open an X11 connection from $DISPLAY, run the scan,
/// return a privacy-filtered summary. Errors return scanner_unavailable with a
/// stable reason code — they MUST NOT propagate connection details to callers.
///
/// Defence-in-depth: refuses non-local $DISPLAY before connecting. The session
/// detector also enforces this in /status, but the scanner enforces it again
/// so any direct caller of `scan()` cannot bypass the privacy boundary.
pub fn scan() -> X11ScannerSummary {
    let display = std::env::var("DISPLAY").unwrap_or_default();
    if !is_local_display(&display) {
        return scanner_unavailable("non_local_display");
    }
    match scan_inner() {
        Ok(raw) => raw_to_summary(raw),
        Err(reason) => scanner_unavailable(reason),
    }
}

fn scan_inner() -> Result<RawX11Counts, &'static str> {
    use x11rb::connection::Connection;
    let (conn, screen_num) = x11rb::connect(None).map_err(|_| "scanner_unavailable")?;
    let setup = conn.setup();
    let screen = setup.roots.get(screen_num).ok_or("scanner_unavailable")?;
    let root = screen.root;
    scan_with_connection(&conn, root)
}

pub fn scan_with_connection<C: x11rb::connection::Connection>(
    conn: &C,
    root: x11rb::protocol::xproto::Window,
) -> Result<RawX11Counts, &'static str> {
    use x11rb::protocol::xproto::{AtomEnum, ConnectionExt};

    let atoms = InternedAtoms::intern(conn)?;

    // (a) Managed top-level windows from _NET_CLIENT_LIST.
    let client_list_cookie = conn
        .get_property(
            false,
            root,
            atoms.net_client_list,
            AtomEnum::WINDOW,
            0,
            u32::MAX,
        )
        .map_err(|_| "scanner_unavailable")?;
    let client_list_reply = client_list_cookie
        .reply()
        .map_err(|_| "scanner_unavailable")?;
    let managed: Vec<u32> = client_list_reply
        .value32()
        .map(|iter| iter.collect())
        .unwrap_or_default();

    // (b) ALL root children via query_tree. override_redirect windows
    // (overlays, tooltips, exam-cheat surfaces) are NOT in _NET_CLIENT_LIST.
    let tree_reply = conn
        .query_tree(root)
        .map_err(|_| "scanner_unavailable")?
        .reply()
        .map_err(|_| "scanner_unavailable")?;
    let root_children: Vec<u32> = tree_reply.children.into_iter().collect();

    let mut above = 0u32;
    let mut fullscreen = 0u32;
    let mut skip_taskbar = 0u32;
    let mut override_redirect = 0u32;

    // Per-window _NET_WM_STATE on managed windows only.
    for win in &managed {
        if let Ok(cookie) =
            conn.get_property(false, *win, atoms.net_wm_state, AtomEnum::ATOM, 0, u32::MAX)
        {
            if let Ok(reply) = cookie.reply() {
                if let Some(atoms_iter) = reply.value32() {
                    for atom in atoms_iter {
                        if atom == atoms.net_wm_state_above {
                            above += 1;
                        }
                        if atom == atoms.net_wm_state_fullscreen {
                            fullscreen += 1;
                        }
                        if atom == atoms.net_wm_state_skip_taskbar {
                            skip_taskbar += 1;
                        }
                    }
                }
            }
        }
    }

    // override_redirect across ALL root children (skip root itself).
    for win in &root_children {
        if *win == root {
            continue;
        }
        if let Ok(cookie) = conn.get_window_attributes(*win) {
            if let Ok(attrs) = cookie.reply() {
                if attrs.override_redirect {
                    override_redirect += 1;
                }
            }
        }
    }

    // visible_window_count policy: managed + override_redirect.
    let managed_count = managed.len() as u32;
    let visible_count = managed_count + override_redirect;
    Ok(RawX11Counts {
        managed_window_count: managed_count,
        override_redirect_window_count: override_redirect,
        above_window_count: above,
        fullscreen_window_count: fullscreen,
        skip_taskbar_window_count: skip_taskbar,
        suspicious_window_count: 0,
        visible_window_count: visible_count,
    })
}

struct InternedAtoms {
    net_client_list: u32,
    net_wm_state: u32,
    net_wm_state_above: u32,
    net_wm_state_fullscreen: u32,
    net_wm_state_skip_taskbar: u32,
}

impl InternedAtoms {
    fn intern<C: x11rb::connection::Connection>(conn: &C) -> Result<Self, &'static str> {
        use x11rb::protocol::xproto::ConnectionExt;
        fn intern_one<C: x11rb::connection::Connection>(
            conn: &C,
            name: &[u8],
        ) -> Result<u32, &'static str> {
            conn.intern_atom(false, name)
                .map_err(|_| "scanner_unavailable")?
                .reply()
                .map(|r| r.atom)
                .map_err(|_| "scanner_unavailable")
        }
        Ok(Self {
            net_client_list: intern_one(conn, b"_NET_CLIENT_LIST")?,
            net_wm_state: intern_one(conn, b"_NET_WM_STATE")?,
            net_wm_state_above: intern_one(conn, b"_NET_WM_STATE_ABOVE")?,
            net_wm_state_fullscreen: intern_one(conn, b"_NET_WM_STATE_FULLSCREEN")?,
            net_wm_state_skip_taskbar: intern_one(conn, b"_NET_WM_STATE_SKIP_TASKBAR")?,
        })
    }
}
