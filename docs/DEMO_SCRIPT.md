# Stage 1.5 Reviewer Demo Script

> **Status (v0.4.3, 2026-05-15):** Stage 1.5 demo script. A Stage 2 demo (integrity proof + node pairing round-trip on macOS) is documented inline in `tools/simurgh-node-macos/README.md` and exercised by 4 `scripts/check.sh` gates (pairing round-trip, paired-proof verified, paired-session rejects different node, N1 cross-route consistency).

Target length: 5 to 10 minutes.

## 1. Problem: Invisible and AI-Assisted Integrity Gap

Explain that screen capture does not always represent what a student or agent physically sees. Display-affinity APIs and overlays can leave a recording clean while the operator sees external help.

Reviewer should observe: the project starts from a display-fidelity threat, not from a surveillance-first premise.

## 2. Why Screen Capture Fails

Show the Stage 1 documentation and helper references. Explain that Stage 1 avoids relying on pixels as the primary trust signal.

Reviewer should observe: the privacy model is a security decision, not only a policy statement.

## 3. Stage 1 Architecture

Walk through:

- browser metadata telemetry,
- Node/Express API,
- deterministic local scoring,
- optional Claude narrative for Warning/Critical,
- macOS helper display-affinity reports,
- HMAC audit chain,
- instructor dashboard.

Reviewer should observe: official scores come from local deterministic scoring; Claude is explanatory, not the authority.

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

## 5. Live Telemetry / Risk Demo

Trigger normal typing, focus loss, and paste-heavy behavior in a demo session.

Reviewer should observe:

- normal telemetry remains low risk,
- focus loss/paste patterns elevate risk,
- dashboard updates through server events,
- recommendations remain manual-review language.

## 6. Security Hardening

Run:

```bash
./scripts/check.sh
npm test
```

Reviewer should observe:

- unit tests pass,
- secret scan runs,
- privacy guard runs,
- server boot smoke runs,
- replay/auth checks run,
- audit-chain round trip runs.

## 7. Privacy Model

Run:

```bash
node tools/privacy-audit.mjs
```

Reviewer should observe: generated-data scan passes or reports exact forbidden fields if a future run creates evidence files incorrectly.

## 8. Validation Evidence

Open:

- `docs/VALIDATION.md`
- `docs/stages/STAGE_1_5_REVIEWER_PACK.md`
- `docs/evidence/stage-1/README.md`

Reviewer should observe: unavailable evidence is marked pending instead of fabricated.

## 9. Known Limitations

Open:

- `docs/LIMITATIONS.md`
- `docs/RISK_REGISTER.md`

Reviewer should observe: GPU overlays, read-only cheating, compromised endpoints, and incomplete helper coverage remain explicit risks.

## 10. Stage 2 Integrity Node Plan

Open:

- `docs/stages/STAGE_2_ARCHITECTURE.md`
- `docs/RESOURCE_PLAN.md`

Reviewer should observe: Stage 2 is a planned signed-proof architecture, not prematurely implemented code.

## 11. Resource Ask / Next Step

Close with:

- review Stage 1.5 evidence,
- run local checks,
- confirm legal/privacy review requirements,
- decide whether to support Stage 2 planning, red-team testing, and a controlled pilot.
