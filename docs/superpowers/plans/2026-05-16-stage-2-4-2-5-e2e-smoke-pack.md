# Stage 2.4 + 2.5 E2E Smoke Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Stage 2.4 + Stage 2.5 closeout smoke pack that walks SDK load, daemon pairing/proof, scanner risk, report, audit, and privacy rejection paths before Stage 2.6 starts.

**Architecture:** Keep the CI-safe smoke as a shell wrapper plus one Node E2E driver. The shell script owns server lifecycle and macOS-only daemon checks; the Node driver owns API flows, deterministic P-256 mock daemon signatures, negative proof tests, report checks, audit checks, and SDK static import checks.

**Tech Stack:** Bash, Node 22 ESM, Node built-in `crypto`, built-in `fetch`, existing Express routes, existing SwiftPM daemon package.

---

### Task 1: CI-Safe Node E2E Driver

**Files:**

- Create: `tests/e2e/stage24_25_smoke.mjs`

- [ ] **Step 1: Write the failing driver invocation**

Run:

```bash
node tests/e2e/stage24_25_smoke.mjs --base-url http://127.0.0.1:33100 --hardened-base-url http://127.0.0.1:33101
```

Expected: fail because `tests/e2e/stage24_25_smoke.mjs` does not exist yet.

- [ ] **Step 2: Implement deterministic proof helpers**

Add helpers for `requestJson`, `assert`, `canonicalDaemonPayload`, `createMockDaemonIdentity`, `signPayload`, `makePairingPayload`, `makeProofPayload`, and `standardTelemetry`. Use P-256 DER/SPKI public keys and DER signatures to match `src/device/daemonProof.js`.

- [ ] **Step 3: Implement SDK checks**

Check that `public/sdk/simurgh-browser-sdk.js` exists, imports in Node, exposes `createSimurghClient`, and that `public/index.html` references `simurgh-browser-sdk.js`.

- [ ] **Step 4: Implement the full API smoke flow**

Create an exam, join a session, accept privacy, start the exam, request pair challenge, pair a mock daemon, send a healthy signed scanner proof, send a signed risk proof, reject tampered proof, reject replayed proof, reject raw local fields, submit, fetch report, verify audit, and inspect dashboard/session state.

- [ ] **Step 5: Implement hardened-mode smoke**

Against the hardened server, create an exam/session and confirm telemetry without `daemon_proof` returns `428 daemon_proof_required` and audit contains `DAEMON_MISSING`.

- [ ] **Step 6: Run the driver**

Run the driver against two already-running local servers. Expected: `Stage 2.4/2.5 E2E smoke passed`.

### Task 2: Shell Wrapper and macOS Local Checks

**Files:**

- Create: `scripts/smoke-stage-2-4-2-5.sh`

- [ ] **Step 1: Start optional and hardened demo servers**

Use `SIMURGH_DEMO_MODE=1 PORT=33100 node server.js` and `SIMURGH_DEMO_MODE=1 SIMURGH_REQUIRE_DAEMON=true PORT=33101 node server.js`. Wait for `/health`, and clean up both PIDs on exit.

- [ ] **Step 2: Call the Node E2E driver**

Run:

```bash
node tests/e2e/stage24_25_smoke.mjs --base-url http://127.0.0.1:33100 --hardened-base-url http://127.0.0.1:33101
```

- [ ] **Step 3: Add macOS-only daemon checks**

On Darwin with Swift available, run `swift build`, `swift test`, `swift run SimurghDaemon doctor`, verify doctor output has no forbidden terms, check `swift run SimurghDaemon --help`, and run LaunchAgent install/uninstall scripts in `--dry-run` mode if supported.

- [ ] **Step 4: Run privacy audit**

Run `node tools/privacy-audit.mjs` and grep generated output folders for forbidden local-data fields, allowing only policy/test/source references outside generated data.

### Task 3: Quality Gate and Documentation

**Files:**

- Modify: `scripts/check.sh`
- Modify: `README.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add check.sh gate**

In the full, non-quick Stage 2.5 area, run `scripts/smoke-stage-2-4-2-5.sh` and report the gate as `Stage 2.4/2.5 E2E smoke: SDK + daemon + scanner + signed proof`.

- [ ] **Step 2: Document usage**

Add README instructions for `scripts/smoke-stage-2-4-2-5.sh`, clarifying CI-safe checks and macOS-only daemon checks.

- [ ] **Step 3: Append Raouf logs**

Add a Raouf entry to `AGENT.md` and `CHANGELOG.md` with scope, files changed, verification, and Stage 2.6 follow-up boundary.

### Task 4: Verification

**Files:**

- No new files.

- [ ] **Step 1: Run targeted smoke**

Run:

```bash
scripts/smoke-stage-2-4-2-5.sh
```

Expected: pass.

- [ ] **Step 2: Run repo gates**

Run:

```bash
git diff --check
npm test
./scripts/check.sh
cd tools/simurgh-daemon-macos && swift test && swift build && cd ../..
```

Expected: all pass.
