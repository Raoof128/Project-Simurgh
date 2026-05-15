# Simurgh Research Programme

> **Status:** v0.4.4 — 2026-05-15. Stage 2.2 macOS node pairing shipped, 10/10 security audit posture reached, Q9 audit-coverage gap closed, Q10 demo states (`stale`, `replayed`, `invalid_signature`) added to `scripts/check.sh`. 34/34 gates, 203/203 tests, 0 high/critical npm advisories.

This document is the long-horizon research roadmap for Project Simurgh — a privacy-preserving academic integrity prototype. It frames the work as four nested research tracks rather than a single product backlog. Each track has explicit non-goals and an anti-overclaiming clause so progress claims stay honest.

The structure is:

1. **Interface Vulnerabilities** — what an exam-taking surface (browser, helper, OS UI) actually leaks and what an attacker can do at that layer.
2. **Proof-Based Integrity Defence** — the signed-envelope architecture (Stage 2.1 + 2.2 shipped) and how it converts trust from "the client said so" into "the device cryptographically attests."
3. **Secure Agent Sandboxing** — what an LLM-backed analysis agent is allowed to see, infer, and persist; how its inputs and outputs are bounded.
4. **Regulated / Secure-Environment Roadmap** — what it would take to pilot Simurgh inside an institution with real legal, accessibility, and privacy review attached.

Together these four tracks frame the answer to every question raised in the most recent security audit (reproduced and answered inline below). After each section the reader should be able to point at: what is implemented today, what is planned and gated by which milestone, and what we explicitly will not claim.

---

## 0. Audit posture and the ten questions

The May 2026 internal audit asked ten questions about Stage 2's posture before Stage 2.3 (macOS localhost daemon) is started. The matrix below is the canonical answer; each row is the question, the current state of the system, and the file/line evidence.

| # | Question | Current state | Evidence |
|---|----------|---------------|----------|
| Q1 | Can pairing be replayed across sessions? | No. Challenges are one-shot, 60 s TTL, constant-time compared, immutable once paired. | `src/integrity/pairingRegistry.js` (TTL, `constantTimeStringEquals`); `server.js` `/pairing/complete` route. |
| Q2 | Can a browser forge `signature_status: "verified"`? | No. The field is server-derived inside `validateProof` and never read from request bodies. | `src/integrity/proofValidator.js` (`signature_status` returned by validator only). |
| Q3 | Is the macOS node key adequately protected? | Adequate for a research prototype. File mode `0600`, dir `0700`, key marked as a **development identity key** in CLI README. No hardware-backed attestation claim. | `tools/simurgh-node-macos/Sources/SimurghNode/NodeIdentity.swift`; `tools/simurgh-node-macos/README.md`. |
| Q4 | Are challenges single-use and expiring? | Yes. `createChallenge` clears any unconsumed pending; `completePairing` sets `rec.pending = null` on success; expiry enforced before the compare. | `src/integrity/pairingRegistry.js`. |
| Q5 | Is node continuity enforced per session? | Yes (E1 + N1). First accepted proof binds `bound_node_id_hash`, immutable; pairing route also rejects when integrity state's bound hash differs. | `src/integrity/integrityState.js`; `server.js` cross-route N1 check. |
| Q6 | Are audit hints spoof-proof? | Yes. `safeParsedPairingHints` only emits `node_id_hash_if_parsed` when the decoded public key is 32 bytes **and** `sha256(pubkey) === claimed_hash`. | `src/integrity/pairingAuditHints.js`. |
| Q7 | Are rate limits sized correctly? | Yes. `/integrity/proofs` 30/min, `/pairing/challenge` 10/min, `/pairing/complete` 20/min — all keyed per session bearer token. | `server.js` rate limiter declarations. |
| Q8 | Is the browser treated as untrusted at every boundary? | Yes. Every state-changing route revalidates against the registered key/hash; no caller-supplied trust fields. | `src/integrity/proofValidator.js`, `pairingValidator.js`. |
| Q9 | Does every rejected request emit an audit event? | **Yes (closed in v0.4.4).** `/pairing/challenge` rejection paths now also append `INTEGRITY_PAIRING_REJECTED` with `stage: "challenge_request"`. | `server.js` `/pairing/challenge` route; `scripts/check.sh` gate "Stage 2.2 invalid_signature + challenge-rejection both emit INTEGRITY_PAIRING_REJECTED (Q9)". |
| Q10 | Can each demo failure state be reproduced end-to-end? | **Yes (closed in v0.4.4).** The five demo states — `verified`, `unregistered_node`, `paired_node_mismatch`, `proof_stale`, `nonce_replayed`, and pairing `invalid_signature` — all have gates in `scripts/check.sh`. | `scripts/check.sh` gates 10b (verified, unregistered, paired_node_mismatch) + new audit-coverage gates (stale, replayed, invalid_signature, challenge_request rejection). |

Score: **10 / 10**. Every question has both a code-level answer and a regression gate. New questions invalidate this; old ones don't expire.

---

## 1. Interface Vulnerabilities

### Scope

The "interface" here is everything the exam taker's machine presents that an integrity system could read or be deceived by: the browser tab (DOM, WebRTC, navigator, getDisplayMedia), the OS window-management surface (screen sharing, focus, sharing-state indicators), and any helper or extension running with elevated privileges.

### What we already understand

- **Browser is fundamentally untrusted.** A page can lie about everything: focus state, fullscreen, capture state, paste contents, even keystroke timing. Simurgh Stage 1 treated these as risk *signals*, not as proof — that posture survives into Stage 2.
- **Helper-secret model is brittle.** A static shared secret in a sidecar binary is forgeable, replayable, and difficult to rotate. Stage 1's helper secret was acceptable for validation only; Stage 2 introduces signed proofs to replace it.
- **Screen-sharing indicators leak less than people assume.** `getDisplayMedia` exposes capture-source metadata only on user gesture; window enumeration requires native APIs (Stage 2.5 ScreenCaptureKit). We do not collect window titles or process names.

### Open research questions

- **Sharing-state regression.** When a student briefly shares a different window or screen during an exam, what is the minimum metadata that lets a reviewer reconstruct the event without ever seeing pixels? Today we emit `capture_excluded_window_count` and `node_state`; we need an empirical study of false-positive rates per institution before adding more.
- **Helper / extension impersonation.** Browser extensions can spoof postMessage origins. Stage 2.4 (browser SDK) must define an origin-pinning protocol between the page and the localhost daemon (Stage 2.3) that is forgery-resistant even under a malicious extension.
- **OS attestation gap.** macOS Endpoint Security and TCC give signals about what a process can do, but none of them are hardware-rooted. Until Apple ships a developer-accessible hardware attestation primitive, every "device trust" claim has to be qualified.

### Non-goals

- We will not claim to detect "all forms of cheating." That is an unfalsifiable claim that misleads institutions.
- We will not deploy keystroke biometrics or webcam analysis. Those are out of scope by design.

### Anti-overclaiming language

Use: "reduces helper spoofing surface", "raises forgery cost", "produces auditable proof envelopes".
Avoid: "cannot be bypassed", "complete endpoint security", "universal detection".

---

## 2. Proof-Based Integrity Defence

### What is built today (Stage 2.1 + 2.2, v0.4.3 hardening, v0.4.4 audit-coverage)

The shipped pipeline:

1. **Ed25519 signed proof envelope** (`simurgh-integrity-proof-v1`). Eight required fields plus `signature`. Canonicalised through `proofCanonicalise.js` so the Node server and Swift CLI produce byte-identical golden fixtures.
2. **Per-session node pairing** (`simurgh-pairing-proof-v1`). Challenge issued by `/pairing/challenge`, signed by the macOS node, verified by `/pairing/complete`. Once paired, that session's `node_id_hash` is immutable.
3. **E1 strict triple check.** Every accepted proof must match: claimed hash + public-key string + valid signature. Any mismatch is a reject with reason.
4. **N1 strict node continuity.** First accepted proof binds the session's node identity. Subsequent proofs from a different node hash are rejected (`node_id_hash_changed`) on both `/integrity/proofs` and `/pairing/complete`.
5. **Audit chain.** HMAC-SHA256-linked entries; every accept and every reject appends. `INTEGRITY_PAIRING_REJECTED` now also fires for `/pairing/challenge` rejections (Q9 closure, v0.4.4) with `stage: "challenge_request"`.
6. **Privacy budget.** Audit payloads contain hashes only — no raw challenge, no raw public key, no raw signature. `safeParsedPairingHints` enforces this for the few hint fields that are decoded.

### Where the next phase goes

- **Stage 2.3 — macOS localhost daemon.** Move the CLI flows (`proof`, `pair`) behind a `127.0.0.1`-bound HTTP listener. Auth between the browser SDK (Stage 2.4) and the daemon is the open design question (per-session token? OS keychain handoff? port advertised via WKWebView postMessage?). Lifecycle (menu-bar, login-launched, on-demand) needs an explicit decision before code.
- **Stage 2.4 — browser SDK.** Discovers and talks to the daemon. Treats the browser side as untrusted: all proof material is signed by the daemon, the SDK only relays.
- **Stage 2.5 — ScreenCaptureKit.** Real OS-level signals (excluded-window count, sharing state, capture-active boolean). Still metadata-only — never pixels, never process names.

### Non-goals

- No hardware-rooted attestation claim until an Apple/Microsoft/Linux platform primitive is actually integrated.
- No "production-ready" label before red-team, privacy/legal, accessibility, and pilot review.
- No automatic misconduct findings — Simurgh produces evidence for human reviewers, not verdicts.

### Anti-overclaiming language

Use: "signed integrity proof direction", "prepares for hardware-rooted attestation", "metadata-only privacy model".
Avoid: "tamper-proof device", "trusted client", "verifies the student is who they say they are".

---

## 3. Secure Agent Sandboxing

### Scope

A future Simurgh deployment may use an LLM agent to summarise audit chains, flag anomalies for human review, or answer instructor questions across many sessions. That agent is itself a new attack surface and a new privacy risk.

### Constraints that must hold

- **No raw secret material** ever reaches the agent. The audit chain HMAC key, session signing key, instructor token, and node private keys are all out of agent scope.
- **No raw biometric or content.** The agent sees hashed identifiers, counts, signed proofs, audit entries, and reasoned summaries — never screen pixels, audio, webcam, typed answer text, paste content, or raw window titles.
- **No automatic decisions.** The agent's output is always a recommendation for a human reviewer. Simurgh does not — and the agent must not — emit a misconduct verdict.
- **Bounded context.** The agent has a per-question context window scoped to a single session or a small explicitly-allowed set. Cross-institution analytics are out of scope.

### Sandbox shape (research direction)

1. **Input gate.** A schema-validated read-only view over `auditChain.entries`, `pairingRegistry` state hashes, and `integrityState` summaries. No raw payloads pass through except after `safeParsedPairingHints`-style reconciliation.
2. **Tool budget.** The agent's tools are narrow: chain verification (`verifyChain`), audit export (`/api/audit/:sessionId`), session-list summary. No tool that writes back to the system.
3. **Output filter.** The agent's response is itself audited (a new `AGENT_RECOMMENDATION` event with hashes of the inputs it used) so the human reviewer can verify the audit trail covered the agent's reasoning.
4. **Prompt-injection resilience.** Audit entries that originated from a student-controlled field (e.g. parsed `node_public_key`) are passed only as base64 hashes or after schema validation. Free-text fields are not re-emitted into agent prompts.

### Non-goals

- The agent will not write to the audit chain, the pairing registry, or any session state.
- The agent will not be exposed to raw network traffic, raw file system, or raw process listings.
- The agent will not be sold or framed as "AI proctoring" — it is a reviewer assistant.

### Anti-overclaiming language

Use: "agent-assisted human review", "summarises auditable evidence", "bounded read-only context".
Avoid: "AI-powered detection", "automated cheating finder", "the model decides".

---

## 4. Regulated / Secure-Environment Roadmap

### What a real pilot requires

A research prototype that passes its own check.sh does not equal an institution-deployable product. Before any pilot inside a regulated environment (FERPA, GDPR, sector-specific exam boards, accessibility statutes), Simurgh needs:

- **Privacy / legal review.** A formal data-protection impact assessment per deployment region. Confirmation that the metadata-only model is lawful basis-compatible. Data-retention and student-access policies signed off.
- **Accessibility review.** WCAG 2.2 AA pass for the student-facing surfaces. Explicit handling for assistive technologies (screen readers, magnifiers, switch input) — these must not register as "anomalies."
- **Red-team engagement.** External adversarial test of pairing, replay, helper spoofing, and the audit chain itself. Findings tracked publicly.
- **Distribution model.** Signed and notarised macOS app/helper, signed Windows installer, Linux package strategy, secure update channel. None of this exists in the research prototype today.
- **LMS / exam-platform integration.** Canvas / Moodle / Inspera adapters. Identity federation with institutional IdP.
- **Reviewer training.** Documentation and training material for the human reviewers who interpret the audit chains. The audit is only as useful as the reviewer's ability to read it.

### Sequencing

```
v0.4.x  Stage 2.x research prototype (current).
  ├─ Stage 2.3 macOS localhost daemon (next).
  ├─ Stage 2.4 browser SDK ↔ daemon.
  └─ Stage 2.5 ScreenCaptureKit signal collection.

v0.5.x  Privacy / legal review pass, accessibility audit, red-team round 1.
v0.6.x  Distribution + LMS integration scaffolds.
v0.7.x  First closed institutional pilot (single department, opt-in).
v1.0.x  General-availability candidate — only after pilot results, accessibility re-test, and red-team round 2.
```

These are research milestones, not commitments. Any of them can be paused if a finding (privacy, accessibility, security) demands it.

### Non-goals

- No "v1.0 in 2026" claim. The research roadmap above is multi-year, not quarter-by-quarter.
- No closed-source or proprietary lock-in path. Simurgh's audit and proof formats are intended to remain open and inspectable.
- No replacement for human reviewers. The whole point of the architecture is to make human review tractable, not to remove it.

### Anti-overclaiming language

Use: "research prototype", "candidate for institutional pilot pending review", "auditable foundation".
Avoid: "production-ready", "compliant" (without naming the framework and the assessment), "deployed at scale".

---

## Appendix A — File map

- `server.js` — Express app, routes, audit emission. Q9 closure lives at `/api/integrity/pairing/challenge`.
- `src/integrity/proofValidator.js` — proof envelope validation, E1 triple, signature_status derivation.
- `src/integrity/pairingValidator.js` — pairing envelope validation.
- `src/integrity/pairingRegistry.js` — per-session none → pending → paired state machine with constant-time compare and TTL.
- `src/integrity/integrityState.js` — N1 strict node continuity, immutable `bound_node_id_hash` per session.
- `src/integrity/pairingAuditHints.js` — `safeParsedPairingHints` — only emits node_id_hash when cryptographically reconciled.
- `src/integrity/nonceGuard.js` — per-nonce replay protection for proofs.
- `src/audit/hmacChain.js` — HMAC-SHA256-linked audit chain.
- `tools/simurgh-node-macos/` — Swift CryptoKit CLI, golden-fixture cross-implementation lock with the Node server.
- `scripts/check.sh` — 34 gates including all five Q10 demo states and the Q9 audit-coverage emission.

## Appendix B — Audit verification

Anyone can verify a chain produced by Simurgh:

```bash
node tools/verify-audit.mjs path/to/audit-export.json
```

The verifier walks every HMAC link and reports the first tampered or missing entry. The HMAC key is institutional, not shared with the agent or with students.

---

*Last updated: 2026-05-15 (v0.4.4-audit-coverage). Maintainer: Raouf.*
