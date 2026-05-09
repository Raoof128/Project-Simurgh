<div align="center">

# 🦅 Project Simurgh 

**Zero-Trust Integrity API for Autonomous Agents and High-Stakes Proctoring**

*Detecting UI-redressing and behavioral spoofing without relying on screen capture.*

[![Node](https://img.shields.io/badge/node-%E2%89%A520.0-1a1a1a?style=flat-square)](https://nodejs.org)
[![Claude](https://img.shields.io/badge/claude-sonnet--4--5-6b1a1a?style=flat-square)](https://docs.claude.com)
[![License](https://img.shields.io/badge/license-MIT-d6cfbe?style=flat-square)](#license)
[![Status](https://img.shields.io/badge/status-research%20demo-2f4a2a?style=flat-square)](#status)

**[Read the Disclosure Paper →](https://raoufabedini.dev/projects/invisible-window-research)**

<br/>

![Simurgh — Live Dashboard View](docs/screenshot.png)

</div>

---

## The Core Philosophy

In Persian mythology, the Simurgh is the ultimate protector of pure knowledge—an entity composed of thirty distinct birds acting as one. 

**Project Simurgh** applies this principle to AI and enterprise safety. As frontier models gain "Computer Use" capabilities, they implicitly trust the visual UI. The research paper **The Invisible Window** formalizes a structural vulnerability in this assumption. Project Simurgh serves as a decentralized "Shield of Shields," designed to restore ground-truth integrity to browser and OS environments by validating behavioral intent rather than visual output.

---

## Table of Contents

1. [The Threat: The Invisible Window](#1-the-threat-the-invisible-window)
2. [The Simurgh Engine](#2-the-simurgh-engine)
3. [Architecture](#3-architecture)
4. [Socio-Economic Impact & Democratic Access](#4-socio-economic-impact--democratic-access)
5. [Quick Start](#5-quick-start)
6. [API Reference](#6-api-reference)
7. [Cost & Latency](#7-cost--latency)
8. [Why Anthropic?](#8-why-anthropic)
9. [Strategic Roadmap](#9-strategic-roadmap)
10. [Status & License](#10-status--license)

---

## 1. The Threat: The Invisible Window

A 2026 disclosure (Abedini, *The Invisible Window: Exploiting OS-Level Display Affinity to Bypass WebRTC Proctoring Systems*) formalized an attack class against browser-based proctoring and AI UI-vision. 

The attack utilizes documented OS-level APIs—Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` and macOS `NSWindow.SharingType.none`—to render application windows that are fully visible to a physical operator but **produce zero pixels in any output of the W3C `getDisplayMedia()` capture API or AI vision pipelines**.

Consequently, visual verification at the browser layer is structurally broken. Whether mitigating academic dishonesty or preventing hostile overlays from tricking autonomous agents, the visual channel cannot be inherently trusted.

## 2. The Simurgh Engine

The active heuristic engine bypasses the visual channel entirely, evaluating the underlying behavioral footprint. Every five seconds, the client environment samples a **behavioral telemetry window**—a lightweight JSON payload containing:

- `keystrokes`, `chars_typed`, `effective_wpm`
- `focus_losses`, `time_off_window_ms`
- `pastes`, `paste_payload_chars`
- `max_idle_gap_ms`, `keydown_intervals_ms[]`

This telemetry is securely transmitted to a Node server, which interfaces with **Claude Sonnet 4.5** using a prompt-cached system prompt that encodes the threat model. 

> **Example:** If a screen recording appears pristine, yet telemetry reveals a 4-second focus loss followed by a 1,247-character paste, the visual feed is compromised. The Simurgh engine reliably identifies these discrepancies.

### Explicit Limitations & Countermeasures
The behavioral engine cannot natively detect click-through GPU overlays (e.g., Cluely), as they do not trigger focus-loss events. To address this, Simurgh deploys a native counterpart (`simurgh-helper`) that enumerates display-affinity flags directly at the OS level.

---

## 3. Architecture

```text
┌────────────────────────────┐                       ┌─────────────────────────────────────┐
│      Browser (Environment) │   POST /api/telemetry │      Node + Express server          │
│  ───────────────────────── │ ────────────────────► │  ─────────────────────────────────  │
│  • keystroke cadence       │       (every 5s)      │  • forwards window to Claude        │
│  • focus / blur events     │                       │  • prompt-cached system prompt      │
│  • signature waveform      │ ◄──────────────────── │  • HMAC-chain audit log             │
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

---

## 4. Socio-Economic Impact & Democratic Access

Current proctoring standards (CodeSignal, ProctorU, Examity) are built for the high-bandwidth elite. Project Simurgh intentionally disrupts this by prioritizing **Bandwidth-Inclusive Security**.

### Bridging the Digital Divide (Remote Access)
Traditional proctoring requires continuous, high-speed video streaming. This effectively excludes students in remote villages, developing nations, and rural regions (e.g., Regional Australia, the Global South) where bandwidth is a luxury. 
* **The Simurgh Edge:** By transmitting lightweight behavioral JSON (~2KB) instead of HD video, we allow a student in a remote village on a 3G connection to maintain the same "Integrity Rating" as a student in Silicon Valley.

### Privacy-as-Code vs. Privacy-as-Surveillance
Platforms like CodeSignal are increasingly criticized for invasive data collection. Simurgh’s "Zero-Visual" approach removes the psychological stress of being "watched," which research shows disproportionately affects neurodivergent and underprivileged students. 

### Institutional Dependency & Cost Reduction
By leveraging Anthropic’s prompt-caching, universities can reduce proctoring overhead by up to **85%**. This forces a shift: institutions stop paying for human "surveillance bots" and start depending on **Anthropic’s Integrity API**. It transforms safety from a recurring expense into a core infrastructure dependency.

---

## 5. Quick Start

### Prerequisites
- Node.js ≥ 20.0
- Anthropic API Key (for Claude integration)
- Xcode Command Line Tools (for building the macOS helper)

### Installation

```bash
git clone https://github.com/Raoof128/Simurgh.git
cd Simurgh
npm install
```

### Configuration
Create a `.env` file based on the provided example:
```bash
cp .env.example .env
```
Update `.env` with your API keys and generated secrets.

### Running the Server
```bash
npm start
```
The instructor dashboard will be accessible at `http://localhost:3030/instructor`.

### Building the Native Helper (macOS)
```bash
cd tools/simurgh-helper
make
./simurgh-helper --session <SESSION_ID> --server http://localhost:3030 --secret <YOUR_SECRET>
```

---

## 6. API Reference

### `POST /api/telemetry`
Ingests the 5-second behavioral telemetry window from the client.
- **Payload:** JSON blob containing `keystrokes`, `pastes`, `focus_losses`, etc.
- **Response:** `200 OK` with JSON `{ risk_level: "Safe|Warning|Critical", reasoning: "..." }`

### `POST /api/affinity`
Receives native OS window metrics from the `simurgh-helper`.
- **Payload:** JSON array of capture-excluded windows.
- **Response:** `200 OK`

---

## 7. Cost & Latency

### Prompt Caching Economics
The system prompt encoding the threat model consists of ~700 tokens. As this prompt remains static across telemetry windows, Project Simurgh leverages Anthropic's `cache_control: { type: "ephemeral" }`. 

This guarantees that every subsequent window triggers a cache read—resulting in an approximate **90% cost reduction**. Operating a continuous 60-minute session costs fractions of a cent, enabling enterprise-scale deployment.

### Latency
Telemetry evaluation occurs in real-time, with Claude API round-trips consistently resolving under 800ms, ensuring immediate intervention capabilities.

---

## 8. Why Anthropic?

Project Simurgh was architected with the same "Safety-First" DNA that defines Anthropic. While the broader industry races toward unconstrained agentic autonomy, Anthropic has consistently pioneered **Constitutional AI**—the principle that models must be helpful, honest, and harmless by design. 

I am seeking to cooperate with Anthropic because our values are technically and ethically aligned:

1. **Constitutional Integrity:** Just as Claude is guided by a constitution, Simurgh is guided by a commitment to **Privacy-as-Code**. We reject the invasive, high-bandwidth surveillance models of legacy proctoring platforms. We believe that security should never come at the cost of human dignity or privacy.
2. **Alignment on "Computer Use":** Anthropic’s leadership in agentic capabilities (Project Glasswing/Opus 4.x) creates the most critical frontier for UI safety. Simurgh is the natural defensive partner for this ecosystem, providing the "Visual Guardrails" necessary for autonomous agents to interact with the world safely.
3. **Democratizing Safety:** Anthropic's focus on ethical deployment matches my mission to bridge the digital divide. Together, we can ensure that a student in a remote village has access to the same high-integrity, low-bandwidth certification as a student in Silicon Valley.

Project Simurgh is more than a project; it is an invitation to cooperate on the next generation of the AI Integrity Layer.

---

## 9. Strategic Roadmap (2026 - 2027)

Project Simurgh is evolving from a vulnerability demonstration into a comprehensive, enterprise-grade Integrity API.

### Phase 1: Vulnerability Formalization (Current)
- [x] Document the "Invisible Window" exploit class.
- [x] Develop the Simurgh heuristic proof-of-concept environment.
- [x] Demonstrate cross-platform UI redressing blindspots (macOS, Windows, Linux).

### Phase 2: Autonomous Agent Hardening (Q3 - Q4 2026)
- [ ] Formalize the Heuristic Engine using advanced cluster compute.
- [ ] Red-team the heuristics against next-generation "Computer Use" agentic models.
- [ ] Publish the open-source Simurgh Integrity API draft for enterprise feedback.

### Phase 3: The Sovereign Shield (2027 Vision)
- [ ] Roll out the Integrity API as a mandatory safety dependency for academic proctoring and enterprise "Computer Use" agents.
- [ ] Establish hardened OS environments natively immune to cross-platform redressing.

### Phase 4: Privacy-Preserving Visuals (The "Code-Video" Layer)
- [ ] **Edge-to-Token Processing:** Moving beyond telemetry to localized vision. Instead of streaming video of a user's room to a server, Simurgh will process video *on the edge* and convert physical movement into **Behavioral Metadata**.
- [ ] **Pose-to-Code Translation:** Turning a webcam feed into a string of skeletal coordinates and gaze-vectors. The server never sees a photo of the student's home; it only sees a stream of "pose-tokens" that verify the human is present and focused. *(Requires Hardware-Rooted Attestation to prevent pose-token injection attacks).*
- [ ] **Zero-Knowledge Visuals:** Establishing a future where universities can prove a test was taken fairly without ever possessing a single pixel of the student's likeness.

---

## 10. Status & License

**Status:** Research prototype and technical demonstrator. Built as a functional counterpart to a published vulnerability disclosure. 

**License:** MIT © 2026 Raouf Abedini — Securing foundational integrity for autonomous agent interactions.
