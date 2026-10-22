# invisible-window-poc

**Historical platform fixture.** Capture behavior depends on the macOS version and capture
API. The helper/dashboard demonstration below is historical: current `/api/affinity` routes
return HTTP 410. A label on the window or this fixture's existence is not evidence of present
capture exclusion or reliable detection. Use an owned test machine and record actual observations.
See [current platform validation limits](../../docs/INTEGRATIONS.md).

A minimal reproducer for the **Invisible Window** attack class formalised in
Abedini, 2026 §IV-C.

> ⚠ **Responsible-use note.** This binary creates a window with
> `NSWindow.SharingType.none` — the documented macOS display-affinity flag
> used in the historical capture-exclusion experiment. Its behavior depends on the OS
> version and capture API; verify it on the test machine. It carries the same dual-use posture as Section VII of
> the disclosure paper. **Use it only against your own copy of Simurgh, in a
> controlled environment, to verify the mitigation.** Do not use it during
> any real examination.

## Why it ships in this repo

A working mitigation is only credible if you can run the disclosed attack
against it. This binary creates a `sharingType = .none` overlay for an owned-device experiment.
The original helper/dashboard integration is retired; the fixture remains useful for comparing
physical display and capture observations under a declared OS/API configuration.

## Build

```bash
cd tools/invisible-window-poc
make
```

## Run

```bash
./invisible-window-poc
```

A window appears on the physical display reading _"INVISIBLE TO SCREEN
CAPTURE."_ Compare the physical display with an owned test capture and record whether
the window appears. The label is fixture text, not proof of exclusion on the current OS.

### Hotkeys

| Key  | Action                                                                      |
| ---- | --------------------------------------------------------------------------- |
| `⌘T` | Hide / show the window; capture exclusion remains OS/API-dependent          |
| `⌘C` | Toggle click-through (`ignoresMouseEvents`) — demonstrates §VI-C blind spot |
| `⌘Q` | Quit                                                                        |

### Reproducing the historical observation

The old `npm start` + `simurgh-helper` demonstration no longer works against the current
server because `/api/affinity` returns HTTP 410. Consult the original tagged evidence for
that historical result. For a new measurement, record OS version, capture method, permission
state and the actual observed result. Do not infer successful detection from a compiled fixture.

### Demonstrating the §VI-C click-through blind spot

Press `⌘C` to toggle click-through. The window stays visible but
`ignoresMouseEvents = true` — clicking through it does **not** trigger blur
on the exam tab. This is the residual evasion the paper names in §VI-C: pure
JavaScript focus monitoring (Simurgh's Countermeasure C) cannot detect this
case. Native observations require separate validation; browser focus telemetry alone cannot establish
visibility of every overlay.

## What it does NOT do

- It does not include or ship an LLM. The "cheat content" is a hard-coded
  example string about SYN floods.
- It makes no network requests and does not collect exam content. It renders a window
  and prints local status messages, including the native window number and click-through state.
- It is not weaponised. The window is plainly labelled "INVISIBLE TO SCREEN
  CAPTURE" and includes a citation to the disclosure paper. It is a demo.
