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
4. [Quick Start](#4-quick-start)
5. [API Reference](#5-api-reference)
6. [Cost & Latency](#6-cost--latency)
7. [Strategic Roadmap](#7-strategic-roadmap)
8. [Status & License](#8-status--license)

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

## 4. Quick Start

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

## 5. API Reference

### `POST /api/telemetry`
Ingests the 5-second behavioral telemetry window from the client.
- **Payload:** JSON blob containing `keystrokes`, `pastes`, `focus_losses`, etc.
- **Response:** `200 OK` with JSON `{ risk_level: "Safe|Warning|Critical", reasoning: "..." }`

### `POST /api/affinity`
Receives native OS window metrics from the `simurgh-helper`.
- **Payload:** JSON array of capture-excluded windows.
- **Response:** `200 OK`

---

## 6. Cost & Latency

### Prompt Caching Economics
The system prompt encoding the threat model consists of ~700 tokens. As this prompt remains static across telemetry windows, Project Simurgh leverages Anthropic's `cache_control: { type: "ephemeral" }`. 

This guarantees that every subsequent window triggers a cache read—resulting in an approximate **90% cost reduction**. Operating a continuous 60-minute session costs fractions of a cent, enabling enterprise-scale deployment.

### Latency
Telemetry evaluation occurs in real-time, with Claude API round-trips consistently resolving under 800ms, ensuring immediate intervention capabilities.

---

## 7. Strategic Roadmap (2026 - 2027)

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

---

## 8. Status & License

**Status:** Research prototype and technical demonstrator. Built as a functional counterpart to a published vulnerability disclosure. 

**License:** MIT © 2026 Raouf Abedini — Securing foundational integrity for autonomous agent interactions.
