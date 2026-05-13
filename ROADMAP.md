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

## Stage 1.5 — Codebase Refactor (Next)

**Status: Planned**

Internal refactor after Stage 1 is stable. No new user-facing features.

- [ ] Split `server.js` into `src/routes/` modules
- [ ] Route-level middleware consolidation
- [ ] OpenAPI spec for all endpoints
- [ ] Integration test suite (end-to-end flow)

---

## Stage 2 — Sovereign Shield

**Status: Planned**

Extend beyond academic proctoring to enterprise and AI agent integrity.

- [ ] Windows native helper (SetWindowDisplayAffinity WDA_EXCLUDEFROMCAPTURE detection)
- [ ] Linux Wayland surface-level affinity detection
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

| Limitation | Class | Mitigation |
|---|---|---|
| Click-through overlays (WS_EX_TRANSPARENT, ignoresMouseEvents) | Countermeasure C blind spot | Pair with native helper (Countermeasure A) |
| Read-don't-paste workflows (silent transcription, human WPM) | Structural detection gap | Behavioural baseline analysis (Stage 2) |
| GPU-layer overlays (Cluely-class) | Advanced evasion | Stage 4 research track |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) (coming soon) or open an issue to discuss a proposal before submitting a PR.
