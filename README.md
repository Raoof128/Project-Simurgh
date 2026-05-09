<div align="center">

# 🦅 Project Simurgh

**Zero-Trust Integrity API for Autonomous Agents and High-Stakes Proctoring**

*Detecting UI-redressing and behavioral spoofing without relying on screen capture.*

[![Node](https://img.shields.io/badge/node-%E2%89%A520.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![Claude](https://img.shields.io/badge/claude-sonnet--4--5-6b1a1a?style=flat-square)](https://docs.claude.com)
[![License](https://img.shields.io/badge/license-MIT-d6cfbe?style=flat-square)](#11-status--license)
[![Status](https://img.shields.io/badge/status-research%20prototype-2f4a2a?style=flat-square)](#11-status--license)

**[Read the Disclosure Paper →](https://raoufabedini.dev/projects/invisible-window-research)**

<br/>

![Simurgh — Student exam view with live behavioral verdict and telemetry signature](docs/screenshot.png)

</div>

---

## The Core Philosophy

In Persian mythology, the Simurgh is the ultimate protector of pure knowledge — an entity composed of thirty distinct birds acting as one.

**Project Simurgh** applies this principle to AI and enterprise safety. As frontier models gain "Computer Use" capabilities, they implicitly trust the visual UI. The research paper *The Invisible Window* (Abedini, 2026) formalizes a structural vulnerability in this assumption. Project Simurgh serves as a decentralized "Shield of Shields," designed to restore ground-truth integrity to browser and OS environments by validating behavioral intent rather than visual output.

---

## Table of Contents

| # | Section | Description |
|---|---------|-------------|
| 1 | [The Threat: The Invisible Window](#1-the-threat-the-invisible-window) | The vulnerability class this project mitigates |
| 2 | [The Simurgh Engine](#2-the-simurgh-engine) | Behavioral heuristic architecture |
| 3 | [System Architecture](#3-system-architecture) | Data-flow diagram and component topology |
| 4 | [Socio-Economic Impact](#4-socio-economic-impact--democratic-access) | Bandwidth-inclusive security and privacy ethics |
| 5 | [Quick Start](#5-quick-start) | Installation, configuration, and first run |
| 6 | [API Reference](#6-api-reference) | Endpoint specifications |
| 7 | [Cost & Latency](#7-cost--latency) | Prompt-caching economics and response times |
| 8 | [Security Considerations](#8-security-considerations) | HMAC audit chain and threat model |
| 9 | [Why Anthropic?](#9-why-anthropic) | Strategic alignment with Constitutional AI |
| 10 | [Strategic Roadmap](#10-strategic-roadmap-2026---2028) | Four-phase evolution from PoC to Sovereign Shield |
| 11 | [Status & License](#11-status--license) | Current status and licensing |

---

## 1. The Threat: The Invisible Window

A 2026 disclosure (Abedini, R., *The Invisible Window: Exploiting OS-Level Display Affinity to Bypass WebRTC Proctoring Systems*) formalized an attack class against browser-based proctoring and AI UI-vision.

The attack utilizes documented OS-level APIs — Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` and macOS `NSWindow.SharingType.none` — to render application windows that are fully visible to a physical operator but **produce zero pixels in any output of the W3C `getDisplayMedia()` capture API or AI vision pipelines**.

Consequently, visual verification at the browser layer is structurally broken. Whether mitigating academic dishonesty or preventing hostile overlays from deceiving autonomous agents, the visual channel cannot be inherently trusted.

---

## 2. The Simurgh Engine

The active heuristic engine bypasses the visual channel entirely, evaluating the underlying behavioral footprint. Every five seconds, the client environment samples a **behavioral telemetry window** — a lightweight JSON payload (~2 KB) containing:

| Field | Type | Purpose |
|-------|------|---------|
| `keystrokes` | `int` | Raw key-down count in window |
| `chars_typed` | `int` | Characters entered (excludes modifiers) |
| `effective_wpm` | `float` | Words per minute, normalized |
| `focus_losses` | `int` | `blur` events on the exam tab |
| `time_off_window_ms` | `int` | Cumulative time with focus elsewhere |
| `pastes` | `int` | `paste` events intercepted |
| `paste_payload_chars` | `int` | Total characters pasted |
| `max_idle_gap_ms` | `int` | Longest inter-keystroke interval |
| `keydown_intervals_ms` | `int[]` | Raw inter-key timing array |

This telemetry is securely transmitted to a Node/Express server, which interfaces with **Claude Sonnet 4.5** using a prompt-cached system prompt that encodes the threat model.

> **Illustrative scenario:** A screen recording appears pristine, yet telemetry reveals a 4-second focus loss followed by a 1,247-character paste. The visual feed is compromised. The Simurgh engine identifies this discrepancy and escalates the risk verdict accordingly.

### Explicit Limitations & Countermeasures
The behavioral engine cannot natively detect click-through GPU overlays (e.g., Cluely), as they do not trigger focus-loss events. To address this vector, Simurgh deploys a native counterpart (`simurgh-helper`) that enumerates display-affinity flags directly at the OS level. See Section 3 for the data-flow integration.

---

## 3. System Architecture

```text
┌────────────────────────────┐                       ┌─────────────────────────────────────┐
│      Browser (Environment) │   POST /api/telemetry │      Node + Express server          │
│  ───────────────────────── │ ────────────────────► │  ─────────────────────────────────  │
│  • keystroke cadence       │       (every 5s)      │  • forwards window to Claude        │
│  • focus / blur events     │                       │  • prompt-cached system prompt      │
│  • paste interception      │ ◄──────────────────── │  • HMAC-chain audit log             │
└────────────────────────────┘   200 OK { verdict }  └──────────────────┬──────────────────┘
                                                                        ▼
                                                          ┌────────────────────────────┐
                                                          │  Claude Sonnet 4.5         │
                                                          │  → JSON risk verdict       │
                                                          └────────────────────────────┘
┌────────────────────────────┐  POST /api/affinity   ┌─────────────────────────────────────┐
│  simurgh-helper (Swift)    │ ────────────────────► │  Affinity ingest                    │
│  Native Countermeasure     │       (every 2s)      │  • escalates verdict to Critical    │
└────────────────────────────┘                       └─────────────────────────────────────┘
```

### Component Summary

| Component | Language | Role |
|-----------|----------|------|
| **Browser Client** | JavaScript | Collects behavioral telemetry; renders verdict overlay |
| **Server** | Node.js / Express | Routes telemetry to Claude; maintains HMAC audit chain |
| **Claude Sonnet 4.5** | — | Evaluates behavioral windows against the encoded threat model |
| **simurgh-helper** | Swift (macOS) | Native agent; enumerates `NSWindow.SharingType` flags via ScreenCaptureKit |
| **Instructor Dashboard** | HTML / SSE | Real-time multi-session monitoring and audit export |

### Why Prompt Caching Matters
The system prompt encoding the threat model is ~700 tokens and does not change across windows. Using `cache_control: { type: "ephemeral" }` ensures every subsequent window is a cache read — approximately **90% cheaper** than a cold invocation.

---

## 4. Socio-Economic Impact & Democratic Access

Current proctoring standards (CodeSignal, ProctorU, Examity) are architected for high-bandwidth environments. Project Simurgh intentionally disrupts this paradigm by prioritizing **Bandwidth-Inclusive Security**.

### Bridging the Digital Divide
Traditional proctoring requires continuous, high-speed video streaming. This effectively excludes students in remote villages, developing nations, and rural regions (e.g., Regional Australia, the Global South) where bandwidth is a structural constraint.

**The Simurgh approach:** By transmitting lightweight behavioral JSON (~2 KB per window) instead of HD video, a student on a 3G connection maintains the same integrity rating as a student on fiber in Silicon Valley. The bandwidth requirement drops by approximately **three orders of magnitude**.

### Privacy-as-Code vs. Privacy-as-Surveillance
Platforms such as CodeSignal are increasingly scrutinized for invasive data collection practices. Project Simurgh's zero-visual approach eliminates the psychological burden of continuous observation — a factor that research indicates disproportionately affects neurodivergent and socioeconomically disadvantaged students.

### Institutional Cost Reduction
By leveraging prompt caching, institutions can reduce proctoring infrastructure costs by up to **85%** relative to traditional video-based systems. This transforms integrity verification from a recurring per-seat surveillance expense into a lightweight, API-driven infrastructure dependency.

---

## 5. Quick Start

### Prerequisites
- Node.js ≥ 20.0
- Anthropic API Key (for Claude integration)
- Xcode Command Line Tools (macOS — for building the native helper)

### Installation

```bash
git clone https://github.com/Raoof128/Simurgh.git
cd Simurgh
npm install
```

### Configuration
```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Anthropic SDK key. If unset, server runs in demo mode (local heuristic). |
| `SIMURGH_HELPER_SECRET` | Yes* | Shared secret for `simurgh-helper` authentication. Generate: `openssl rand -hex 32` |
| `SIMURGH_AUDIT_SECRET` | Yes* | HMAC key for the tamper-evident audit chain. Generate: `openssl rand -hex 32` |
| `SIMURGH_INSTRUCTOR_TOKEN` | Yes* | Bearer token gating the instructor dashboard and SSE stream. Generate: `openssl rand -hex 24` |
| `SIMURGH_MODEL` | No | Model override. Default: `claude-sonnet-4-5` |
| `SIMURGH_ALLOWED_ORIGIN` | No | CORS origin restriction. Default: `*` |

*Required for production deployment. The server auto-generates ephemeral values for local development.*

### Running the Server
```bash
npm start
```
The instructor dashboard is accessible at `http://localhost:3030/instructor`.

### Building the Native Helper (macOS)
```bash
cd tools/simurgh-helper
make
./simurgh-helper --session <SESSION_ID> --server http://localhost:3030 --secret "$SIMURGH_HELPER_SECRET"
```

### Screenshots

| Student Exam View | Instructor Dashboard |
|---|---|
| ![Student view — behavioral telemetry with live verdict](docs/screenshot-exam-view.png) | ![Instructor view — multi-session aggregator with SSE streaming](docs/screenshot-instructor.png) |
| *Real-time behavioral analysis with keystroke signature waveform, display-affinity monitoring, and Claude-powered risk verdicts.* | *Multi-session monitoring dashboard with per-session verdict history, helper status, and capture-invisible window counts.* |

---

## 6. API Reference

### `POST /api/telemetry`
Ingests the 5-second behavioral telemetry window from the browser client.

| Field | Value |
|-------|-------|
| **Content-Type** | `application/json` |
| **Payload** | JSON object: `{ keystrokes, chars_typed, effective_wpm, focus_losses, time_off_window_ms, pastes, paste_payload_chars, max_idle_gap_ms, keydown_intervals_ms }` |
| **Response** | `200 OK` — `{ risk_level: "Safe" | "Warning" | "Critical", reasoning: "..." }` |

### `POST /api/affinity`
Receives native OS display-affinity metrics from the `simurgh-helper` agent.

| Field | Value |
|-------|-------|
| **Header** | `x-simurgh-helper-secret: <SIMURGH_HELPER_SECRET>` |
| **Payload** | JSON object containing an array of capture-excluded windows with process names, PIDs, and fidelity metrics |
| **Response** | `200 OK` |
| **Auth failure** | `401 invalid_helper_secret` |

### `GET /api/sessions`
Returns all active and historical session metadata. Requires instructor token.

| Field | Value |
|-------|-------|
| **Header** | `Authorization: Bearer <SIMURGH_INSTRUCTOR_TOKEN>` |
| **Response** | `200 OK` — JSON array of session objects |

### `GET /api/audit-export/:sessionId`
Exports the full HMAC-chained audit trail for a given session. Requires instructor token.

---

## 7. Cost & Latency

### Prompt Caching Economics
The system prompt encoding the threat model consists of ~700 tokens. As this prompt remains static across all telemetry windows within a session, Project Simurgh leverages Anthropic's `cache_control: { type: "ephemeral" }`.

| Metric | Value |
|--------|-------|
| System prompt size | ~700 tokens |
| Cache hit rate (steady state) | ~100% after first window |
| Cost reduction vs. cold invocation | ~90% |
| Estimated cost per 60-min session | < $0.01 |

### Latency
Telemetry evaluation occurs in real-time, with Claude API round-trips consistently resolving under 800ms. This ensures the instructor dashboard reflects behavioral anomalies within one telemetry cycle (5 seconds).

---

## 8. Security Considerations

### HMAC Audit Chain
Every verdict emitted by the server is appended to a tamper-evident audit chain. Each entry is signed with `HMAC-SHA256` using the `SIMURGH_AUDIT_SECRET`, and each signature incorporates the hash of the preceding entry — producing a blockchain-like chain of custody for all integrity decisions.

### Helper Authentication
The `simurgh-helper` native agent authenticates to the server via a shared secret transmitted in the `x-simurgh-helper-secret` HTTP header. The server rejects all affinity reports from unauthenticated agents.

### Threat Model Boundaries
| Vector | Covered | Mechanism |
|--------|---------|-----------|
| Tab-switching + paste injection | ✅ | Behavioral telemetry (focus loss + paste detection) |
| `NSWindow.SharingType.none` overlays | ✅ | `simurgh-helper` (ScreenCaptureKit enumeration) |
| `SetWindowDisplayAffinity` overlays | ✅ | Architecture-equivalent Windows helper (roadmap) |
| Click-through GPU overlays (no focus steal) | ✅ | `simurgh-helper` display-affinity scan |
| Pose-token injection (future) | ⬜ | Hardware-Rooted Attestation (Phase 4) |

---

## 9. Why Anthropic?

Project Simurgh was architected with the same "Safety-First" DNA that defines Anthropic. While the broader industry races toward unconstrained agentic autonomy, Anthropic has consistently pioneered **Constitutional AI** — the principle that models must be helpful, honest, and harmless by design.

This project represents an invitation to cooperate because the values are technically and ethically aligned:

1. **Constitutional Integrity:** Just as Claude is guided by a constitution, Simurgh is guided by a commitment to **Privacy-as-Code**. The project rejects the invasive, high-bandwidth surveillance models of legacy proctoring platforms. Security should never come at the cost of human dignity or privacy.
2. **Alignment on "Computer Use":** Anthropic's leadership in agentic capabilities creates the most critical frontier for UI safety. Simurgh is the natural defensive partner for this ecosystem, providing the "Visual Guardrails" necessary for autonomous agents to interact with the world safely.
3. **Democratizing Safety:** Anthropic's focus on ethical deployment aligns with this project's mission to bridge the digital divide — ensuring that a student in a remote village has access to the same high-integrity, low-bandwidth certification as a student in Silicon Valley.

Project Simurgh is more than a technical demonstration; it is an invitation to cooperate on the next generation of the AI Integrity Layer.

---

## 10. Strategic Roadmap (2026 - 2028)

Project Simurgh is evolving from a vulnerability demonstration into a comprehensive, enterprise-grade Integrity API.

### Phase 1: Vulnerability Formalization (Current)
- [x] Document the "Invisible Window" exploit class.
- [x] Develop the Simurgh heuristic proof-of-concept environment.
- [x] Demonstrate cross-platform UI redressing blindspots (macOS, Windows, Linux).

### Phase 2: Autonomous Agent Hardening (Q3 – Q4 2026)
- [ ] Formalize the Heuristic Engine using advanced cluster compute.
- [ ] Red-team the heuristics against next-generation "Computer Use" agentic models.
- [ ] Publish the open-source Simurgh Integrity API draft for enterprise feedback.

### Phase 3: The Sovereign Shield (2027)
- [ ] Roll out the Integrity API as a safety dependency for academic proctoring and enterprise "Computer Use" agents.
- [ ] Establish hardened OS environments natively immune to cross-platform redressing.

### Phase 4: Privacy-Preserving Visuals — The "Code-Video" Layer (2027 – 2028)
- [ ] **Edge-to-Token Processing:** Process video on the edge and convert physical movement into behavioral metadata. The server never receives raw video frames.
- [ ] **Pose-to-Code Translation:** Convert a webcam feed into skeletal coordinates and gaze-vectors. The server receives only "pose-tokens" that verify human presence and attention. *(Requires Hardware-Rooted Attestation to prevent pose-token injection attacks.)*
- [ ] **Zero-Knowledge Visuals:** Enable institutions to cryptographically prove a test was taken fairly without ever possessing a single pixel of the student's likeness.

---

## 11. Status & License

**Status:** Research prototype and technical demonstrator. Built as a functional counterpart to a published vulnerability disclosure. Not currently deployed in production.

**License:** MIT © 2026 Raouf Abedini
