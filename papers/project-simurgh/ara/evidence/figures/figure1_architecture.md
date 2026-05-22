# Figure 1: System Architecture

**Source:** Figure 1 (TikZ diagram) in main.tex, Section IV
**Claims supported:** C02, C03

**Description:** Full-width two-column TikZ diagram showing:

**Student Device (left box, blue tint):**

- Browser SDK (Telemetry) — browser-side component
- Integrity Daemon (P-256 signer) — native localhost process
- OS Scanner (kCGWindow / WDA) — platform-specific metadata query

**Trust Boundary:** Vertical dashed red line separating student device from verifier server

**Verifier Server / Node.js (right box, orange tint):**

- Proof Verifier (Ed25519 + P-256)
- Risk Scorer (8-category model)
- Audit Chain (HMAC-SHA256)
- Claude Layer (narrative, optional)
- Report & Dashboard (instructor view)

**Data flows:**

- Daemon → SDK: signed proof (internal, dashed)
- Daemon → OS Scanner: query (dashed)
- SDK → Verifier: telemetry + proof (crosses trust boundary, solid thick arrow)
- Verifier → Risk Scorer, Audit Chain (internal)
- Risk Scorer → Claude Layer, Report
- Audit Chain → Report

**Caption (verbatim):** "Simurgh system architecture. The student device runs a browser SDK
(telemetry collection) and a local integrity daemon (ECDSA P-256-signed proofs of OS metadata;
the browser-paired integrity-proof envelope uses Ed25519). The daemon queries OS-level
window-state metadata without accessing content. All proof material crosses the trust boundary
to the Node.js verifier, which checks signatures, scores risk, appends to the audit chain,
optionally invokes the Claude narrative layer, and exposes a read-only instructor dashboard and report."
