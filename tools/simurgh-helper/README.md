# simurgh-helper

**Countermeasure A — native display-affinity flag enumeration (Abedini, 2026 §VI-A).**

A small Swift agent that runs alongside the Simurgh browser session and reports any
on-screen window excluded from screen capture (`NSWindow.SharingType.none` /
display-affinity-protected) to the Simurgh server. Closes the §VI-C blind spot
that pure JavaScript focus monitoring cannot.

## Build

```bash
cd tools/simurgh-helper
make
```

Produces a single ~200 KB binary `simurgh-helper`. Requires the Xcode command-line
tools (`xcode-select --install`).

## Run

```bash
./simurgh-helper --session sess-XXXXXXXX
```

The `sess-XXXXXXXX` value is shown in the bottom-right of the Simurgh exam page
("session: sess-…"). Once running, the dashboard's **Display-Affinity Watch**
panel will turn green ("helper online") and any capture-invisible window will
appear in the panel within 2 seconds.

### Flags

| Flag           | Default                    | Meaning                                           |
|----------------|----------------------------|---------------------------------------------------|
| `--session`    | *(required)*               | Browser session ID to attach to                   |
| `--server`     | `http://localhost:3030`    | Simurgh server URL                                 |
| `--secret`     | *(required, or env var)*   | Shared secret (must match `SIMURGH_HELPER_SECRET`) |
| `--interval`   | `2000`                     | Scan interval in ms                               |
| `--verbose`    | off                        | Print every detected window                       |

## How it detects capture-invisible windows

The helper does **not** parse a private API or read kernel structures. It uses
two complementary public-API signals from Apple's ScreenCaptureKit (the same
framework Apple ships its own screen-capture tools on top of):

1. **Diff signal.** Enumerate every on-screen window with
   `CGWindowListCopyWindowInfo`, then ask `SCShareableContent` for every
   window the OS will surface to a capture pipeline. Any window present in
   the first list but missing from the second is *on-screen but uncapturable*.
   On some macOS versions, capture-excluded windows are filtered out of
   `SCShareableContent` entirely — the diff catches them.

2. **Probe signal.** For windows that DO appear in `SCShareableContent`,
   call `SCScreenshotManager.captureImage(contentFilter:configuration:)`
   (the supported replacement for `CGWindowListCreateImage`, which Apple
   obsoleted in macOS 15). A capture-excluded window returns a buffer of
   the right dimensions but with all-zero alpha. Five probe pixels are
   sampled per window — if every one is zero, the window is hostile.

A double-probe pass after a 50 ms settle filters transient SCK failures on
legitimate windows. Both passes run in parallel via Swift TaskGroups.

This implementation is verified live against the bundled
[`invisible-window-poc`](../invisible-window-poc/) — running the PoC while
the helper is attached produces a detection within 2 s and escalates the
next telemetry verdict to Critical.

## Permission

The first time you run the helper, macOS will ask you to grant **Screen
Recording** permission. You must allow this. Without it,
`SCShareableContent.excludingDesktopWindows(...)` throws and the helper
exits cleanly with a clear error pointing at System Settings.

## Privacy

The helper:

- Reads window metadata only: PID, owner name, layer, on-screen bounds.
- Reads exactly **five pixels** per window per scan interval, used only as a
  binary integrity probe (zero / non-zero alpha). Pixel values are not
  transmitted.
- Sends no keystroke, mouse, screen, or camera data anywhere.

The full body of every POST is visible in the helper source: `reportToServer`
in `main.swift`.

## Troubleshooting

- **All processes show as hostile** → you didn't grant Screen Recording
  permission. Open System Settings → Privacy & Security → Screen Recording,
  toggle the helper on, restart it.
- **`401 invalid_helper_secret`** → set `SIMURGH_HELPER_SECRET` in the
  server's `.env` and pass the same value via `--secret` to the helper.
- **The dashboard says "helper offline" even though the helper is running** →
  the helper sends one POST every 2 s; the server marks it offline after 8 s
  of silence. Check that the server URL passed to `--server` is reachable.
