# Simurgh Paper Design Spec
**Date:** 2026-05-21  
**Status:** Approved by Raouf — proceeding to implementation

---

## Title
**Primary:** Project Simurgh: Privacy-Preserving Device Integrity Proofs for Capture-Resistant High-Stakes Sessions

## Venue
IEEE conference format (same as Invisible Window paper). arXiv/TechRxiv preprint first.

## Paper Type
Systems security / defence paper. Companion to the Invisible Window paper (attack paper). Can be read standalone.

## Thesis
Project Simurgh replaces screen-capture-based trust with signed, privacy-preserving device integrity proofs for high-stakes AI-mediated and proctoring sessions.

## Four Contributions
1. Privacy-preserving integrity architecture replacing visual surveillance with signed metadata-only proofs.
2. Cross-platform research prototype: browser telemetry + Node.js verifier + localhost daemons (macOS/Windows/Linux).
3. OS-level display-affinity risk detection via native metadata scanners without collecting screen pixels, typed content, pasted content, audio, webcam frames, raw process names, or raw window titles.
4. Evaluation via unit tests, smoke tests, security audits, privacy audits, real Windows validation, and Linux CI — with manual-review-only decision model preserved.

## Structure (13 sections)
1. Introduction
2. Motivation: The Capture-Fidelity Failure (2.1 IW attack, 2.2 wrong trust boundary, 2.3 privacy problems)
3. Threat Model and Design Goals (3.1–3.4)
4. System Overview (4.1–4.5)
5. Proof Protocol (5.1–5.6)
6. Platform Implementations (6.1–6.4)
7. Privacy Model (7.1–7.4)
8. Evaluation (8.1–8.6)
9. Security Analysis (9.1–9.4)
10. Ethics and Deployment Limits (10.1–10.3)
11. Related Work
12. Discussion and Future Work (12.1–12.3)
13. Conclusion

## Key Technical Facts (verified from source)
- Ed25519 signatures (proofSignature.js confirmed)
- SHA-256 node_id_hash (hex, 64 chars)
- HMAC-SHA256 audit chain
- 7-category risk scoring
- 18 event types in academic taxonomy
- Claude API narrative layer (sanitised metadata only, Warning/Critical only)
- Hard-coded: "Manual review required. No automatic misconduct finding."
- 327/327 Node tests, 33/33 Rust tests, 11/11 Windows .NET tests
- Windows validation: WDA_MONITOR + WDA_EXCLUDEFROMCAPTURE on Windows 10 Pro build 19045
- macOS: Swift CryptoKit Ed25519 daemon
- Linux: X11 scanner, Wayland portal probe, XWayland partial

## Wording Rules
DO NOT write: "prevents cheating", "detects misconduct", "production ready", "deployable now"  
WRITE: "produces integrity signals for manual review", "research prototype", "detects metadata-level device integrity anomalies", "avoids screen capture"

## Directory
`papers/project-simurgh/` inside the Project Simurgh repo.
