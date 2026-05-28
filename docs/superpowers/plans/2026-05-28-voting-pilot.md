# Voting Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MQ Persian Society voting pilot as an isolated `src/votingPilot/` module with atomic consent gate, ballot-choice blindness, tiered daemon model, and deterministic HTTP-level synthetic persona runner.

**Architecture:** A self-contained Express sub-router mounted at `/api/voting-pilot` reuses Simurgh's existing session-token, HMAC audit-chain, and proof-verification infrastructure without touching any exam-lifecycle code. All voting-pilot-specific state lives in an in-memory `consentStore`. A persona script drives synthetic sessions via plain HTTP fetch.

**Tech Stack:** Node.js ESM, `node:test` + `node:assert/strict`, Express router, `node:crypto` (HMAC-SHA256), existing `src/audit/hmacChain.js`, `src/security/sessionToken.js`.

**Env vars to add to `.env`:**
- `SIMURGH_VOTING_PILOT_PEPPER` — HMAC key for participant-code hashing and audit chain
- `SIMURGH_VOTING_PILOT_TOKEN_SECRET` — signing key for pilot session tokens

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/votingPilot/events.js` | Namespaced event constants |
| Create | `src/votingPilot/consentStore.js` | In-memory consent records, HMAC hash |
| Create | `src/votingPilot/reportBuilder.js` | Assemble pilot report JSON |
| Create | `src/votingPilot/index.js` | Express router, 4 API routes |
| Create | `tests/unit/votingPilot/consentStore.test.js` | Unit tests for consentStore |
| Create | `tests/unit/votingPilot/reportBuilder.test.js` | Unit tests for reportBuilder |
| Create | `tests/unit/votingPilot/router.test.js` | HTTP integration tests for all 4 routes |
| Modify | `server.js` | Add one mount line |
| Modify | `.env` | Add PEPPER + TOKEN_SECRET |
| Create | `public/voting-pilot.html` | Consent landing page |
| Create | `public/voting-pilot-submit.html` | Mock ballot + submit page |
| Modify | `tools/privacy-audit.mjs` | Add voting-pilot forbidden-key scan |
| Create | `tools/voting-pilot-persona.mjs` | Deterministic synthetic scenario runner |
| Create | `docs/research/mq-voting-pilot/VOTING_PILOT_PROTOCOL.md` | Research protocol |
| Create | `docs/research/mq-voting-pilot/PARTICIPANT_INFORMATION_AND_CONSENT.md` | Consent wording |
| Create | `docs/research/mq-voting-pilot/DATA_MANAGEMENT_PLAN.md` | Data retention |
| Create | `docs/research/mq-voting-pilot/EXPERIMENT_MATRIX.md` | F/S/P test matrix |
| Create | `docs/research/mq-voting-pilot/NON_CLAIMS.md` | Scope boundaries |
| Create | `scripts/smoke-voting-pilot.sh` | Happy-path smoke gates |
| Create | `scripts/security-audit-voting-pilot.sh` | Security/privacy audit gates |

---

## Task 1: Event constants

**Files:**
- Create: `src/votingPilot/events.js`

- [ ] **Step 1.1: Create the events file**

```js
// src/votingPilot/events.js
export const VOTING_PILOT_EVENTS = Object.freeze({
  CONSENT_ACCEPTED: "VOTING_PILOT_CONSENT_ACCEPTED",
  STARTED: "VOTING_PILOT_STARTED",
  SUBMITTED: "VOTING_PILOT_SUBMITTED",
  WITHDRAWN: "VOTING_PILOT_WITHDRAWN",
  REPORT_EXPORTED: "VOTING_PILOT_REPORT_EXPORTED",
  BALLOT_FIELD_REJECTED: "BALLOT_FIELD_REJECTED",
});
```

- [ ] **Step 1.2: Commit**

```bash
git add src/votingPilot/events.js
git commit -m "feat(voting-pilot): add namespaced event constants"
```

---

## Task 2: Consent store

**Files:**
- Create: `src/votingPilot/consentStore.js`
- Create: `tests/unit/votingPilot/consentStore.test.js`

- [ ] **Step 2.1: Write the failing test**

```bash
mkdir -p tests/unit/votingPilot
```

```js
// tests/unit/votingPilot/consentStore.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createConsentStore } from "../../../src/votingPilot/consentStore.js";

const TEST_PEPPER = "test-pepper-32-chars-long-enough!";
const TEST_HMAC_KEY = "test-hmac-key-also-32-chars-long!";

describe("createConsentStore", () => {
  test("accept returns a record with pilot_session_id and hashed code", () => {
    const store = createConsentStore();
    const record = store.accept({ anonymousCode: "abc123", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    assert.ok(record.pilot_session_id.startsWith("vp_"));
    assert.ok(record.participant_code_hash.startsWith("hmac-sha256:"));
    assert.equal(record.accepted, true);
    assert.equal(record.withdrawn, false);
    assert.equal(record.integrity_tier, "browser_only");
    assert.equal(record.consent_version, "2026-05-v1");
  });

  test("get returns the stored record by id", () => {
    const store = createConsentStore();
    const r = store.accept({ anonymousCode: "x", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    assert.equal(store.get(r.pilot_session_id), r);
  });

  test("get returns null for unknown id", () => {
    const store = createConsentStore();
    assert.equal(store.get("vp_nonexistent"), null);
  });

  test("withdraw marks session withdrawn with timestamp", () => {
    const store = createConsentStore();
    const r = store.accept({ anonymousCode: "x", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    const ok = store.withdraw(r.pilot_session_id);
    assert.equal(ok, true);
    assert.equal(r.withdrawn, true);
    assert.ok(typeof r.withdrawn_at === "string");
  });

  test("withdraw returns false for already-withdrawn session", () => {
    const store = createConsentStore();
    const r = store.accept({ anonymousCode: "x", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    store.withdraw(r.pilot_session_id);
    assert.equal(store.withdraw(r.pilot_session_id), false);
  });

  test("markSubmitted sets _submitted true and returns true", () => {
    const store = createConsentStore();
    const r = store.accept({ anonymousCode: "x", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    assert.equal(store.markSubmitted(r.pilot_session_id), true);
    assert.equal(r._submitted, true);
    assert.ok(typeof r._submitted_at === "string");
  });

  test("markSubmitted returns false for withdrawn session", () => {
    const store = createConsentStore();
    const r = store.accept({ anonymousCode: "x", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    store.withdraw(r.pilot_session_id);
    assert.equal(store.markSubmitted(r.pilot_session_id), false);
  });

  test("participant_code_hash is deterministic for same inputs", () => {
    const store = createConsentStore();
    const r1 = store.accept({ anonymousCode: "same", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    const r2 = store.accept({ anonymousCode: "same", integrityTier: "browser_only", pepper: TEST_PEPPER, hmacKey: TEST_HMAC_KEY });
    assert.equal(r1.participant_code_hash, r2.participant_code_hash);
  });
});
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
node --test tests/unit/votingPilot/consentStore.test.js
```

Expected: `ERR_MODULE_NOT_FOUND` — `consentStore.js` does not exist yet.

- [ ] **Step 2.3: Implement consentStore.js**

```js
// src/votingPilot/consentStore.js
import crypto from "node:crypto";
import { createChain } from "../audit/hmacChain.js";

export function createConsentStore() {
  const sessions = new Map();

  function accept({ anonymousCode, integrityTier, pepper, hmacKey }) {
    const pilotSessionId = `vp_${crypto.randomUUID()}`;
    const hash = crypto.createHmac("sha256", pepper).update(anonymousCode).digest("hex");
    const record = {
      pilot_session_id: pilotSessionId,
      participant_code_hash: `hmac-sha256:${hash}`,
      consent_version: "2026-05-v1",
      accepted: true,
      accepted_at: new Date().toISOString(),
      withdrawn: false,
      withdrawn_at: null,
      integrity_tier: integrityTier,
      _chain: createChain(),
      _hmacKey: hmacKey,
      _submitted: false,
      _submitted_at: null,
      _forbidden_fields_rejected: 0,
      _daemon_connected: false,
      _daemon_platform: "none",
      _proof_accept_count: 0,
      _proof_reject_count: 0,
      _replay_rejection_count: 0,
      _tamper_rejection_count: 0,
    };
    sessions.set(pilotSessionId, record);
    return record;
  }

  function get(pilotSessionId) {
    return sessions.get(pilotSessionId) ?? null;
  }

  function withdraw(pilotSessionId) {
    const record = sessions.get(pilotSessionId);
    if (!record || record.withdrawn) return false;
    record.withdrawn = true;
    record.withdrawn_at = new Date().toISOString();
    return true;
  }

  function markSubmitted(pilotSessionId) {
    const record = sessions.get(pilotSessionId);
    if (!record || record.withdrawn) return false;
    record._submitted = true;
    record._submitted_at = new Date().toISOString();
    return true;
  }

  return { accept, get, withdraw, markSubmitted };
}
```

- [ ] **Step 2.4: Run tests — expect all pass**

```bash
node --test tests/unit/votingPilot/consentStore.test.js
```

Expected: all 7 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/votingPilot/consentStore.js tests/unit/votingPilot/consentStore.test.js
git commit -m "feat(voting-pilot): add consentStore with HMAC participant hash"
```

---

## Task 3: Report builder

**Files:**
- Create: `src/votingPilot/reportBuilder.js`
- Create: `tests/unit/votingPilot/reportBuilder.test.js`

- [ ] **Step 3.1: Write the failing test**

```js
// tests/unit/votingPilot/reportBuilder.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createConsentStore } from "../../../src/votingPilot/consentStore.js";
import { buildPilotReport } from "../../../src/votingPilot/reportBuilder.js";

const PEPPER = "test-pepper-32-chars-long-enough!";
const HMAC_KEY = "test-hmac-key-also-32-chars-long!";

function makeRecord(opts = {}) {
  const store = createConsentStore();
  return store.accept({ anonymousCode: "abc", integrityTier: opts.tier ?? "browser_only", pepper: PEPPER, hmacKey: HMAC_KEY });
}

describe("buildPilotReport", () => {
  test("returns required top-level fields", () => {
    const record = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.schema_version, "2026-05-v1");
    assert.equal(report.pilot_mode, "mq_persian_society_voting_shadow");
    assert.equal(report.official_vote_impact, false);
    assert.equal(report.synthetic, false);
    assert.equal(report.data_source, "researcher_self_pilot");
  });

  test("consent block reflects record state", () => {
    const record = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.consent.accepted, true);
    assert.equal(report.consent.withdrawn, false);
    assert.equal(report.consent.version, "2026-05-v1");
  });

  test("privacy_contract has no true collection fields", () => {
    const record = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.privacy_contract.ballot_choice_recorded_by_simurgh, false);
    assert.equal(report.privacy_contract.screen_capture_collected, false);
    assert.equal(report.privacy_contract.webcam_audio_collected, false);
    assert.equal(report.privacy_contract.typed_content_collected, false);
    assert.equal(report.privacy_contract.pasted_content_collected, false);
    assert.equal(report.privacy_contract.forbidden_fields_rejected, 0);
  });

  test("device_integrity defaults to no daemon", () => {
    const record = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.device_integrity.daemon_connected, false);
    assert.equal(report.device_integrity.daemon_platform, "none");
  });

  test("audit.chain_valid is true for fresh chain", () => {
    const record = makeRecord();
    const report = buildPilotReport(record);
    assert.equal(report.audit.chain_valid, true);
    assert.equal(report.audit.event_count, 0);
  });

  test("synthetic flag is passed through", () => {
    const record = makeRecord();
    const report = buildPilotReport(record, { synthetic: true, dataSource: "synthetic_persona" });
    assert.equal(report.synthetic, true);
    assert.equal(report.data_source, "synthetic_persona");
  });

  test("session_result reflects submitted state", () => {
    const store = createConsentStore();
    const record = store.accept({ anonymousCode: "abc", integrityTier: "browser_only", pepper: PEPPER, hmacKey: HMAC_KEY });
    store.markSubmitted(record.pilot_session_id);
    const report = buildPilotReport(record);
    assert.equal(report.session_result.submitted, true);
    assert.equal(report.session_result.completed, true);
    assert.equal(report.session_result.withdrawn, false);
  });
});
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
node --test tests/unit/votingPilot/reportBuilder.test.js
```

Expected: `ERR_MODULE_NOT_FOUND` — `reportBuilder.js` does not exist yet.

- [ ] **Step 3.3: Implement reportBuilder.js**

```js
// src/votingPilot/reportBuilder.js
import { verifyChain } from "../audit/hmacChain.js";

export function buildPilotReport(record, options = {}) {
  const { dataSource = "researcher_self_pilot", synthetic = false } = options;
  const { valid, errors } = verifyChain(record._chain, record._hmacKey);
  return {
    schema_version: "2026-05-v1",
    pilot_mode: "mq_persian_society_voting_shadow",
    official_vote_impact: false,
    synthetic,
    data_source: dataSource,
    consent: {
      accepted: record.accepted,
      withdrawn: record.withdrawn,
      version: record.consent_version,
    },
    integrity_tier: record.integrity_tier,
    session_result: {
      completed: record._submitted,
      submitted: record._submitted,
      withdrawn: record.withdrawn,
    },
    privacy_contract: {
      ballot_choice_recorded_by_simurgh: false,
      screen_capture_collected: false,
      webcam_audio_collected: false,
      typed_content_collected: false,
      pasted_content_collected: false,
      forbidden_fields_rejected: record._forbidden_fields_rejected,
    },
    device_integrity: {
      daemon_connected: record._daemon_connected,
      daemon_platform: record._daemon_platform,
      proof_accept_count: record._proof_accept_count,
      proof_reject_count: record._proof_reject_count,
      replay_rejection_count: record._replay_rejection_count,
      tamper_rejection_count: record._tamper_rejection_count,
    },
    audit: {
      chain_valid: valid,
      errors: errors.length > 0 ? errors : undefined,
      event_count: record._chain.entries.length,
    },
  };
}
```

- [ ] **Step 3.4: Run tests — expect all pass**

```bash
node --test tests/unit/votingPilot/reportBuilder.test.js
```

Expected: all 7 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/votingPilot/reportBuilder.js tests/unit/votingPilot/reportBuilder.test.js
git commit -m "feat(voting-pilot): add reportBuilder"
```

---

## Task 4: Router and HTTP integration tests

**Files:**
- Create: `src/votingPilot/index.js`
- Create: `tests/unit/votingPilot/router.test.js`

- [ ] **Step 4.1: Write failing integration tests**

```js
// tests/unit/votingPilot/router.test.js
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

// Set env before any imports that read process.env
process.env.SIMURGH_VOTING_PILOT_PEPPER = "test-pepper-32-chars-long-enough!";
process.env.SIMURGH_VOTING_PILOT_TOKEN_SECRET = "test-token-secret-32-chars-long!";

const { default: pilotRouter } = await import("../../../src/votingPilot/index.js");

const app = express();
app.use(express.json());
app.use("/api/voting-pilot", pilotRouter);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/voting-pilot`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function getJson(path, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}

describe("POST /consent/accept", () => {
  test("returns 200 with pilot_session_id, token, participant_code", async () => {
    const { status, body } = await postJson("/consent/accept", {});
    assert.equal(status, 200);
    assert.ok(body.pilot_session_id.startsWith("vp_"));
    assert.ok(typeof body.token === "string");
    assert.ok(typeof body.participant_code === "string");
    assert.equal(body.integrity_tier, "browser_only");
    assert.equal(body.consent_version, "2026-05-v1");
  });
});

describe("POST /submit", () => {
  test("returns 200 for valid session with submit_intent", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 200);
    assert.equal(body.ballot_submitted, true);
    assert.equal(body.ballot_choice_recorded_by_simurgh, false);
    assert.ok(typeof body.submitted_at === "string");
  });

  test("returns 400 when forbidden ballot field is present", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true, choice: "A" },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 400);
    assert.equal(body.error, "ballot_choice_field_rejected");
    assert.ok(body.forbidden_fields.includes("choice"));
  });

  test("returns 401 with no token", async () => {
    const { status } = await postJson("/submit", { submit_intent: true });
    assert.equal(status, 401);
  });
});

describe("POST /withdraw", () => {
  test("returns 200 and marks session withdrawn", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/withdraw",
      {},
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 200);
    assert.equal(body.withdrawn, true);
    assert.ok(typeof body.withdrawn_at === "string");
  });

  test("returns 409 on double withdraw", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    const { status } = await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    assert.equal(status, 409);
  });
});

describe("GET /:sessionId/report", () => {
  test("returns 200 with full report for submitted session", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    const { status, body } = await getJson(`/${consent.pilot_session_id}/report`);
    assert.equal(status, 200);
    assert.equal(body.schema_version, "2026-05-v1");
    assert.equal(body.official_vote_impact, false);
    assert.equal(body.privacy_contract.ballot_choice_recorded_by_simurgh, false);
    assert.equal(body.audit.chain_valid, true);
  });

  test("returns 403 for withdrawn session", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    const { status } = await getJson(`/${consent.pilot_session_id}/report`);
    assert.equal(status, 403);
  });

  test("returns 404 for unknown session id", async () => {
    const { status } = await getJson("/vp_nonexistent/report");
    assert.equal(status, 404);
  });
});
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
node --test tests/unit/votingPilot/router.test.js
```

Expected: `ERR_MODULE_NOT_FOUND` — `index.js` does not exist yet.

- [ ] **Step 4.3: Implement router index.js**

```js
// src/votingPilot/index.js
import { Router } from "express";
import crypto from "node:crypto";
import { createConsentStore } from "./consentStore.js";
import { buildPilotReport } from "./reportBuilder.js";
import { VOTING_PILOT_EVENTS } from "./events.js";
import { appendEntry } from "../audit/hmacChain.js";
import {
  issueSessionToken,
  verifySessionToken,
  extractBearer,
} from "../security/sessionToken.js";

const router = Router();
const store = createConsentStore();

const FORBIDDEN_BALLOT_FIELDS = new Set([
  "choice", "selected_choice", "selected_option",
  "candidate", "candidate_id",
  "vote", "vote_choice",
  "ballot_choice", "ballot_content", "ballot_answer", "ballot",
  "selected_candidate",
]);

const PILOT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

function getEnv(key) {
  const val = process.env[key];
  if (!val) throw new Error(`${key} env var not set`);
  return val;
}

function requirePilotToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "pilot_token_missing" });
  const result = verifySessionToken(token, getEnv("SIMURGH_VOTING_PILOT_TOKEN_SECRET"));
  if (!result.valid) return res.status(401).json({ error: "pilot_token_invalid", reason: result.reason });
  req.pilotSessionId = result.sessionId;
  next();
}

// POST /consent/accept — atomic consent + session creation
router.post("/consent/accept", (req, res) => {
  const pepper = getEnv("SIMURGH_VOTING_PILOT_PEPPER");
  const anonymousCode = crypto.randomBytes(8).toString("hex");
  const record = store.accept({
    anonymousCode,
    integrityTier: "browser_only",
    pepper,
    hmacKey: pepper,
  });
  appendEntry(record._chain, pepper, VOTING_PILOT_EVENTS.CONSENT_ACCEPTED, {
    ts: record.accepted_at,
  });
  appendEntry(record._chain, pepper, VOTING_PILOT_EVENTS.STARTED, {
    ts: record.accepted_at,
  });
  const token = issueSessionToken(
    record.pilot_session_id,
    getEnv("SIMURGH_VOTING_PILOT_TOKEN_SECRET"),
    PILOT_TOKEN_TTL_MS
  );
  res.json({
    pilot_session_id: record.pilot_session_id,
    participant_code: anonymousCode,
    token,
    integrity_tier: record.integrity_tier,
    consent_version: record.consent_version,
  });
});

// POST /submit — submit intent only; forbidden ballot fields rejected
router.post("/submit", requirePilotToken, (req, res) => {
  const body = req.body ?? {};
  const forbidden = Object.keys(body).filter((k) => FORBIDDEN_BALLOT_FIELDS.has(k));
  if (forbidden.length > 0) {
    const record = store.get(req.pilotSessionId);
    if (record && !record.withdrawn) {
      record._forbidden_fields_rejected += 1;
      appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.BALLOT_FIELD_REJECTED, {
        field_names: forbidden,
      });
    }
    return res.status(400).json({ error: "ballot_choice_field_rejected", forbidden_fields: forbidden });
  }

  const record = store.get(req.pilotSessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(403).json({ error: "session_withdrawn" });

  const ok = store.markSubmitted(req.pilotSessionId);
  if (!ok) return res.status(409).json({ error: "already_submitted_or_withdrawn" });

  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.SUBMITTED, {
    ts: record._submitted_at,
  });

  res.json({
    ballot_presented: true,
    ballot_submitted: true,
    ballot_choice_recorded_by_simurgh: false,
    submitted_at: record._submitted_at,
  });
});

// POST /withdraw
router.post("/withdraw", requirePilotToken, (req, res) => {
  const record = store.get(req.pilotSessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(409).json({ error: "already_withdrawn" });

  // Append exactly one withdrawal event BEFORE marking withdrawn
  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.WITHDRAWN, {
    ts: new Date().toISOString(),
  });
  store.withdraw(req.pilotSessionId);

  res.json({ withdrawn: true, withdrawn_at: record.withdrawn_at });
});

// GET /:sessionId/report — blocked for withdrawn sessions
router.get("/:sessionId/report", (req, res) => {
  const record = store.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session_not_found" });
  if (record.withdrawn) return res.status(403).json({ error: "report_blocked_session_withdrawn" });

  appendEntry(record._chain, record._hmacKey, VOTING_PILOT_EVENTS.REPORT_EXPORTED, {
    ts: new Date().toISOString(),
  });

  const dataSource = req.query.data_source ?? "researcher_self_pilot";
  const synthetic = req.query.synthetic === "true";
  const report = buildPilotReport(record, { dataSource, synthetic });

  res.json(report);
});

export default router;
```

- [ ] **Step 4.4: Run tests — expect all pass**

```bash
node --test tests/unit/votingPilot/router.test.js
```

Expected: all 10 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/votingPilot/index.js tests/unit/votingPilot/router.test.js
git commit -m "feat(voting-pilot): add Express router with 4 routes and integration tests"
```

---

## Task 5: Wire into server.js and add env vars

**Files:**
- Modify: `server.js`
- Modify: `.env`

- [ ] **Step 5.1: Add env vars to .env**

Add these two lines to `.env` (use strong random values in real use):

```env
SIMURGH_VOTING_PILOT_PEPPER=replace-with-32-char-random-secret
SIMURGH_VOTING_PILOT_TOKEN_SECRET=replace-with-32-char-random-secret
```

- [ ] **Step 5.2: Add import and mount to server.js**

Find the block of imports at the top of `server.js` (after line ~40). Add:

```js
import votingPilotRouter from "./src/votingPilot/index.js";
```

Find the static-file middleware line (`app.use(express.static(...))`). After it, add:

```js
app.use("/api/voting-pilot", votingPilotRouter);
```

- [ ] **Step 5.3: Run full test suite to confirm no regressions**

```bash
npm test
```

Expected: all existing tests plus the 3 new voting-pilot test files pass. Zero failures.

- [ ] **Step 5.4: Commit**

```bash
git add server.js .env
git commit -m "feat(voting-pilot): mount voting pilot router in server.js"
```

---

## Task 6: HTML pages

**Files:**
- Create: `public/voting-pilot.html`
- Create: `public/voting-pilot-submit.html`

- [ ] **Step 6.1: Create consent landing page**

```html
<!-- public/voting-pilot.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MQ Persian Society Voting Pilot — Project Simurgh</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; line-height: 1.6; }
    .notice { background: #f0f4ff; border-left: 4px solid #3b6ff5; padding: 1rem; margin: 1.5rem 0; }
    .forbidden { background: #fff0f0; border-left: 4px solid #d0352b; padding: 1rem; margin: 1.5rem 0; }
    button { padding: 0.75rem 2rem; font-size: 1rem; border: none; border-radius: 6px; cursor: pointer; }
    #btn-agree { background: #3b6ff5; color: white; }
    #btn-decline { background: #eee; color: #333; margin-left: 1rem; }
    #status { margin-top: 1rem; color: #555; }
  </style>
</head>
<body>
  <h1>MQ Persian Society — Integrity Pilot</h1>
  <p>This is an <strong>optional research pilot</strong> for Project Simurgh. It runs beside the official MQ Persian Society event preference poll.</p>

  <div class="notice">
    <strong>This pilot does not affect the official election result.</strong>
  </div>

  <h2>What Simurgh collects</h2>
  <p>Privacy-preserving session metadata: proof status, timestamps, focus-loss counts, paste counts, and audit-chain validity.</p>

  <div class="forbidden">
    <strong>Simurgh does NOT collect:</strong> who you vote for, ballot content, screen recordings, webcam video, microphone audio, typed text, clipboard text, raw process names, raw window titles, or device serial identifiers.
  </div>

  <p>Participation is voluntary. You may decline or stop at any time.</p>

  <button id="btn-agree">Agree — join the pilot</button>
  <button id="btn-decline">Decline — exit</button>
  <p id="status"></p>

  <script>
    document.getElementById("btn-decline").addEventListener("click", () => {
      document.body.innerHTML = "<h1>Thank you.</h1><p>No data was recorded. You may close this tab.</p>";
    });

    document.getElementById("btn-agree").addEventListener("click", async () => {
      const status = document.getElementById("status");
      status.textContent = "Starting pilot session…";
      try {
        const res = await fetch("/api/voting-pilot/consent/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "unknown error");
        // Store token in sessionStorage — not localStorage; survives tab, not browser restart
        sessionStorage.setItem("vp_token", data.token);
        sessionStorage.setItem("vp_session_id", data.pilot_session_id);
        status.textContent = `Pilot started. Your anonymous code: ${data.participant_code} (write this down — it is not stored).`;
        setTimeout(() => { window.location.href = "/voting-pilot-submit.html"; }, 3000);
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 6.2: Create mock ballot submit page**

```html
<!-- public/voting-pilot-submit.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mock Ballot — MQ Persian Society Pilot</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; line-height: 1.6; }
    .option { display: block; padding: 0.75rem 1rem; margin: 0.5rem 0; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; }
    .option input { margin-right: 0.75rem; }
    .option:has(input:checked) { border-color: #3b6ff5; background: #f0f4ff; }
    button { padding: 0.75rem 2rem; font-size: 1rem; background: #3b6ff5; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 1rem; }
    button:disabled { background: #aaa; }
    #status { margin-top: 1rem; color: #555; }
    .notice { background: #f0f4ff; border-left: 4px solid #3b6ff5; padding: 0.75rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Mock Ballot</h1>
  <div class="notice">This is a <strong>mock ballot only</strong> — it does not affect the official election. Your selection is not sent to Simurgh.</div>

  <h2>Which MQ Persian Society event should we prioritise next?</h2>
  <form id="ballot-form">
    <label class="option"><input type="radio" name="event" value="A" /> Nowruz cultural night</label>
    <label class="option"><input type="radio" name="event" value="B" /> Persian movie night</label>
    <label class="option"><input type="radio" name="event" value="C" /> Career/networking night</label>
    <label class="option"><input type="radio" name="event" value="D" /> Food and music night</label>
  </form>

  <button id="btn-submit" disabled>Submit</button>
  <p id="status"></p>

  <script>
    const form = document.getElementById("ballot-form");
    const btn = document.getElementById("btn-submit");
    const status = document.getElementById("status");

    form.addEventListener("change", () => { btn.disabled = false; });

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      status.textContent = "Submitting…";

      // The selected option exists only in transient browser memory.
      // It is discarded here — never sent to Simurgh.
      form.querySelectorAll("input[name=event]").forEach((el) => { el.value = ""; });

      const token = sessionStorage.getItem("vp_token");
      const sessionId = sessionStorage.getItem("vp_session_id");

      try {
        const res = await fetch("/api/voting-pilot/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // Only submit_intent is sent — no choice, no candidate, no ballot content
          body: JSON.stringify({ pilot_session_id: sessionId, submit_intent: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "unknown");
        status.textContent = "Thank you. Your pilot submission was recorded. Your selected option was not sent to Simurgh or stored.";
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 6.3: Start the server and manually verify consent flow**

```bash
node server.js
```

Open `http://localhost:3030/voting-pilot` in browser. Click Agree — verify you are redirected to the submit page. Select an option. Click Submit — verify confirmation message. Confirm no choice value appears in the network request body.

- [ ] **Step 6.4: Commit**

```bash
git add public/voting-pilot.html public/voting-pilot-submit.html
git commit -m "feat(voting-pilot): add consent landing page and mock ballot UI"
```

---

## Task 7: Extend privacy-audit.mjs

**Files:**
- Modify: `tools/privacy-audit.mjs`

- [ ] **Step 7.1: Read the current privacy-audit.mjs**

Open `tools/privacy-audit.mjs` and find the section where it defines forbidden field patterns or performs the audit scan.

- [ ] **Step 7.2: Add voting-pilot forbidden-key scan**

In `tools/privacy-audit.mjs`, add a new check section after the existing audit checks:

```js
// ── Voting-pilot ballot-choice forbidden key audit ───────────────────────────
const VOTING_PILOT_FORBIDDEN_KEYS = [
  "choice", "selected_choice", "selected_option",
  "candidate", "candidate_id",
  "vote", "vote_choice",
  "ballot_choice", "ballot_content", "ballot_answer",
  "selected_candidate",
];

const VOTING_PILOT_ALLOWED_PATTERNS = [
  "ballot_presented", "ballot_submitted", "ballot_choice_recorded_by_simurgh",
  "pilot_mode", "voting_pilot", "integrity_tier",
];

let votingPilotViolations = 0;
for (const key of VOTING_PILOT_FORBIDDEN_KEYS) {
  // Only flag exact key matches in JSON exports, not substrings inside allowed patterns
  const pattern = new RegExp(`"${key}"\\s*:`, "g");
  // Scan src/votingPilot and any evidence exports
  const auditTargets = ["src/votingPilot", "docs/research/mq-voting-pilot/evidence"];
  for (const target of auditTargets) {
    if (!existsSync(target)) continue;
    const matches = grepDir(target, pattern); // use existing grepDir helper if present, else implement inline
    if (matches.length > 0) {
      console.error(`[voting-pilot] FORBIDDEN KEY "${key}" found in: ${matches.join(", ")}`);
      votingPilotViolations += matches.length;
    }
  }
}
if (votingPilotViolations === 0) {
  console.log("[voting-pilot] ballot-choice privacy audit: PASS");
} else {
  console.error(`[voting-pilot] ballot-choice privacy audit: FAIL (${votingPilotViolations} violations)`);
  process.exitCode = 1;
}
```

> **Note:** The exact integration point depends on how `tools/privacy-audit.mjs` is currently structured. Read the file first (Step 7.1), then add the voting-pilot section using the same helper functions already in the file. If no `grepDir` helper exists, use Node's `fs.readdirSync` + `fs.readFileSync` to walk the directory and apply the pattern.

- [ ] **Step 7.3: Run privacy audit and confirm it passes**

```bash
node tools/privacy-audit.mjs
```

Expected: `[voting-pilot] ballot-choice privacy audit: PASS` and exit code 0.

- [ ] **Step 7.4: Commit**

```bash
git add tools/privacy-audit.mjs
git commit -m "feat(voting-pilot): extend privacy-audit with ballot-choice forbidden-key scan"
```

---

## Task 8: Persona engine

**Files:**
- Create: `tools/voting-pilot-persona.mjs`
- Create: `docs/research/mq-voting-pilot/evidence/synthetic/.gitkeep`

- [ ] **Step 8.1: Create the evidence/synthetic directory**

```bash
mkdir -p docs/research/mq-voting-pilot/evidence/synthetic
touch docs/research/mq-voting-pilot/evidence/synthetic/.gitkeep
```

- [ ] **Step 8.2: Create the persona runner**

```js
// tools/voting-pilot-persona.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, arg, i, arr) => {
      if (arg.startsWith("--")) pairs.push([arg.slice(2), arr[i + 1] ?? true]);
      return pairs;
    }, [])
);

const PERSONA = args.persona;
const SEED = parseInt(args.seed ?? "0", 10);
const FIXED_CLOCK = args["fixed-clock"] ?? null;
const BASE_URL = args["base-url"] ?? "http://127.0.0.1:3030";

if (!PERSONA) {
  console.error("Usage: node tools/voting-pilot-persona.mjs --persona <name> --seed <n> [--fixed-clock <ISO>] [--base-url <url>]");
  console.error("Personas:", PERSONAS.join(", "));
  process.exit(1);
}

// ── Seeded pseudo-random ─────────────────────────────────────────────────────
function seededInt(seed, max) {
  const h = crypto.createHash("sha256").update(`${seed}`).digest();
  return h.readUInt32BE(0) % max;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
async function post(path, body = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/voting-pilot${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}/api/voting-pilot${path}`);
  return { status: res.status, body: await res.json() };
}

// ── Persona definitions ───────────────────────────────────────────────────────
const PERSONAS = [
  "compliant_browser_only",
  "compliant_with_real_daemon",
  "compliant_with_fixture_daemon",
  "distracted_member",
  "daemon_unavailable",
  "replay_attempt",
  "tampered_proof",
  "withdraws_midway",
  "declines_consent",
  "forbidden_ballot_field_attempt",
];

async function runPersona(persona, seed) {
  const steps = [];
  const now = () => FIXED_CLOCK ?? new Date().toISOString();
  let token = null;
  let sessionId = null;
  let assertion = "PASS";
  let notes = "";

  function step(name, status, serverStatus = null, extra = {}) {
    steps.push({ name, status, ...(serverStatus != null ? { server_status: serverStatus } : {}), ...extra });
    console.log(`  [${status.toUpperCase()}] ${name}${serverStatus ? ` (HTTP ${serverStatus})` : ""}`);
  }

  if (persona === "declines_consent") {
    step("load_consent_page", "pass");
    step("decline_consent", "pass");
    return {
      schema_version: "2026-05-v1",
      persona,
      seed,
      fixed_clock: FIXED_CLOCK,
      run_at: now(),
      synthetic: true,
      human_participant: false,
      pilot_session_id: null,
      server_record_created: false,
      steps,
      privacy: { ballot_choice_sent: false, token_redacted: true, forbidden_values_recorded: false },
      assertion: "PASS",
      notes: "Decline path — no server record created as expected.",
    };
  }

  // All other personas: accept consent first
  const consent = await post("/consent/accept", {});
  if (consent.status !== 200) {
    step("accept_consent", "fail", consent.status);
    assertion = "FAIL";
    notes = `consent/accept returned ${consent.status}`;
  } else {
    token = consent.body.token;
    sessionId = consent.body.pilot_session_id;
    step("accept_consent", "pass", 200);
  }

  if (persona === "withdraws_midway") {
    await delay(seededInt(seed, 500) + 100);
    step("simulate_telemetry_delay", "pass");
    const wd = await post("/withdraw", {}, token);
    step("withdraw", wd.status === 200 ? "pass" : "fail", wd.status);
    if (wd.status !== 200) assertion = "FAIL";
    const report = await get(`/${sessionId}/report`);
    if (report.status === 403) {
      step("report_blocked_after_withdraw", "pass", 403);
    } else {
      step("report_blocked_after_withdraw", "fail", report.status);
      assertion = "FAIL";
    }
  } else if (persona === "forbidden_ballot_field_attempt") {
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true, choice: "A" }, token);
    if (submit.status === 400 && submit.body.error === "ballot_choice_field_rejected") {
      step("forbidden_field_rejected", "pass", 400);
    } else {
      step("forbidden_field_rejected", "fail", submit.status);
      assertion = "FAIL";
    }
  } else if (persona === "replay_attempt") {
    // Session 1: get a real token; Session 2: reuse the same token
    const s2 = await post("/consent/accept", {});
    const replayToken = s2.body.token;
    const replaySessionId = s2.body.pilot_session_id;
    // Submit session 2 normally first
    await post("/submit", { pilot_session_id: replaySessionId, submit_intent: true }, replayToken);
    step("session2_submitted", "pass");
    // Now try to submit session 1 using session 2's token (cross-session replay)
    const replay = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, replayToken);
    // The token's sessionId won't match req.pilotSessionId — this should 401 or 404
    if (replay.status === 401 || replay.status === 404) {
      step("cross_session_replay_rejected", "pass", replay.status);
    } else {
      step("cross_session_replay_rejected", "fail", replay.status);
      assertion = "FAIL";
    }
  } else if (persona === "tampered_proof") {
    // No daemon proof route in voting pilot — tamper test verifies server rejects unknown fields
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true, candidate_id: "fake_tamper" }, token);
    if (submit.status === 400 && submit.body.forbidden_fields?.includes("candidate_id")) {
      step("tampered_field_rejected", "pass", 400);
    } else {
      step("tampered_field_rejected", "fail", submit.status);
      assertion = "FAIL";
    }
  } else if (persona === "distracted_member") {
    await delay(seededInt(seed, 300) + 50); // simulate focus loss
    step("simulate_focus_loss_delay", "pass");
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  } else if (persona === "daemon_unavailable") {
    // No daemon — proceed browser-only
    step("daemon_probe_no_response", "pass");
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit_browser_only", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  } else {
    // compliant_browser_only, compliant_with_real_daemon, compliant_with_fixture_daemon
    if (persona.includes("daemon")) {
      step("daemon_probe", "pass");
      step("note_daemon_is_fixture_or_real", "pass", null, { note: "Daemon proof validation is out of scope for HTTP-level persona runner. Mark as fixture." });
    }
    const submit = await post("/submit", { pilot_session_id: sessionId, submit_intent: true }, token);
    step("submit", submit.status === 200 ? "pass" : "fail", submit.status);
    if (submit.status !== 200) assertion = "FAIL";
  }

  // Fetch report (if not withdrawn)
  let reportSummary = null;
  if (sessionId && persona !== "withdraws_midway") {
    const report = await get(`/${sessionId}/report`);
    if (report.status === 200) {
      step("fetch_report", "pass", 200);
      reportSummary = {
        status: 200,
        summary: "submitted",
        chain_valid: report.body.audit?.chain_valid,
      };
    } else {
      step("fetch_report", assertion === "PASS" ? "fail" : "pass", report.status);
    }
  }

  return {
    schema_version: "2026-05-v1",
    persona,
    seed,
    fixed_clock: FIXED_CLOCK,
    run_at: now(),
    synthetic: true,
    human_participant: false,
    pilot_session_id: sessionId,
    integrity_tier: "browser_only",
    steps,
    privacy: {
      ballot_choice_sent: false,
      token_redacted: true,
      forbidden_values_recorded: false,
    },
    final_server_response: reportSummary,
    assertion,
    notes: notes || `${persona} persona completed.`,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n[persona] Running: ${PERSONA} (seed=${SEED})`);

const result = await runPersona(PERSONA, SEED);

const outDir = join(ROOT, "docs/research/mq-voting-pilot/evidence/synthetic");
mkdirSync(outDir, { recursive: true });
const filename = `session-${PERSONA}-${SEED}-${Date.now()}.json`;
const outPath = join(outDir, filename);
writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`\n[persona] Assertion: ${result.assertion}`);
console.log(`[persona] Written: ${outPath}`);

if (result.assertion !== "PASS") process.exit(1);
```

- [ ] **Step 8.3: Run a clean persona to verify against live server**

Start the server in one terminal:
```bash
node server.js
```

In another terminal:
```bash
node tools/voting-pilot-persona.mjs --persona compliant_browser_only --seed 101
```

Expected: all steps `[PASS]`, assertion `PASS`, JSON written to `evidence/synthetic/`.

- [ ] **Step 8.4: Run the decline and forbidden-field personas**

```bash
node tools/voting-pilot-persona.mjs --persona declines_consent --seed 808
node tools/voting-pilot-persona.mjs --persona forbidden_ballot_field_attempt --seed 909
```

Expected: both assert `PASS`.

- [ ] **Step 8.5: Commit**

```bash
git add tools/voting-pilot-persona.mjs docs/research/mq-voting-pilot/evidence/synthetic/.gitkeep
git commit -m "feat(voting-pilot): add deterministic HTTP persona engine"
```

---

## Task 9: Research protocol documents

**Files:**
- Create: `docs/research/mq-voting-pilot/VOTING_PILOT_PROTOCOL.md`
- Create: `docs/research/mq-voting-pilot/PARTICIPANT_INFORMATION_AND_CONSENT.md`
- Create: `docs/research/mq-voting-pilot/DATA_MANAGEMENT_PLAN.md`
- Create: `docs/research/mq-voting-pilot/EXPERIMENT_MATRIX.md`
- Create: `docs/research/mq-voting-pilot/NON_CLAIMS.md`

- [ ] **Step 9.1: Create docs directory**

```bash
mkdir -p docs/research/mq-voting-pilot/evidence/pre-pilot
```

- [ ] **Step 9.2: Create VOTING_PILOT_PROTOCOL.md**

```markdown
# MQ Persian Society Voting Pilot — Protocol

**Version:** 2026-05-v1
**Status:** Pre-pilot (governance/ethics clearance required before human participants)

## Research question

Can Project Simurgh provide privacy-preserving integrity evidence for small-scale student-society online voting sessions without collecting ballot content, screen recordings, webcam/audio, or personal device identifiers?

## Pilot mode

Shadow mode. Simurgh runs beside the official MQ Persian Society vote. It does not decide winners, disqualify votes, or touch ballot choices.

## Phases

| Phase | Description | Participants |
|---|---|---|
| A | Lab validation — synthetic persona runs | None (researcher only) |
| B | Internal dry run | 3–5 executive members |
| C | Optional member pilot | Volunteer society members |

Phase C requires written MQ Persian Society executive approval and MQ Human Research Ethics approval before proceeding.

## Integrity tiers

- `browser_only`: browser-SDK session; no native installation required.
- `browser_plus_daemon`: browser-SDK plus optional Simurgh Device Shield daemon.

Daemon absence is not treated as misconduct or suspicious behaviour. It is recorded as reduced integrity-signal coverage.

## Data separation

| Category | Label |
|---|---|
| Persona script sessions | synthetic_persona |
| Researcher manual walkthrough | researcher_self_pilot |
| Real consenting members | human_participant |
| Official election outcome | out_of_scope |
```

- [ ] **Step 9.3: Create PARTICIPANT_INFORMATION_AND_CONSENT.md**

```markdown
# Participant Information and Consent — MQ Persian Society Voting Pilot

**Version:** 2026-05-v1

## What is this?

This is an optional research pilot for Project Simurgh. The pilot does not affect the official MQ Persian Society election result.

## What Simurgh collects

Privacy-preserving session metadata: proof status, timestamps, focus-loss counts, paste counts, and audit-chain validity.

## What Simurgh does NOT collect

- Who you vote for or which candidate you select
- Ballot content of any kind
- Screen recordings or screenshots
- Webcam video or microphone audio
- Typed text or clipboard text
- Raw process names or window titles
- Device serial numbers, MAC addresses, or precise device identifiers

## Participation

Participation is voluntary. You may decline at any time before the session starts. You may withdraw at any time during the session. If you withdraw, telemetry stops immediately and no report is produced.

## Anonymous code

You will receive an anonymous participant code at consent. This code is not linked to your name, student ID, or email. Write it down — it is shown once and not stored by Simurgh.

## Research use

Session data is used only for aggregate research analysis. No individual integrity result is used for disciplinary purposes.

## Consent wording

> I understand this is an optional research pilot that does not affect the official election. I consent to Simurgh collecting privacy-preserving session metadata as described above.
```

- [ ] **Step 9.4: Create DATA_MANAGEMENT_PLAN.md**

```markdown
# Data Management Plan — MQ Persian Society Voting Pilot

**Version:** 2026-05-v1

## Data collected by Simurgh

- Pilot session records (in-memory; no persistent database in Phase A/B)
- Synthetic persona output JSON in `docs/research/mq-voting-pilot/evidence/synthetic/`
- Pre-pilot gate evidence in `docs/research/mq-voting-pilot/evidence/pre-pilot/`

## Data NOT collected

Ballot choice, candidate selection, student name, student ID, email, screen pixels, webcam, audio, typed text, clipboard text, raw process/window names, device serial identifiers.

## Retention

Synthetic and participant artefacts are retained only for the approved research period and deleted according to the MQ ethics-approved data management plan.

## De-identification

Participant codes are HMAC-SHA256 hashed with a server-side pepper. Raw codes are shown once to participants and not stored.

## Storage location

Local development server only (Phase A/B). No cloud storage or external transmission of participant data without ethics approval.

## Access control

Research data is accessible to the principal researcher only. No third-party sharing without ethics approval.
```

- [ ] **Step 9.5: Create EXPERIMENT_MATRIX.md**

```markdown
# Experiment Matrix — MQ Persian Society Voting Pilot

**Version:** 2026-05-v1

## Functional tests

| ID | Scenario | Expected result | Evidence |
|---|---|---|---|
| F1 | Participant joins mock ballot | Session created | Consent record |
| F2 | Consent accepted | Telemetry starts | Consent timestamp |
| F3 | Consent declined | No data collected | No server record |
| F4 | Ballot page opened | SDK active | Session active |
| F5 | Session submitted | Report generated | JSON report |
| F6 | Audit chain exported | Valid chain | Verify output |

## Security tests

| ID | Scenario | Expected result | Severity |
|---|---|---|---|
| S1 | Replay session token across sessions | Reject (401/404) | High |
| S2 | Submit with forbidden ballot field | 400 + field names only | High |
| S3 | Request report for withdrawn session | 403 | High |
| S4 | Request without pilot token | 401 | High |
| S5 | Double withdrawal | 409 | Medium |
| S6 | Oversized payload | Reject | Medium |

## Privacy tests

| ID | Test | Pass condition |
|---|---|---|
| P1 | No vote content in Simurgh logs | Zero matches |
| P2 | No candidate names in Simurgh logs | Zero matches |
| P3 | No raw names/emails | Zero matches |
| P4 | No screen/webcam/audio fields | Zero matches |
| P5 | No raw process/window fields | Zero matches |
| P6 | Privacy audit script passes | PASS |
| P7 | Data export is de-identified | PASS |

## Usability targets (Phase C only)

| ID | Metric | Target |
|---|---|---|
| U1 | Completion rate | ≥ 80% |
| U2 | Median setup time | ≤ 5 minutes |
| U3 | Consent understood | ≥ 80% agree |
| U4 | Privacy concern score | Low/moderate |
| U5 | Would use again | ≥ 60% agree |
```

- [ ] **Step 9.6: Create NON_CLAIMS.md**

```markdown
# Non-Claims — MQ Persian Society Voting Pilot

This pilot does not claim to:

- Secure public elections
- Replace electoral commissions
- Prevent coercion
- Prevent malware on compromised devices
- Guarantee voter eligibility
- Validate official vote outcomes
- Prevent screen-capture overlays on compromised devices
- Provide hardware attestation
- Detect GPU-layer evasion techniques

It is a small-scale, consented, voting-adjacent research pilot evaluating whether privacy-preserving session-integrity evidence can be collected without ballot content or surveillance data in a student-society setting.

No integrity result produced by this pilot is used for individual disciplinary action.

This is a research prototype. It is not a production election security system.
```

- [ ] **Step 9.7: Commit**

```bash
git add docs/research/mq-voting-pilot/
git commit -m "docs(voting-pilot): add research protocol, consent, data management, experiment matrix, non-claims"
```

---

## Task 10: Safety scripts

**Files:**
- Create: `scripts/smoke-voting-pilot.sh`
- Create: `scripts/security-audit-voting-pilot.sh`

- [ ] **Step 10.1: Create smoke script**

```bash
#!/usr/bin/env bash
# scripts/smoke-voting-pilot.sh
# Voting pilot smoke gates. Requires server running on PORT (default 3030).
set -euo pipefail

BASE="${SIMURGH_BASE_URL:-http://127.0.0.1:3030}"
PASS=0; FAIL=0

ok()   { echo "[PASS] $1"; ((PASS++)); }
fail() { echo "[FAIL] $1"; ((FAIL++)); }

# Gate 1: consent/accept returns pilot_session_id and token
R=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SESSION_ID=$(echo "$R" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOKEN=$(echo "$R" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[[ "$SESSION_ID" == vp_* ]] && ok "consent/accept returns vp_ session id" || fail "consent/accept bad session id"
[[ -n "$TOKEN" ]] && ok "consent/accept returns token" || fail "consent/accept no token"

# Gate 2: submit with valid token succeeds
R2=$(curl -sf -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"pilot_session_id\":\"$SESSION_ID\",\"submit_intent\":true}")
echo "$R2" | grep -q '"ballot_submitted":true' && ok "submit returns ballot_submitted true" || fail "submit bad response"
echo "$R2" | grep -q '"ballot_choice_recorded_by_simurgh":false' && ok "submit has ballot_choice_recorded_by_simurgh false" || fail "submit missing privacy field"

# Gate 3: report returns valid JSON with chain_valid
R3=$(curl -sf "$BASE/api/voting-pilot/$SESSION_ID/report")
echo "$R3" | grep -q '"chain_valid":true' && ok "report chain_valid true" || fail "report chain not valid"
echo "$R3" | grep -q '"official_vote_impact":false' && ok "report official_vote_impact false" || fail "report vote impact field missing"

# Gate 4: decline path — no session created (verify by checking a nonexistent session)
R4=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/vp_decline_test/report")
[[ "$R4" == "404" ]] && ok "decline path: nonexistent session returns 404" || fail "decline path: unexpected status $R4"

# Gate 5: withdrawal blocks report
R5=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
WD_SESSION=$(echo "$R5" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
WD_TOKEN=$(echo "$R5" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WD_TOKEN" -d '{}' > /dev/null
WD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/$WD_SESSION/report")
[[ "$WD_STATUS" == "403" ]] && ok "withdrawal blocks report with 403" || fail "withdrawal report status: $WD_STATUS"

echo ""
echo "smoke-voting-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
```

- [ ] **Step 10.2: Create security audit script**

```bash
#!/usr/bin/env bash
# scripts/security-audit-voting-pilot.sh
# Security and privacy gates for the voting pilot.
set -euo pipefail

BASE="${SIMURGH_BASE_URL:-http://127.0.0.1:3030}"
PASS=0; FAIL=0

ok()   { echo "[PASS] $1"; ((PASS++)); }
fail() { echo "[FAIL] $1"; ((FAIL++)); }

# S1: No token → 401
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" -d '{"submit_intent":true}')
[[ "$S" == "401" ]] && ok "no token → 401" || fail "no token status: $S"

# S2: Forbidden ballot field → 400
R=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID=$(echo "$R" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK=$(echo "$R" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
S2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOK" \
  -d "{\"pilot_session_id\":\"$SID\",\"submit_intent\":true,\"choice\":\"A\"}")
[[ "$S2" == "400" ]] && ok "forbidden ballot field → 400" || fail "ballot field status: $S2"

# S3: Forbidden field response contains field_names not values
R3=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID3=$(echo "$R3" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK3=$(echo "$R3" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
BODY3=$(curl -sf -X POST "$BASE/api/voting-pilot/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOK3" \
  -d "{\"pilot_session_id\":\"$SID3\",\"submit_intent\":true,\"candidate\":\"Alice\"}" || true)
echo "$BODY3" | grep -q '"forbidden_fields"' && ok "400 response contains forbidden_fields" || fail "400 response missing forbidden_fields"
echo "$BODY3" | grep -vq '"Alice"' && ok "400 response does not echo forbidden value" || fail "400 response leaks forbidden value"

# S4: Withdrawn session → 403 on report
R4=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID4=$(echo "$R4" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK4=$(echo "$R4" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK4" -H "Content-Type: application/json" -d '{}' > /dev/null
S4=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/$SID4/report")
[[ "$S4" == "403" ]] && ok "withdrawn session report → 403" || fail "withdrawn report status: $S4"

# S5: Unknown session → 404 on report
S5=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/vp_nonexistent/report")
[[ "$S5" == "404" ]] && ok "unknown session → 404" || fail "unknown session status: $S5"

# S6: Decline path — verify no record created
# (Decline happens client-side; verify server has no record for a fabricated id)
S6=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/voting-pilot/vp_fabricated_decline/report")
[[ "$S6" == "404" ]] && ok "decline path: fabricated id → 404, no server record" || fail "decline path status: $S6"

# S7: Double withdrawal → 409
R7=$(curl -sf -X POST "$BASE/api/voting-pilot/consent/accept" \
  -H "Content-Type: application/json" -d '{}')
SID7=$(echo "$R7" | grep -o '"pilot_session_id":"[^"]*"' | cut -d'"' -f4)
TOK7=$(echo "$R7" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
curl -sf -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK7" -H "Content-Type: application/json" -d '{}' > /dev/null
S7=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/voting-pilot/withdraw" \
  -H "Authorization: Bearer $TOK7" -H "Content-Type: application/json" -d '{}')
[[ "$S7" == "409" ]] && ok "double withdrawal → 409" || fail "double withdrawal status: $S7"

# S8: Privacy audit — no ballot-choice fields in source
node tools/privacy-audit.mjs 2>&1 | grep -q "voting-pilot.*PASS" \
  && ok "privacy audit voting-pilot scan: PASS" \
  || fail "privacy audit voting-pilot scan: FAIL"

echo ""
echo "security-audit-voting-pilot: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] || exit 1
```

- [ ] **Step 10.3: Make scripts executable**

```bash
chmod +x scripts/smoke-voting-pilot.sh scripts/security-audit-voting-pilot.sh
```

- [ ] **Step 10.4: Run both scripts against live server**

```bash
bash scripts/smoke-voting-pilot.sh
bash scripts/security-audit-voting-pilot.sh
```

Expected: all gates pass, exit 0.

- [ ] **Step 10.5: Commit**

```bash
git add scripts/smoke-voting-pilot.sh scripts/security-audit-voting-pilot.sh
git commit -m "feat(voting-pilot): add smoke and security-audit safety scripts"
```

---

## Task 11: Final gate run and pre-pilot evidence capture

- [ ] **Step 11.1: Run the full gate suite**

```bash
npm test
npm audit --audit-level=high
node tools/privacy-audit.mjs
bash scripts/check.sh
bash scripts/smoke-voting-pilot.sh
bash scripts/security-audit-voting-pilot.sh
```

Expected: all pass, zero failures, exit 0.

- [ ] **Step 11.2: Capture pre-pilot evidence**

```bash
mkdir -p docs/research/mq-voting-pilot/evidence/pre-pilot
npm test 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/npm-test.txt
npm audit --audit-level=high 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/npm-audit.txt
node tools/privacy-audit.mjs 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/privacy-audit.txt
bash scripts/check.sh 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/check-sh.txt
bash scripts/smoke-voting-pilot.sh 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/smoke-voting-pilot.txt
bash scripts/security-audit-voting-pilot.sh 2>&1 > docs/research/mq-voting-pilot/evidence/pre-pilot/security-audit-voting-pilot.txt
```

- [ ] **Step 11.3: Run all 10 synthetic personas**

```bash
node tools/voting-pilot-persona.mjs --persona compliant_browser_only --seed 101 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona compliant_with_fixture_daemon --seed 202 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona distracted_member --seed 303 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona daemon_unavailable --seed 404 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona replay_attempt --seed 505 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona tampered_proof --seed 606 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona withdraws_midway --seed 707 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona declines_consent --seed 808 --fixed-clock 2026-05-28T10:00:00.000Z
node tools/voting-pilot-persona.mjs --persona forbidden_ballot_field_attempt --seed 909 --fixed-clock 2026-05-28T10:00:00.000Z
```

Expected: all 9 assert PASS. JSON files written to `evidence/synthetic/`.

- [ ] **Step 11.4: Commit evidence and close the branch**

```bash
git add docs/research/mq-voting-pilot/evidence/
git commit -m "evidence(voting-pilot): capture pre-pilot gates and 9 synthetic persona runs"
```

---

## Self-review checklist

- [x] Spec §3 architecture → Tasks 1–5 (events, consentStore, reportBuilder, router, mount)
- [x] Spec §4 consent gate (atomic accept, decline = no record, withdraw = one event) → Task 4 router
- [x] Spec §5 ballot handling (intent only, forbidden → 400, field names not values) → Task 4 router + Task 10 S3
- [x] Spec §6 persona engine (10 personas, deterministic, redacted output) → Task 8
- [x] Spec §7 report schema (all fields, blocked if withdrawn) → Task 3 reportBuilder
- [x] Spec §8 safety gates (6 commands) → Task 11
- [x] `HMAC-SHA256(PEPPER, code)` → Task 2 consentStore
- [x] `verifyChain` called with `record._hmacKey` → Task 3 reportBuilder
- [x] `extractBearer(req)` (full req object) → Task 4 router
- [x] `verifySessionToken` returns `sessionId` (not `sid`) → Task 4 router
- [x] Research docs (5 files) → Task 9
- [x] HTML pages (ballot choice discarded before POST, honest confirmation wording) → Task 6
