# Table 3: Platform Capability Matrix

**Source:** Table III in main.tex, Section VI (Platform Implementations)
**Claims supported:** C03

| Platform      | Signal source                           | Impl.      | Validation                    | Known limitation                               |
| ------------- | --------------------------------------- | ---------- | ----------------------------- | ---------------------------------------------- |
| macOS         | `kCGWindowSharingState` (CoreGraphics)  | Swift      | Swift tests (8)               | SCKit adaptive path deferred to future stage   |
| Windows       | `WDA_MONITOR`, `WDA_EXCLUDEFROMCAPTURE` | .NET/Win32 | Real device (Win10 Pro 19045) | No kernel/GPU overlay visibility               |
| Linux X11     | Window-manager states (`_NET_WM_STATE`) | Rust/x11rb | CI + Xvfb                     | Real desktop validation pending                |
| Linux Wayland | Portal property metadata only           | Rust/D-Bus | Mock D-Bus + CI               | No surface/window enumeration                  |
| XWayland      | X11 bridge, XWayland `$DISPLAY`         | Rust/x11rb | CI                            | Partial coverage (`coverage=xwayland_partial`) |

**Important note on Linux X11:** The Linux X11 path reports window-manager metadata counts
(managed, override-redirect, above, fullscreen, skip-taskbar windows). It does NOT claim
Windows/macOS-style capture-exclusion detection. `capture_excluded_window_count` in a Linux
proof reflects these window-manager states, not a direct equivalent of `WDA_EXCLUDEFROMCAPTURE`.

**Code evidence:**

- macOS scanner: `AffinityScanner.swift:32` — `[.optionOnScreenOnly, .excludeDesktopElements]`
- Windows scanner: `AffinityScanResult.cs:11-13` — field names exactly as in table
- Linux X11: `tools/simurgh-daemon-linux/src/scanner/x11.rs`
- Linux Wayland: `tools/simurgh-daemon-linux/src/scanner/wayland.rs:86,100`
