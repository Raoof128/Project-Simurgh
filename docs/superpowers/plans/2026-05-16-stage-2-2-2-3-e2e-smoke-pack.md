# Stage 2.2 + 2.3 E2E Smoke Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Stage 2.2 + Stage 2.3 smoke pack that proves macOS node pairing, signed integrity proofs, daemon pairing/proofs, replay/tamper rejection, hardened daemon-required mode, reports, audit chain verification, and privacy-safe rejection handling.

**Architecture:** Use one CI-safe Node E2E driver for server/API flows and one Bash wrapper for server lifecycle plus optional macOS Swift daemon build/test checks. Keep this smoke independent from the Stage 2.4/2.5 smoke so reviewers can isolate the bridge from node-pairing and daemon-foundation regressions.

**Tech Stack:** Bash, Node 22 ESM, built-in `crypto`, built-in `fetch`, existing Express routes, existing SwiftPM daemon package.

---

### Task 1: Node E2E Driver

**Files:**

- Create: `tests/e2e/stage22_23_smoke.mjs`

- [ ] **Step 1: Verify red**

Run:

```bash
node tests/e2e/stage22_23_smoke.mjs --base-url http://127.0.0.1:33220 --hardened-base-url http://127.0.0.1:33221
```

Expected: fail with `MODULE_NOT_FOUND`.

- [ ] **Step 2: Implement Ed25519 Stage 2.2 helpers**

Add canonical signing for `simurgh-pairing-proof-v1` and `simurgh-integrity-proof-v1`, using raw Ed25519 public keys and the existing canonical JSON rules.

- [ ] **Step 3: Implement P-256 Stage 2.3 helpers**

Add canonical signing for daemon pair/proof payloads with DER/SPKI public keys and DER signatures.

- [ ] **Step 4: Implement Stage 2.2 flow**

Create an exam, join a session, request pairing challenge, complete pairing, submit a verified proof, reject different-node paired proof, reject replayed nonce, reject stale proof, reject invalid signature, and verify audit entries.

- [ ] **Step 5: Implement Stage 2.3 flow**

Create another exam session, pair a mock daemon, submit signed daemon proof, reject replayed proof challenge, reject tampered proof, verify report `device_integrity`, verify dashboard daemon state, verify audit chain and rejection events.

- [ ] **Step 6: Implement hardened daemon-required flow**

Against the hardened server, confirm missing daemon proof returns `428 daemon_proof_required` and audits `DAEMON_MISSING` without accepting telemetry.

### Task 2: Shell Wrapper

**Files:**

- Create: `scripts/smoke-stage-2-2-2-3.sh`

- [ ] **Step 1: Start two demo servers**

Start optional mode on `33220` and hardened daemon-required mode on `33221`; wait for `/health`; clean up PIDs on exit.

- [ ] **Step 2: Run Node driver**

Run:

```bash
node tests/e2e/stage22_23_smoke.mjs --base-url http://127.0.0.1:33220 --hardened-base-url http://127.0.0.1:33221
```

- [ ] **Step 3: Run macOS-only Swift checks**

On Darwin with Swift available, run daemon `swift build`, `swift test`, and `swift run SimurghDaemon --help`; verify no forbidden local-data fields appear in command output.

### Task 3: Gate, Docs, Logs

**Files:**

- Modify: `scripts/check.sh`
- Modify: `README.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add check gate**

Add a full-mode gate named `Stage 2.2/2.3 E2E smoke: pairing + daemon proof bridge`.

- [ ] **Step 2: Document usage**

Add README command and a short note about what the Stage 2.2/2.3 smoke proves.

- [ ] **Step 3: Append Raouf logs**

Add AGENT and CHANGELOG entries with files changed, verification, and non-production boundaries.

### Task 4: Verification and Push

- [ ] **Step 1: Run targeted smoke**

Run `scripts/smoke-stage-2-2-2-3.sh`.

- [ ] **Step 2: Run full gates**

Run `git diff --check`, `npm test`, `./scripts/check.sh`, `swift test`, and `swift build`.

- [ ] **Step 3: Commit and push**

Commit with `test: add Stage 2.2 and 2.3 e2e smoke pack`, then push to `origin/main`.
