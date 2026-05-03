# invisible-window-poc

A minimal reproducer for the **Invisible Window** attack class formalised in
Abedini, 2026 §IV-C.

> ⚠ **Responsible-use note.** This binary creates a window with
> `NSWindow.SharingType.none` — the documented macOS display-affinity flag
> that hides a window from screen capture while keeping it visible on the
> physical display. It carries the same dual-use posture as Section VII of
> the disclosure paper. **Use it only against your own copy of Verity, in a
> controlled environment, to verify the mitigation.** Do not use it during
> any real examination.

## Why it ships in this repo

A working mitigation is only credible if you can run the disclosed attack
against it. This binary lets you launch a real `sharingType = .none` overlay
in one terminal, run `verity-helper` in another, and watch the Verity
dashboard's Display-Affinity Watch flag the attack within ~2 seconds.

## Build

```bash
cd tools/invisible-window-poc
make
```

## Run

```bash
./invisible-window-poc
```

A window appears on the physical display reading *"INVISIBLE TO SCREEN
CAPTURE."* Take a screenshot of your screen with `⌘⇧4` — the window does
not appear in the screenshot.

### Hotkeys

| Key  | Action                                                                    |
|------|----------------------------------------------------------------------------|
| `⌘T` | Hide / show on the physical display (the window remains capture-invisible) |
| `⌘C` | Toggle click-through (`ignoresMouseEvents`) — demonstrates §VI-C blind spot |
| `⌘Q` | Quit                                                                      |

### Verifying the attack against Verity

1. In one terminal: `npm start` (Verity server)
2. Open `http://localhost:3030` in your browser, dismiss the intro
3. In another terminal: `cd tools/verity-helper && ./verity-helper --session sess-XXXXXXXX` (helper)
4. In a third terminal: `cd tools/invisible-window-poc && ./invisible-window-poc` (this PoC)

Within ~2 seconds the dashboard's Display-Affinity Watch panel flags the PoC's
window. The next 5-second verdict escalates to **Critical** with reasoning
*"Countermeasure A native helper flagged 1 capture-invisible window: invisible-window-poc."*

### Demonstrating the §VI-C click-through blind spot

Press `⌘C` to toggle click-through. The window stays visible but
`ignoresMouseEvents = true` — clicking through it does **not** trigger blur
on the exam tab. This is the residual evasion the paper names in §VI-C: pure
JavaScript focus monitoring (Verity's Countermeasure C) cannot detect this
case. Only the native helper (Countermeasure A) can.

## What it does NOT do

- It does not include or ship an LLM. The "cheat content" is a hard-coded
  example string about SYN floods.
- It does not exfiltrate, log, or transmit anything. It only renders a
  window.
- It is not weaponised. The window is plainly labelled "INVISIBLE TO SCREEN
  CAPTURE" and includes a citation to the disclosure paper. It is a demo.
