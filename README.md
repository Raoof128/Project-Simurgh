<div align="center">

# Verity

**A zero-trust behavioral AI exam proctor.**
Detects cheating without ever looking at the screen.

[![Node](https://img.shields.io/badge/node-%E2%89%A520.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![Claude](https://img.shields.io/badge/claude-sonnet--4--5-6b1a1a?style=flat-square)](https://docs.claude.com)
[![License](https://img.shields.io/badge/license-MIT-d6cfbe?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-research%20demo-2f4a2a?style=flat-square)](#status)

*A working counter-measure to the macOS 26 "Invisible Window" exam-proctor exploit.*

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

In 2026 a flaw was disclosed in macOS 26's screen-capture stack: a malicious application can render an **Invisible Window** that is fully visible to the user but absent from any feed produced by the W3C `getDisplayMedia()` API. Browser-based proctoring tools — which rely on that API to record the candidate's screen — cannot see the window. ChatGPT, lecture notes, a teammate's Zoom — anything painted into that overlay is a free pass.

Visual proctoring at the browser layer is therefore broken, and patching it requires changes inside the OS compositor's trust boundary. Schools cannot wait.

**Verity is a working mitigation that ignores the visual channel entirely.** Instead of asking *"what is on the screen?"* it asks *"how is the human behaving?"* — a question whose evidence (keystroke cadence, focus events, paste payloads) lives inside the browser, beneath the exploit's reach.

> If a student's screen recording looks pristine but their telemetry shows a 20-second tab-out followed by a 1,400-character paste, the screen recording is the lie. Verity catches the lie.

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
# PORT=3030                  (optional, default 3030)
# VERITY_DEMO_MODE=0          (set to 1 to force local heuristic)

npm install
npm start
```

### Scripts

| Command         | What it does                                   |
|-----------------|------------------------------------------------|
| `npm start`     | Run the production server                      |
| `npm run dev`   | Run with `node --watch` (auto-reload on save)  |

## Architecture

```
┌────────────────────────────┐                       ┌─────────────────────────────────────┐
│      Browser (student)     │   POST /api/telemetry │      Node + Express server          │
│  ─────────────────────────  │ ────────────────────► │  ─────────────────────────────────  │
│  • keystroke cadence        │       (every 5s)      │  • forwards JSON window to Claude   │
│  • focus / blur events      │                       │  • prompt-cached system prompt      │
│  • paste size (NOT content) │                       │  • parses strict JSON response      │
│  • idle gaps                │ ◄──────────────────── │  • persists per-session history     │
│                             │   200 OK { verdict }  │  • falls back to local heuristic    │
│  Live signature waveform    │                       │    on API failure (low credit, etc) │
│  Live verdict + history     │                       │                                     │
└────────────────────────────┘                       └──────────────────┬──────────────────┘
                                                                        │
                                                                        ▼
                                                          ┌────────────────────────────┐
                                                          │  Claude Sonnet 4.5         │
                                                          │  + cached system prompt    │
                                                          │  → JSON risk verdict       │
                                                          └────────────────────────────┘
```

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

Return the latest verdict and rolling history (max 50) for a session.

```json
{
  "latest": { "...verdict..." },
  "history": [ "...verdict...", "...verdict..." ]
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
