# Stage 2 macOS Reviewer Demo Script

> **Status (v0.4.10, 2026-05-16):** Stage 2.5 macOS Device Shield complete and frozen. This script covers the full macOS integrity proof round-trip. For the Stage 2.5 cybersecurity audit, run `./scripts/security-audit-stage-2-4-2-5.sh`. For Stage 2.2–2.5 smoke coverage, see [`STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`](STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md).

Target length: 10 to 15 minutes.

## 1. Problem: Invisible and AI-Assisted Integrity Gap

Explain that screen capture does not always represent what a student or agent physically sees. Display-affinity APIs and overlays can leave a recording clean while the operator sees external help.

Reviewer should observe: the project starts from a display-fidelity threat, not from a surveillance-first premise.

## 2. Why Screen Capture Fails

Show the Stage 1 documentation and helper references. Explain that Stage 1 and Stage 2 avoid relying on pixels as the primary trust signal.

Reviewer should observe: the privacy model is a security decision, not only a policy statement.

## 3. Stage 2 Architecture

Walk through:

- browser metadata telemetry,
- reusable browser SDK (`public/sdk/simurgh-browser-sdk.js`),
- macOS localhost daemon (`tools/simurgh-daemon-macos/`),
- CoreGraphics-backed metadata-only affinity scanner,
- P-256 signed integrity proofs with Keychain-backed node identity,
- server challenge/replay and signature verification,
- HMAC audit chain,
- instructor dashboard with `device_integrity` status.

Reviewer should observe: OS-level integrity signals are cryptographically signed by a local node and verified by the server.

## 4. Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Open:

- student page: `http://localhost:3030/`
- instructor page in demo mode: `http://localhost:3030/instructor`

Reviewer should observe: the student page explains metadata-only monitoring before the session starts.

## 5. Live Telemetry / Risk / Device Integrity Demo

Trigger normal typing, focus loss, and paste-heavy behavior in a demo session.

Reviewer should observe:

- normal telemetry remains low risk,
- focus loss/paste patterns elevate risk,
- dashboard updates through server events,
- signed `daemon_proof` metadata appears in telemetry logs.

## 6. Security Hardening & Stage 2 Gates

Run:

```bash
./scripts/check.sh
npm test
./scripts/security-audit-stage-2-4-2-5.sh
```

Reviewer should observe:

- unit tests pass (234/234),
- secret scan runs,
- privacy guard runs,
- server boot smoke runs,
- replay/auth checks run,
- audit-chain round trip runs,
- Stage 2.5 cybersecurity audit gate passes.

## 7. Privacy Model

Run:

```bash
node tools/privacy-audit.mjs
```

Reviewer should observe: generated-data scan passes with 0 forbidden fields found.

## 8. Validation Evidence

Open:

- `docs/VALIDATION.md`
- `docs/STAGE_2_MACOS_VALIDATION_MATRIX.md`
- `docs/evidence/stage-2-macos/README.md`

Reviewer should observe: unavailable evidence (Windows/Linux) is marked pending instead of fabricated.

## 9. Known Limitations

Open:

- `docs/LIMITATIONS.md`
- `docs/RISK_REGISTER.md`

Reviewer should observe: GPU overlays, read-only cheating, and compromised endpoints remain explicit risks.

## 10. Stage 2 macOS Prototype Status

Open:

- `docs/STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`
- `docs/STAGE_2_MACOS_REVIEWER_CHECKLIST.md`

Reviewer should observe: the macOS Device Shield is a complete research prototype, not only a planned architecture.

## 11. Resource Ask / Next Step

Close with:

- review Stage 2 macOS closeout evidence,
- run local checks,
- confirm legal/privacy review requirements for institutional pilot,
- decide whether to support Stage 2.6 Windows scanner implementation.
