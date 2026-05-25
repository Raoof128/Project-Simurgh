# Related Work

## RW01 — Abedini 2026 (Invisible Window)

**DOI:** 10.5281/zenodo.20319832
**Type:** Extends / Bounds (companion paper — Simurgh is the defensive response)
**Delta:** Formalises the Display Fidelity Property and empirically confirms 100% evasion via
OS display-affinity APIs. Simurgh's C01 is grounded in this prior result.
**Claims affected:** C01

---

## RW02 — Simko et al. 2024 (Modern Proctoring Evasion)

**DOI:** Not specified in paper
**Type:** Baseline / Extends
**Delta:** Catalogues community-developed proctoring evasion techniques including the
display-affinity subclass. Simurgh's architecture directly addresses this subclass.
**Claims affected:** C01, C03

---

## RW03 — Balash et al. 2023 / 2021 (Educator/Student Perspectives)

**DOI:** Not specified in paper
**Type:** Baseline
**Delta:** Documents privacy and usability costs of existing proctoring systems from educator
and student perspectives. Motivates Simurgh's privacy-first design premise.
**Claims affected:** C02

---

## RW04 — Luijben et al. 2024 (Security Requirements for Proctoring)

**DOI:** Not specified in paper
**Type:** Bounds / Extends
**Delta:** Formalises five security requirements. Simurgh addresses Requirement 2 (work
authenticity) and Requirement 4 (data protection).
**Claims affected:** C02, C03

---

## RW05 — Paris et al. 2021 (Privacy Sins of Proctoring)

**DOI:** Not specified in paper
**Type:** Baseline
**Delta:** Documents structural privacy violations in e-learning systems. Motivates the
metadata-only collection constraint.
**Claims affected:** C02

---

## RW06 — Mukherjee et al. 2024 (Balancing Privacy in Proctoring)

**DOI:** Not specified in paper
**Type:** Baseline
**Delta:** Documents algorithmic bias in facial recognition used by proctoring. Motivates
Simurgh's no-webcam-collection constraint.
**Claims affected:** C02

---

## RW07 — Kaddoura & Harb 2023 / Ferdosi et al. 2023 (Gaze Tracking)

**DOI:** Not specified in paper
**Type:** Baseline
**Delta:** Applies gaze tracking to exam integrity detection. Explicitly out of scope for
Simurgh — gaze tracking requires sensor access that violates the metadata-only constraint.
**Claims affected:** C02 (NC03 applies)

---

## RW08 — NIST Zero Trust Architecture SP 800-207

**DOI / URL:** Not specified (NIST SP 800-207)
**Type:** Imports
**Delta:** Motivates treating the client device as untrusted until it provides verifiable
proof of identity and state. Simurgh's signed proof envelope is a software instantiation
of this principle.
**Claims affected:** C02, C03

---

## RW09 — TPM 2.0 Specification

**DOI / URL:** Trusted Computing Group spec
**Type:** Baseline (future target)
**Delta:** Provides hardware-backed attestation primitives. Simurgh's current architecture
is software-level; TPM/Secure Enclave integration is Stage XII-B future work.
**Claims affected:** C03 (NC06 applies)

---

## RW10 — WebAuthn W3C Recommendation

**DOI / URL:** W3C WebAuthn
**Type:** Baseline (future target)
**Delta:** Browser-accessible platform authenticator API. A future path for hardware-rooted
proofs without a separate daemon.
**Claims affected:** C03

---

## RW11 — RFC 8032 (Ed25519)

**DOI / URL:** IETF RFC 8032
**Type:** Imports
**Delta:** Specifies Ed25519 signature algorithm used in the browser-paired integrity-proof
envelope.
**Claims affected:** C02, C03

---

## RW12 — FIPS 186-5 (ECDSA P-256)

**DOI / URL:** NIST FIPS 186-5
**Type:** Imports
**Delta:** Specifies ECDSA P-256 used in the device-shield daemon proof envelopes.
**Claims affected:** C02, C03

---

## RW13 — RFC 2104 (HMAC)

**DOI / URL:** IETF RFC 2104
**Type:** Imports
**Delta:** Specifies HMAC-SHA256 used in the tamper-evident audit chain.
**Claims affected:** C02

---

## RW14 — Conijn et al. 2022 (Student Anxiety Under Proctoring)

**DOI:** Not specified in paper
**Type:** Baseline
**Delta:** Documents elevated student anxiety under proctoring conditions. Motivates
Simurgh's minimal-collection design.
**Claims affected:** C02

---

## Additional Citations (Supporting / Background)

The following citations appear in the paper but are supporting references rather than
primary technical comparisons: `bruaroey2025screen` (W3C Screen Capture API spec),
`microsoft2025setwindow` (SetWindowDisplayAffinity docs), `apple2025sharingtype`
(NSWindow.SharingType docs), `apple2025screencapturekit` (SCKit docs),
`duncan2022necessity`, `khalil2022nexus`, `prinsloo2024vulnerable`,
`wang2020user`, `guan2021design`, `atoum2017automated`,
`acm2018code`, `ieee2024code`, `cluely2025`, `interviewcoder2026`, `fabrichq2026cheating`.
