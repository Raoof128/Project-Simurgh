# Roadmap

Project Simurgh is built in stages, each adding capability while preserving the privacy-first design contract.

---

## Stage 1 — Academic Shield (Current) ✅

**Status: Complete**

Privacy-first academic integrity prototype.

- [x] Metadata-only telemetry pipeline (no content collection)
- [x] SHA-256 student identity hashing
- [x] Local deterministic risk scoring (7-category weighted model)
- [x] Claude narrative layer — Warning/Critical only, fail-open
- [x] Academic event taxonomy (18 event types)
- [x] Session lifecycle state machine (created → submitted)
- [x] Exam registry API
- [x] HMAC-SHA256 tamper-evident audit chain
- [x] JSON report export with manual review recommendation
- [x] Audit chain verification endpoint
- [x] Instructor dashboard: risk cards, event timeline, filter bar
- [x] Student page: privacy notice modal, helper status indicator
- [x] macOS native helper (display-affinity scanner, Countermeasure A)

---

## Stage 1.5 — Validation Pack ✅

**Status: Complete**

Reviewer-readiness, validation, evidence mapping, and Stage 2 planning. No major Stage 2 runtime code.

- [x] Threat model
- [x] Validation matrix
- [x] Limitations document
- [x] Stage 2 architecture plan
- [x] Resource plan
- [x] Demo script
- [x] Risk register
- [x] Reviewer checklist
- [x] Evidence folder rules
- [ ] Fresh remote CI evidence after branch push
- [ ] Red-team validation
- [ ] Privacy/legal review
- [ ] Accessibility review
- [ ] Institutional pilot evidence

---

## Stage 2 — Device Shield / Integrity Node

**Status: In progress** (Stage 2.7 complete — `v0.4.13`)

Transition toward signed local integrity proofs and device-aware validation.

- [x] Simurgh SDK to Local Integrity Node pairing
- [x] Signed integrity proof envelope
- [x] macOS localhost daemon foundation with P-256 signed proofs
- [x] Server challenge verification and telemetry `daemon_proof`
- [x] Dashboard/report device-integrity state
- [x] Reusable browser SDK for daemon discovery, pairing, proof fetch, and telemetry send
- [x] Development daemon lifecycle commands and LaunchAgent install/uninstall helpers
- [x] macOS metadata-only display-affinity scanner implementation
- [ ] Tamper-aware local node logs
- [x] Replay-resistant node/API challenge flow
- [x] Privacy-preserving proof summaries
- [x] Windows scanner proof contract and mock-first .NET daemon skeleton
- [x] Real Windows laptop validation for `WDA_MONITOR` and `WDA_EXCLUDEFROMCAPTURE`
- [x] Cross-platform Device Shield unification — Stage 2.7, `v0.4.13` (shared proof/scanner/risk/privacy contracts, cross-platform smoke + audit, Linux daemon proofs rejected with `unsupported_platform`)
- [ ] Production Windows Service packaging and deployment design
- [ ] Stage 2.8 Linux Display Integrity Research — X11 enumeration feasibility, Wayland compositor/security-model investigation, no parity claim until signed and validated
- [ ] Agent integrity API — validates AI computer-use sessions
- [ ] Webhook delivery for real-time risk alerts
- [ ] Multi-exam support (concurrent sessions)
- [ ] Rate-limit and burst protection hardening
- [ ] Persistent storage (PostgreSQL / Supabase)

---

## Stage 3 — Platform Expansion

**Status: Proposed**

Cross-platform delivery and LMS integration.

- [ ] Browser PWA (no install required)
- [ ] Production macOS daemon packaging, signing, notarisation, and managed deployment design
- [ ] iOS and Android companion apps
- [ ] ChromeOS support
- [ ] LMS integration (Canvas, Moodle, Blackboard webhooks)
- [ ] Institutional SSO (SAML / OAuth2)
- [ ] Multi-tenant deployment support

---

## Stage 4 — Privacy-Preserving Visuals (Research)

**Status: Research**

Countermeasure D — the "Code-Video" layer.

- [ ] GPU-layer overlay detection (DirectX/Metal hook patterns)
- [ ] Hardware-rooted attestation via TPM / Secure Enclave
- [ ] Privacy-preserving visual verification without screen capture
- [ ] On-device inference (no cloud dependency for scoring)

---

## Known Limitations

These limitations are documented in the research paper (§VI-C) and are not bugs:

| Limitation                                                     | Class                       | Mitigation                                 |
| -------------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| Click-through overlays (WS_EX_TRANSPARENT, ignoresMouseEvents) | Countermeasure C blind spot | Pair with native helper (Countermeasure A) |
| Read-don't-paste workflows (silent transcription, human WPM)   | Structural detection gap    | Behavioural baseline analysis (Stage 2)    |
| GPU-layer overlays (Cluely-class)                              | Advanced evasion            | Stage 4 research track                     |

---

## Contributing

Open an issue to discuss a proposal before submitting a PR. A dedicated contributor guide is not included in the Stage 1.5 validation pack.
