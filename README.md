<div align="center">

# Verity

**A zero-trust behavioral AI exam proctor.**
Detects cheating without ever looking at the screen.

[![Node](https://img.shields.io/badge/node-%E2%89%A520.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![Claude](https://img.shields.io/badge/claude-sonnet--4--5-6b1a1a?style=flat-square)](https://docs.claude.com)
[![License](https://img.shields.io/badge/license-MIT-d6cfbe?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-research%20demo-2f4a2a?style=flat-square)](#status)

*A working counter-measure to the "Invisible Window" exam-proctor attack class.*

**[Read the disclosure paper →](https://raoufabedini.dev/projects/invisible-window-research)**

<br/>

![Verity — live proctor view](docs/screenshot.png)

</div>

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [What Verity does (and what it deliberately doesn't)](#what-verity-does)
3. [Live demo](#live-demo)
4. [Quick start](#quick-start)
5. [Architecture](#architecture)
6. [Detection model](#detection-model)
7. [API reference](#api-reference)
8. [Cost & latency](#cost--latency)
9. [Privacy guarantees](#privacy-guarantees)
10. [Graceful degradation](#graceful-degradation)
11. [Project layout](#project-layout)
12. [Roadmap](#roadmap)
13. [License](#license)

---

## Why this exists

A 2026 disclosure (Abedini, *The Invisible Window: Exploiting OS-Level Display Affinity to Bypass WebRTC Proctoring Systems*) formalised an attack class against browser-based proctoring. The attack uses two **documented OS-level display-affinity APIs** — Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` and macOS `NSWindow.SharingType.none` — to render application windows that are fully visible on the physical display but **produce zero pixels in any output of the W3C `getDisplayMedia()` capture API**.

The paper demonstrates 100 % evasion across Windows 10/11 and macOS 14–26, including macOS 26 where the vector was previously assumed mitigated (§V, Table I). The paper formalises this as a **display-fidelity violation** between the browser capture API and the OS compositing pipeline (§III-B).

Visual proctoring at the browser layer is therefore structurally broken. Patching it requires changes inside the OS compositor's trust boundary, and schools cannot wait.

**Verity is a working implementation of Countermeasure C from §VI-C of the paper:** JavaScript-based behavioral monitoring (focus / blur / paste / cadence) augmented with an LLM fusion layer. It ignores the visual channel entirely and asks *"how is the human behaving?"* — a question whose evidence lives inside the browser, beneath the display-affinity exploit's reach.

> If a candidate's screen recording looks pristine but their telemetry shows a 4-second tab-out followed by a 1,247-character paste, the screen recording is the lie. Verity catches the lie.

## Mapping to the disclosure paper

Verity implements **Countermeasure C — Application Focus Monitoring** from §VI-C of the disclosure paper. The paper recommends pairing C with **Countermeasure A — Display Affinity Flag Enumeration** (§VI-A) as the *"most practical near-term defence"* (§VI-F). Verity is the JavaScript half of that pair; the native-agent half is on the [roadmap](#roadmap).

| Paper § | Countermeasure | Status in Verity |
|---------|---------------|------------------|
| **§VI-A** | **Display-affinity flag enumeration via native agent** | **✅ Implemented in [`tools/verity-helper`](tools/verity-helper/) (macOS Swift; Windows C# planned)** |
| §VI-B | Frame comparison with known state | ❌ Paper rates "Low feasibility" |
| **§VI-C** | **Application focus + paste monitoring** | **✅ Implemented (this repo)** |
| §VI-D | Hardware-rooted display attestation (TPM) | ❌ Paper rates "Very low feasibility" |
| §VI-E | OS-level capture integrity API | ❌ Requires Microsoft / Apple |

### What Verity catches (paper §V-C-2 confirms these signals leak)

- Focus loss when the candidate clicks an invisible window
- Paste / drop events — including the size of the payload
- Tab-out → paste workflow (the classic alt-tab pattern)
- Idle gap → paste with no manual edits
- Superhuman cadence (>250 effective WPM)

### What Verity **cannot** catch — explicit limitations from §VI-C

The disclosure paper itself names two evasions that defeat focus-monitoring approaches, and they apply to Verity verbatim:

1. **Click-through overlays.** A window using `WS_EX_TRANSPARENT` (Windows) or `ignoresMouseEvents` (macOS) — or a GPU-layer overlay like the one Cluely is reported to use (§VIII-F) — never receives focus, so the exam tab never blurs. Verity sees no anomaly.
2. **Read-don't-paste workflows.** A candidate who silently transcribes content from an invisible overlay (Variant A static notes, Interview Coder) generates no paste events and a human-cadence WPM. Verity cannot distinguish this from honest typing.

For these classes, the paper concludes (§VI-F) that you need Countermeasure A — a native agent enumerating display-affinity flags directly. **Verity is therefore a defense-in-depth layer, not a complete mitigation.** The honest framing in any presentation should be: *Verity is countermeasure C deployed as a working LLM-fusion prototype; it catches the unsophisticated attacker reliably, and the paper specifies exactly which sophisticated attackers it does not catch.*

## What Verity does

Every five seconds, the browser samples a tiny **behavioral telemetry window** — a JSON blob containing:

- `keystrokes`, `chars_typed`, `effective_wpm`
- `focus_losses`, `time_off_window_ms`
- `pastes`, `paste_payload_chars`
- `max_idle_gap_ms`, `keydown_intervals_ms[]`

The blob is POSTed to a Node server, which forwards it to **Claude Sonnet 4.5** (`claude-sonnet-4-5`) with a **prompt-cached system prompt** that encodes the threat model and detection rules. The model returns a strict JSON verdict:

```json
{ "risk_level": "Critical", "reasoning": "1247-char paste after 4.2s tab-out — classic alt-tab pattern" }
```

The proctor dashboard paints the verdict in real time alongside a live behavioral signature waveform, telemetry counters, and a rolling verdict history.

### What Verity deliberately does **not** do

- ❌ It does **not** capture the screen.
- ❌ It does **not** access the camera.
- ❌ It does **not** transmit keystroke **content** (only timing, focus, and paste **size** — not the bytes).
- ❌ It does **not** require a native agent or browser extension.

This is the entire pitch: a privacy-respecting, OS-independent, model-driven mitigation that survives an exploit no one else has patched yet.

## Live demo

```bash
git clone https://github.com/Raoof128/verity.git
cd verity
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm install
npm start
# → http://localhost:3030
```

The page loads with an **intro overlay** explaining the demo. Once dismissed, the **proctor panel** on the right is normally hidden from a real student — it is shown here for inspection.

To trigger a verdict on demand, use the **Demo Triggers** strip below the textarea:

| Button                   | Effect on the next 5-second window           |
|--------------------------|----------------------------------------------|
| `Simulate idle`          | Injects a 12-second idle gap                 |
| `Simulate tab-out`       | Injects 3 focus losses (4.2 s away)          |
| `Simulate big paste`     | Injects a 1,247-character paste payload      |

The behavioral signature waveform (the dark oscilloscope strip) draws keystroke cadence as a rolling 60-second trace. Verdicts drop tinted vertical bands onto it — **green** (Safe), **amber** (Warning), **oxblood** (Critical) — so the moment Verity catches something is *visible*, not buried in a log.

## Quick start

### Prerequisites

- Node.js ≥ 20
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Setup

```bash
cp .env.example .env
# .env
# ANTHROPIC_API_KEY=sk-ant-…
# PORT=3030                       (optional, default 3030)
# VERITY_DEMO_MODE=0               (set to 1 to force local heuristic)
# VERITY_HELPER_SECRET=…           (shared secret for the native helper)
# VERITY_AUDIT_SECRET=…            (HMAC key for the audit chain)

npm install
npm start
```

### Optional: build & run the native helper (Countermeasure A)

```bash
cd tools/verity-helper
make
./verity-helper --session sess-XXXXXXXX
# (sess-XXXXXXXX is the session id shown in the bottom-right of the exam page)
```

The first time you run the helper, macOS will ask for **Screen Recording**
permission — required, see [`tools/verity-helper/README.md`](tools/verity-helper/README.md).
Once it connects, the dashboard's Display-Affinity Watch panel turns green
("helper online"). Any window with `sharingType = .none` set on your machine
will appear in the panel within 2 seconds.

### Demo without the helper

Click **Arm Invisible Window** in the Demo Triggers strip. This posts a
simulated hostile-window event through the same `/api/affinity` endpoint the
real helper uses — a faithful preview of what running the helper alongside
Cluely or Interview Coder would look like in production.

### Optional: run the disclosed attack against your own mitigation

The repo also ships a minimal reproducer of the Invisible Window attack so you
can verify the mitigation against the real exploit:

```bash
cd tools/invisible-window-poc
make
./invisible-window-poc
```

A window appears on your physical display reading *"INVISIBLE TO SCREEN
CAPTURE."* Take a screenshot — the window is absent. While `verity-helper`
is running, the dashboard's Display-Affinity Watch flags the PoC within ~2 s
and the next verdict escalates to Critical. See
[`tools/invisible-window-poc/README.md`](tools/invisible-window-poc/README.md)
for the responsible-use note and the §VI-C click-through demonstration
(`⌘C` toggles `ignoresMouseEvents` to show the blind-spot path that defeats
pure JavaScript focus monitoring).

### Instructor view

The server exposes a multi-session live aggregator at
**[`/instructor`](http://localhost:3030/instructor)**. Real-time updates push
via Server-Sent Events the moment any session emits a verdict or any helper
detects a capture-invisible window. Each card shows: latest verdict + reasoning,
helper status, fidelity-deficit %, recent verdict counts. Useful both for
proctoring at scale and for showing an interviewer what a Verity *product*
looks like running across N candidates.

### Model tier (Sonnet vs. Haiku)

Set `VERITY_MODEL` in `.env`:

```bash
VERITY_MODEL=claude-haiku-4-5-20251001     # cost-sensitive deployment
VERITY_MODEL=claude-sonnet-4-5             # default — best calibration
```

The model name flows through to the live model chip in the header and to
`/api/meta`. Per-window inference cost on Haiku is roughly 5× lower than on
Sonnet at the cost of slightly more aggressive false positives — a useful
knob for institution-scale deployments.

### Scripts

| Command         | What it does                                   |
|-----------------|------------------------------------------------|
| `npm start`     | Run the production server                      |
| `npm run dev`   | Run with `node --watch` (auto-reload on save)  |

## Architecture

```
┌────────────────────────────┐                       ┌─────────────────────────────────────┐
│      Browser (candidate)   │   POST /api/telemetry │      Node + Express server          │
│  ─────────────────────────  │ ────────────────────► │  ─────────────────────────────────  │
│  • keystroke cadence        │       (every 5s)      │  • forwards window to Claude        │
│  • focus / blur events      │                       │  • prompt-cached system prompt      │
│  • paste size (NOT content) │                       │  • fuses A + C signals              │
│  • personal cadence baseline│ ◄──────────────────── │  • HMAC-chain audit log             │
│  • signature waveform       │   200 OK { verdict }  │  • graceful fallback heuristic      │
└────────────────────────────┘                       └──────────────────┬──────────────────┘
                                                                        │
                                                                        ▼
                                                          ┌────────────────────────────┐
                                                          │  Claude Sonnet 4.5         │
                                                          │  + cached system prompt    │
                                                          │  → JSON risk verdict       │
                                                          └────────────────────────────┘

┌────────────────────────────┐  POST /api/affinity   ┌─────────────────────────────────────┐
│  verity-helper (Swift)     │ ────────────────────► │  Affinity ingest                    │
│  Countermeasure A · §VI-A  │       (every 2s)      │  • secret-gated                     │
│  • CGWindowListCopyWindowInfo                      │  • escalates verdict to Critical    │
│  • CGWindowListCreateImage │                       │    when hostile windows present     │
│  • binary integrity probe  │                       │  • writes affinity transition to    │
│  • PID / owner / bounds    │                       │    HMAC audit chain                 │
└────────────────────────────┘                       └─────────────────────────────────────┘
```

The two layers run independently. The Verity demo works without the helper
(catches Variants A/B from the paper); attaching the helper closes the §VI-C
blind spot (Variants C and Cluely-class GPU-layer overlays).

### Why prompt caching matters here

The system prompt encoding the threat model is ~700 tokens and **does not change across windows**. Marking it `cache_control: { type: "ephemeral" }` means every subsequent window is a cache **read** — roughly 90 % cheaper than a cache write — for the entire duration of an exam.

For a 60-minute exam (12 windows / minute = 720 windows), this is the difference between a heuristic that costs cents per session and one that costs fractions of a cent.

## Detection model

The cached system prompt teaches Claude five behavioral patterns:

| Pattern                          | Risk level | Example signal                                         |
|----------------------------------|------------|--------------------------------------------------------|
| **Impossible cognitive cadence** | Critical   | 200+ char paste with negligible manual typing          |
| **Suspicious context switch**    | Critical   | Window blur followed by a large paste on refocus       |
| **Repeated tab-out**             | Warning →  | Many short blur/focus cycles in one window             |
| **Idle → paste**                 | Critical   | Long zero-input gap then paste with no manual edits    |
| **Normal studying**              | Safe       | Steady typing, brief focus loss to read a question     |

The model is asked to be **calibrated** — most windows are Safe; Critical is reserved for clear external assistance.

The local fallback heuristic in `server.js` mirrors these rules deterministically; see [Graceful degradation](#graceful-degradation).

## API reference

### `POST /api/telemetry`

Submit one 5-second telemetry window for analysis.

**Request body:**
```json
{
  "sessionId": "sess-3a8f29c1",
  "telemetry": {
    "keystrokes": 47,
    "chars_typed": 41,
    "effective_wpm": 56,
    "focus_losses": 0,
    "time_off_window_ms": 0,
    "pastes": 0,
    "paste_payload_chars": 0,
    "max_idle_gap_ms": 1820,
    "keydown_intervals_ms": [110, 142, 98, 165, 134],
    "window_seconds": 5.0
  }
}
```

**Response (200):**
```json
{
  "risk_level": "Safe",
  "reasoning": "steady typing cadence with one brief idle gap; no anomalies",
  "ts": 1746273612458,
  "source": "claude",
  "cache": { "creation": 0, "read": 712 }
}
```

| Field          | Meaning                                                          |
|----------------|------------------------------------------------------------------|
| `risk_level`   | `Safe` \| `Warning` \| `Critical`                                |
| `reasoning`    | One short sentence citing the specific signal (≤280 chars)       |
| `ts`           | Server timestamp (ms)                                            |
| `source`       | `claude` \| `fallback-low-credit` \| `fallback-error` \| `heuristic-fallback` |
| `cache.read`   | Prompt-cache tokens read this call (0 if fallback)               |
| `cache.creation` | Prompt-cache tokens written this call                          |

### `GET /api/dashboard/:sessionId`

Return the latest verdict, rolling history (max 50), and current affinity state.

```json
{
  "latest": { "...verdict..." },
  "history": [ "...verdict...", "...verdict..." ],
  "affinity": {
    "hostile": [{ "pid": 41892, "name": "Cluely Helper", "type": "sharingType=.none / capture-excluded", "since": 1746273612458 }],
    "lastHeartbeat": 1746273612458,
    "source": "verity-helper-mac/0.1"
  }
}
```

### `POST /api/affinity` *(helper → server)*

Ingest a Countermeasure A scan from the native helper. Requires the shared
secret in the `x-verity-helper-secret` header (configurable via
`VERITY_HELPER_SECRET`).

```json
{
  "sessionId": "sess-3a8f29c1",
  "helper": "verity-helper-mac/0.1",
  "hostile": [
    { "pid": 41892, "name": "Cluely Helper", "type": "sharingType=.none / capture-excluded", "since": 1746273612458 }
  ]
}
```

Empty `hostile` array signals "all clean — heartbeat only."

When the helper reports any hostile windows, the next verdict is **automatically
escalated to Critical** server-side (`server.js:persistVerdict`), regardless of
behavioral signal. This is the (A)+(C) fusion the paper recommends in §VI-F.

### `GET /api/audit/:sessionId`

Download a tamper-evident HMAC chain of every verdict and every affinity
transition for the session. Each entry is signed over its content plus the
previous entry's signature; modifying any entry invalidates every subsequent
signature. Verifies cryptographically against `VERITY_AUDIT_SECRET`.

```json
{
  "sessionId": "sess-3a8f29c1",
  "chain_terminator": "9a4f…",
  "entry_count": 142,
  "entries": [
    { "seq": 0, "ts": ..., "type": "verdict",  "payload": {...}, "prev": "GENESIS", "sig": "8b2c…" },
    { "seq": 1, "ts": ..., "type": "affinity", "payload": {...}, "prev": "8b2c…",   "sig": "f0e9…" }
  ]
}
```

## Cost & latency

| Metric                          | Approx. value                          |
|---------------------------------|----------------------------------------|
| System prompt size              | ~700 input tokens                      |
| Per-window user message         | ~120 input tokens                      |
| Per-window output               | ≤200 output tokens                     |
| Cache hit rate (after window 1) | **~90 %**                              |
| Per-window latency (p50)        | ~600–900 ms                            |
| Per-window cost (cached)        | < $0.001                               |
| 60-minute exam (720 windows)    | ≈ $0.30 / candidate                    |

> All numbers are illustrative; measure in your own environment with the cache pill rendered on each verdict card.

## Privacy guarantees

| What we **send** to the server          | What we **never** send |
|------------------------------------------|------------------------|
| Number of keystrokes                     | Keystroke contents (the bytes) |
| Number of pastes & paste **size**        | Paste contents         |
| Focus-loss count & duration              | Anything from the screen |
| Inter-keystroke timing intervals         | Camera or mic data     |
| Effective WPM                            | OS-level information   |

The frontend's integrity strip (`ZERO-TRUST ACTIVE · NO SCREEN CAPTURE · NO CAMERA · NO KEYSTROKE CONTENT`) is a contract, not just decoration: the JSON sent in `POST /api/telemetry` is the entire surface area of what leaves the browser.

## Graceful degradation

If the Anthropic API returns an error (low credit, network, rate limit), or `ANTHROPIC_API_KEY` is unset, the server **does not 500**. It falls through to a **local rule-based heuristic** (`localHeuristic` in `server.js`) that mirrors the system prompt's logic deterministically. The verdict is returned with `source: "fallback-low-credit"` (or similar) and the UI surfaces a small `⚙ local heuristic` badge in place of the cache pill — so an interviewer can immediately see the system gracefully degrading rather than wondering why the demo broke.

To force fallback mode for offline demos:

```bash
VERITY_DEMO_MODE=1 npm start
```

## Project layout

```
verity/
├── server.js                  # Express + Anthropic SDK + local fallback heuristic
├── public/
│   └── index.html             # Single-file frontend (no build step)
├── package.json
├── .env.example
└── README.md
```

The frontend is intentionally a single static HTML file — no Vite, no React, no build step. Open the file, read the source, ship it.

### Frontend highlights

- **Forensic Instrument** aesthetic: paper-white #f3efe6 background with a single oxblood signal color (`#6b1a1a`).
- **Behavioral signature waveform**: a 60-second rolling oscilloscope of keystroke cadence, with verdict bands tinted by risk level.
- **Stamp-in verdicts** with subtle rotation; Critical verdicts shake.
- **Demo trigger drawer** for hands-free interviewing.
- **System-prompt viewer** in the colophon — the actual cached prompt is one click away.
- Fully responsive, ARIA-live announcers, `prefers-reduced-motion` honored, iOS safe-area aware.

## Roadmap

### Closing the gap to the paper's full recommendation

- [x] **Countermeasure A — macOS native helper (paper §VI-A).**
      Implemented in [`tools/verity-helper`](tools/verity-helper/) using
      `CGWindowListCopyWindowInfo` + `CGWindowListCreateImage` integrity probe.
      Reports any window with `sharingType = .none` to the server every 2 s;
      the next verdict is escalated to Critical server-side.
- [x] **Personal cadence baseline.** First 60 s of typing → personal mean + σ
      over inter-key intervals. Subsequent windows are scored against the
      candidate's own cadence, not a population baseline.
- [x] **Tamper-evident audit log.** HMAC-SHA256 chain over every verdict + every
      affinity transition. Downloadable from the dashboard.
- [x] **"Too clean" UI escalator.** Substantive typing with zero anomalies for an
      extended window now emits a Warning citing the §VI-C blind spot.
- [x] **Pixel-forensic mode.** Helper computes per-frame display-fidelity deficit
      (`Σ(rect.width × rect.height)` for capture-excluded windows ÷ display pixels).
      Surfaced as a live gauge in the Display-Affinity Watch panel — visualises
      the §III-B trust-boundary violation in pixels.
- [x] **Disclosed-attack reproducer.** [`tools/invisible-window-poc`](tools/invisible-window-poc/)
      ships a minimal Swift binary that creates an `NSWindow.SharingType.none`
      overlay so the mitigation can be verified against the real attack.
- [x] **Instructor view.** Multi-session live aggregator at `/instructor`
      with SSE push for real-time verdict + affinity events.
- [x] **Haiku tier.** `VERITY_MODEL` env var; model flows through to the UI.
- [ ] **Windows native helper.** Equivalent agent calling
      `GetWindowDisplayAffinity` on every top-level window enumerated through
      `EnumWindows`. The paper names this as the *most immediately effective*
      countermeasure on Windows.
- [ ] **Cross-platform PoC.** Windows equivalent of `tools/invisible-window-poc`
      using `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` from §IV-B.

### Beyond the paper

- [ ] WebSocket transport for sub-100ms verdict latency
- [ ] Per-candidate baseline calibration (first 60s = personal cadence)
- [ ] Multi-question exam flow with question-level verdicts
- [ ] Instructor dashboard aggregating live sessions
- [ ] Hardware key-cadence biometrics (`KeyboardEvent.code` n-grams)
- [ ] Local model option (Claude Haiku for cost-sensitive deployments)
- [ ] Audit log export (signed, tamper-evident)

## Status

Research demo. Built as a working counterpart to a published vulnerability disclosure. Not currently deployed in any production setting; no warranty.

## License

MIT © 2026 Raouf — see [LICENSE](#) for full text.

---

<div align="center">

Verity is a behavioral mitigation, not a panacea. The right defense against
exam fraud is good test design; the second-best defense is layered evidence.
This is one such layer.

</div>
