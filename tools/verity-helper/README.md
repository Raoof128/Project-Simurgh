# verity-helper

**Countermeasure A — native display-affinity flag enumeration (Abedini, 2026 §VI-A).**

A small Swift agent that runs alongside the Verity browser session and reports any
on-screen window excluded from screen capture (`NSWindow.SharingType.none` /
display-affinity-protected) to the Verity server. Closes the §VI-C blind spot
that pure JavaScript focus monitoring cannot.

## Build

```bash
cd tools/verity-helper
make
```

Produces a single ~200 KB binary `verity-helper`. Requires the Xcode command-line
tools (`xcode-select --install`).

## Run

```bash
./verity-helper --session sess-XXXXXXXX
```

The `sess-XXXXXXXX` value is shown in the bottom-right of the Verity exam page
("session: sess-…"). Once running, the dashboard's **Display-Affinity Watch**
panel will turn green ("helper online") and any capture-invisible window will
appear in the panel within 2 seconds.

### Flags

| Flag           | Default                    | Meaning                                           |
|----------------|----------------------------|---------------------------------------------------|
| `--session`    | *(required)*               | Browser session ID to attach to                   |
| `--server`     | `http://localhost:3030`    | Verity server URL                                 |
| `--secret`     | `verity-dev-helper`        | Shared secret (must match `VERITY_HELPER_SECRET`) |
| `--interval`   | `2000`                     | Scan interval in ms                               |
| `--verbose`    | off                        | Print every detected window                       |

## How it detects capture-invisible windows

The helper does **not** parse a private API or read kernel structures. For each
on-screen window enumerated by `CGWindowListCopyWindowInfo`, it captures a tiny
image of the window via `CGWindowListCreateImage` — the same API the disclosure
paper used (§V-C-1) to verify capture evasion on macOS 26. Five probe pixels
across the captured frame are read.

If the window has `sharingType = .none` (or any equivalent display-affinity flag),
all five pixels come back as zero alpha — the OS compositor renders the window
to the physical display but withholds the pixels from any capture pipeline.
That binary signal — *on-screen but uncapturable* — is the flag.

## Permission

The first time you run the helper, macOS will ask you to grant **Screen
Recording** permission. You must allow this. Without it,
`CGWindowListCreateImage` returns nothing for *every* window and you'll see
false positives.

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
- **`401 invalid_helper_secret`** → set `VERITY_HELPER_SECRET` in the
  server's `.env` and pass the same value via `--secret` to the helper.
- **The dashboard says "helper offline" even though the helper is running** →
  the helper sends one POST every 2 s; the server marks it offline after 8 s
  of silence. Check that the server URL passed to `--server` is reachable.
