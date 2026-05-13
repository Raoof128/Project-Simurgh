# Simurgh Academic Shield — Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Simurgh server with a privacy-first academic integrity workflow — exam lifecycle, category-based risk scoring, academic event timeline, session state machine, HMAC-linked reports, and an updated instructor dashboard.

**Architecture:** `server.js` remains the single entry point and route owner. New modules are added under `src/` and imported into `server.js` at targeted integration points. No routes are removed or renamed; only new routes are added. Existing sessions Map is extended in-place.

**Tech Stack:** Node 22 (ESM), Express 4, Anthropic SDK, `node:test` + `node:assert/strict` for all tests, `node:crypto` for hashing and HMAC.

**Design spec:** `docs/superpowers/specs/2026-05-13-simurgh-academic-shield-design.md`

---

## File Map

### New files

| File                                    | Responsibility                                        |
| --------------------------------------- | ----------------------------------------------------- |
| `src/config/env.js`                     | Central export of new Stage 1 env vars                |
| `src/privacy/privacyConfig.js`          | Static config: what is collected, what is forbidden   |
| `src/privacy/normaliseTelemetry.js`     | Enforce privacy config on sanitised telemetry         |
| `src/privacy/hashIdentity.js`           | SHA-256 student identifier hashing                    |
| `src/storage/memoryStore.js`            | Simple Map-based namespace store factory              |
| `src/academic/riskScoring.js`           | Local heuristic scorer → categories + composite score |
| `src/academic/academicEvents.js`        | Named event emitter with taxonomy constants           |
| `src/academic/exams.js`                 | Exam registry (create, get, list)                     |
| `src/academic/sessions.js`              | Session state machine (lifecycle transitions)         |
| `src/academic/reportBuilder.js`         | Assembles JSON report from session state              |
| `src/audit/hmacChain.js`                | Module wrapper around HMAC chain logic                |
| `src/audit/verifyAudit.js`              | Chain integrity verifier                              |
| `src/helper/helperState.js`             | Helper connected/missing status tracker               |
| `tests/unit/normaliseTelemetry.test.js` |                                                       |
| `tests/unit/hashIdentity.test.js`       |                                                       |
| `tests/unit/memoryStore.test.js`        |                                                       |
| `tests/unit/riskScoring.test.js`        |                                                       |
| `tests/unit/academicEvents.test.js`     |                                                       |
| `tests/unit/sessions.test.js`           |                                                       |
| `tests/unit/hmacChain.test.js`          |                                                       |
| `tests/unit/reportBuilder.test.js`      |                                                       |
| `data/exams.json`                       | Seeded demo exam (created on first start)             |

### Modified files

| File                     | What changes                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `package.json`           | Add `"test"` script                                                                        |
| `server.js`              | Import new modules; replace `localHeuristic` call; extend session object; add 7 new routes |
| `public/index.html`      | Add privacy notice banner, helper status, session lifecycle flow                           |
| `public/instructor.html` | Add risk score cards, event timeline, filter bar, report/verify buttons                    |
| `README.md`              | Add "Simurgh Academic Shield" section                                                      |
| `AGENT.md`               | Add Raouf: changelog entry                                                                 |
| `CHANGELOG.md`           | Add Raouf: changelog entry                                                                 |

---

## Task 1 — Test runner setup

**Files:**

- Modify: `package.json`
- Create: `tests/unit/` (directory)

- [ ] **Step 1: Add test script to package.json**

Open `package.json`. Replace the `"scripts"` block with:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js",
  "test": "node --test tests/unit/*.test.js"
}
```

- [ ] **Step 2: Create test directory**

```bash
mkdir -p tests/unit
```

- [ ] **Step 3: Verify test runner works with a smoke test**

Create `tests/unit/smoke.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("test runner works", () => {
  assert.equal(1 + 1, 2);
});
```

Run:

```bash
npm test
```

Expected: `▶ test runner works` → PASS. 1 passing.

- [ ] **Step 4: Delete smoke test**

```bash
rm tests/unit/smoke.test.js
```

- [ ] **Step 5: Commit**

```bash
git add package.json tests/
git commit -m "chore: add node:test runner"
```

---

## Task 2 — Config and privacy foundation

**Files:**

- Create: `src/config/env.js`
- Create: `src/privacy/privacyConfig.js`

No tests needed — these are pure configuration objects.

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/config src/privacy src/academic src/audit src/helper src/storage
```

- [ ] **Step 2: Create `src/config/env.js`**

```js
// New Stage 1 env vars. Existing vars (API_KEY, INSTRUCTOR_TOKEN, etc.) stay in server.js.
export const stagingConfig = {
  scoringMode: process.env.SIMURGH_SCORING_MODE || "hybrid",
  claudeOnSafe: process.env.SIMURGH_CLAUDE_ON_SAFE !== "true", // default: skip Claude on Safe
  claudeOnWarning: process.env.SIMURGH_CLAUDE_ON_WARNING !== "false", // default: call Claude
  claudeOnCritical: process.env.SIMURGH_CLAUDE_ON_CRITICAL !== "false", // default: call Claude
  retentionDays: Number(process.env.SIMURGH_RETENTION_DAYS) || 30,
  debugRawProcessNames: process.env.SIMURGH_DEBUG_RAW_PROCESS_NAMES === "true",
};
```

- [ ] **Step 3: Create `src/privacy/privacyConfig.js`**

```js
export const privacyConfig = {
  // Forbidden — never collected or stored
  collectScreenPixels: false,
  collectWebcamFrames: false,
  collectAudio: false,
  collectPasteContent: false,
  collectTypedContent: false,
  collectBiometrics: false,

  // Allowed — metadata only
  collectPasteLength: true,
  collectFocusEvents: true,
  collectTypingCadence: true,
  collectHelperStatus: true,
  collectDisplayAffinitySignals: true,

  hashStudentIdentifiers: true,
  retentionDays: 30,
  maxKeyIntervalsStored: 200,
};
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add Stage 1 config and privacy config modules"
```

---

## Task 3 — Privacy: telemetry normaliser

**Files:**

- Create: `src/privacy/normaliseTelemetry.js`
- Create: `tests/unit/normaliseTelemetry.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/normaliseTelemetry.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normaliseTelemetry } from "../../src/privacy/normaliseTelemetry.js";

describe("normaliseTelemetry", () => {
  test("passes through allowed metadata fields", () => {
    const input = {
      keystrokes: 42,
      chars_typed: 100,
      effective_wpm: 80,
      focus_losses: 1,
      time_off_window_ms: 2000,
      pastes: 1,
      paste_payload_chars: 50,
      max_idle_gap_ms: 3000,
      window_seconds: 5,
    };
    const result = normaliseTelemetry(input);
    assert.equal(result.keystrokes, 42);
    assert.equal(result.paste_payload_chars, 50);
    assert.equal(result.focus_losses, 1);
  });

  test("strips any content fields that should never be collected", () => {
    const input = {
      keystrokes: 10,
      paste_content: "secret text",
      typed_content: "answer here",
      screen_data: "base64stuff",
    };
    const result = normaliseTelemetry(input);
    assert.equal(result.paste_content, undefined);
    assert.equal(result.typed_content, undefined);
    assert.equal(result.screen_data, undefined);
    assert.equal(result.keystrokes, 10);
  });

  test("adds privacy_mode annotation", () => {
    const result = normaliseTelemetry({ keystrokes: 5 });
    assert.equal(result._privacy_mode, "metadata_only");
  });

  test("caps key_intervals array to maxKeyIntervalsStored", () => {
    const intervals = Array.from({ length: 500 }, (_, i) => i);
    const result = normaliseTelemetry({ keystrokes: 5, key_intervals: intervals });
    assert.ok(result.key_intervals.length <= 200);
  });

  test("returns null for null input", () => {
    assert.equal(normaliseTelemetry(null), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../../src/privacy/normaliseTelemetry.js'`

- [ ] **Step 3: Create `src/privacy/normaliseTelemetry.js`**

```js
import { privacyConfig } from "./privacyConfig.js";

// Fields that must never appear in stored or processed telemetry.
const FORBIDDEN_FIELDS = new Set([
  "paste_content",
  "typed_content",
  "screen_data",
  "webcam_frame",
  "audio_data",
  "biometric_data",
  "student_name",
  "raw_identity",
]);

// Fields explicitly allowed by the privacy config.
const ALLOWED_FIELDS = new Set([
  "keystrokes",
  "chars_typed",
  "effective_wpm",
  "focus_losses",
  "time_off_window_ms",
  "pastes",
  "paste_payload_chars",
  "max_idle_gap_ms",
  "window_seconds",
  "key_intervals",
]);

export function normaliseTelemetry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const out = {};

  for (const [k, v] of Object.entries(raw)) {
    if (FORBIDDEN_FIELDS.has(k)) continue; // hard strip
    if (!ALLOWED_FIELDS.has(k)) continue; // strict allowlist
    out[k] = v;
  }

  // Cap key_intervals to prevent oversized payloads.
  if (Array.isArray(out.key_intervals)) {
    out.key_intervals = out.key_intervals.slice(0, privacyConfig.maxKeyIntervalsStored);
  }

  out._privacy_mode = "metadata_only";
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/privacy/normaliseTelemetry.js tests/unit/normaliseTelemetry.test.js
git commit -m "feat: add privacy telemetry normaliser with allowlist enforcement"
```

---

## Task 4 — Privacy: identity hashing

**Files:**

- Create: `src/privacy/hashIdentity.js`
- Create: `tests/unit/hashIdentity.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/hashIdentity.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hashStudentId } from "../../src/privacy/hashIdentity.js";

describe("hashStudentId", () => {
  test("returns a 64-char hex string", () => {
    const result = hashStudentId("john.doe@example.com");
    assert.equal(typeof result, "string");
    assert.equal(result.length, 64);
    assert.match(result, /^[0-9a-f]{64}$/);
  });

  test("same input always produces same hash", () => {
    const a = hashStudentId("student123");
    const b = hashStudentId("student123");
    assert.equal(a, b);
  });

  test("different inputs produce different hashes", () => {
    const a = hashStudentId("alice");
    const b = hashStudentId("bob");
    assert.notEqual(a, b);
  });

  test("coerces non-string input to string", () => {
    const result = hashStudentId(12345);
    assert.equal(result.length, 64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/privacy/hashIdentity.js`**

```js
import crypto from "node:crypto";

export function hashStudentId(raw) {
  return crypto.createHash("sha256").update(String(raw)).digest("hex");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/privacy/hashIdentity.js tests/unit/hashIdentity.test.js
git commit -m "feat: add SHA-256 student identity hashing"
```

---

## Task 5 — Storage: memory store

**Files:**

- Create: `src/storage/memoryStore.js`
- Create: `tests/unit/memoryStore.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/memoryStore.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getStore } from "../../src/storage/memoryStore.js";

describe("memoryStore", () => {
  test("returns a Map for a namespace", () => {
    const store = getStore("exams");
    assert.ok(store instanceof Map);
  });

  test("same namespace returns same Map instance", () => {
    const a = getStore("sessions");
    const b = getStore("sessions");
    assert.equal(a, b);
  });

  test("different namespaces return different Maps", () => {
    const a = getStore("ns_a");
    const b = getStore("ns_b");
    assert.notEqual(a, b);
  });

  test("items set in a namespace persist", () => {
    const store = getStore("test_persist");
    store.set("key1", { value: 42 });
    const store2 = getStore("test_persist");
    assert.deepEqual(store2.get("key1"), { value: 42 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/storage/memoryStore.js`**

```js
const stores = new Map();

export function getStore(namespace) {
  if (!stores.has(namespace)) stores.set(namespace, new Map());
  return stores.get(namespace);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/storage/memoryStore.js tests/unit/memoryStore.test.js
git commit -m "feat: add namespace memory store"
```

---

## Task 6 — Academic: risk scoring

**Files:**

- Create: `src/academic/riskScoring.js`
- Create: `tests/unit/riskScoring.test.js`

This is the most important module. It replaces the existing `localHeuristic` function in server.js.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/riskScoring.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scoreAcademicRisk } from "../../src/academic/riskScoring.js";

const baseline = {
  keystrokes: 20,
  chars_typed: 80,
  effective_wpm: 60,
  focus_losses: 0,
  time_off_window_ms: 0,
  pastes: 0,
  paste_payload_chars: 0,
  max_idle_gap_ms: 0,
  window_seconds: 5,
};

describe("scoreAcademicRisk", () => {
  test("returns Safe for normal exam behaviour", () => {
    const result = scoreAcademicRisk(
      baseline,
      { connected: true, hostileCount: 0 },
      { reconnects: 0 }
    );
    assert.equal(result.risk_level, "Safe");
    assert.ok(result.risk_score < 40);
  });

  test("returns all required output fields", () => {
    const result = scoreAcademicRisk(baseline, {}, {});
    assert.ok("risk_level" in result);
    assert.ok("risk_score" in result);
    assert.ok("confidence" in result);
    assert.ok("categories" in result);
    assert.ok("recommendation" in result);
    assert.ok("source" in result);
    assert.equal(result.source.score, "local_heuristic");
  });

  test("raises Warning for a medium paste", () => {
    const t = { ...baseline, paste_payload_chars: 90, pastes: 1 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.ok(result.risk_level === "Warning" || result.risk_level === "Critical");
  });

  test("raises Critical for large paste with minimal typing", () => {
    const t = { ...baseline, paste_payload_chars: 250, pastes: 1, chars_typed: 5 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.equal(result.risk_level, "Critical");
    assert.ok(result.risk_score >= 70);
  });

  test("raises Critical when helper reports excluded window (affinity override)", () => {
    const result = scoreAcademicRisk(
      baseline,
      { connected: true, hostileCount: 1 },
      { reconnects: 0 }
    );
    assert.equal(result.risk_level, "Critical");
    assert.ok(result.risk_score >= 85);
    assert.equal(result.categories.affinity_risk, 100);
  });

  test("risk_score is between 0 and 100", () => {
    const extreme = { ...baseline, paste_payload_chars: 999, focus_losses: 99, effective_wpm: 999 };
    const result = scoreAcademicRisk(
      extreme,
      { connected: false, hostileCount: 3 },
      { reconnects: 5 }
    );
    assert.ok(result.risk_score >= 0 && result.risk_score <= 100);
  });

  test("recommendation says manual review for Critical", () => {
    const t = { ...baseline, paste_payload_chars: 250, chars_typed: 5 };
    const result = scoreAcademicRisk(t, { connected: true, hostileCount: 0 }, { reconnects: 0 });
    assert.match(result.recommendation, /[Mm]anual review/);
    assert.match(result.recommendation, /[Nn]o automatic/);
  });

  test("confidence is between 0 and 1", () => {
    const result = scoreAcademicRisk(baseline, {}, {});
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/academic/riskScoring.js`**

```js
// Weights must sum to 1.0
const WEIGHTS = {
  paste_risk: 0.25,
  focus_risk: 0.2,
  typing_risk: 0.15,
  idle_risk: 0.1,
  affinity_risk: 0.2,
  helper_risk: 0.05,
  session_risk: 0.05,
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function scoreAcademicRisk(telemetry, helperInfo = {}, sessionInfo = {}) {
  const {
    paste_payload_chars: paste = 0,
    chars_typed: typed = 0,
    focus_losses: blurs = 0,
    time_off_window_ms: offMs = 0,
    effective_wpm: wpm = 0,
    max_idle_gap_ms: idleMs = 0,
  } = telemetry;

  const { connected = false, hostileCount = 0 } = helperInfo;
  const { reconnects = 0, startedAt = Date.now() } = sessionInfo;
  const sessionAgeSec = (Date.now() - (startedAt || Date.now())) / 1000;

  // Paste risk: large paste, especially after focus loss
  let pasteRaw = 0;
  if (paste >= 200 && typed < 20) pasteRaw = 90;
  else if (blurs >= 1 && paste >= 80) pasteRaw = 70;
  else if (paste >= 80) pasteRaw = 40;
  else if (paste >= 50) pasteRaw = 20;
  else if (paste > 0) pasteRaw = 10;

  // Focus risk: blur count + time off window
  let focusRaw = 0;
  if (blurs >= 4) focusRaw += 80;
  else if (blurs >= 2) focusRaw += 50;
  else if (blurs === 1) focusRaw += 20;
  if (offMs >= 30000) focusRaw += 40;
  else if (offMs >= 10000) focusRaw += 20;
  else if (offMs >= 3000) focusRaw += 10;

  // Typing risk: superhuman WPM burst
  let typingRaw = 0;
  if (wpm >= 250) typingRaw = 90;
  else if (wpm >= 180) typingRaw = 50;

  // Idle risk: long gap followed by paste
  let idleRaw = 0;
  if (idleMs >= 60000 && paste >= 80) idleRaw = 80;
  else if (idleMs >= 8000 && paste > 0) idleRaw = 50;
  else if (idleMs >= 30000) idleRaw = 30;

  // Affinity risk: native helper confirmed excluded window
  const affinityRaw = hostileCount > 0 ? 100 : 0;

  // Helper risk: not connected after 30s of session
  const helperRaw = !connected && sessionAgeSec > 30 ? 100 : 0;

  // Session risk: excessive reconnects
  let sessionRaw = 0;
  if (reconnects >= 3) sessionRaw = 80;
  else if (reconnects >= 2) sessionRaw = 40;

  const categories = {
    paste_risk: clamp(Math.round(pasteRaw), 0, 100),
    focus_risk: clamp(Math.round(focusRaw), 0, 100),
    typing_risk: clamp(Math.round(typingRaw), 0, 100),
    idle_risk: clamp(Math.round(idleRaw), 0, 100),
    affinity_risk: clamp(Math.round(affinityRaw), 0, 100),
    helper_risk: clamp(Math.round(helperRaw), 0, 100),
    session_risk: clamp(Math.round(sessionRaw), 0, 100),
  };

  let risk_score = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + categories[k] * w, 0);
  risk_score = clamp(Math.round(risk_score), 0, 100);

  // Affinity override: confirmed excluded window forces Critical floor
  if (affinityRaw >= 100) risk_score = Math.max(risk_score, 85);

  const risk_level = risk_score >= 70 ? "Critical" : risk_score >= 40 ? "Warning" : "Safe";
  const confidence = clamp(0.5 + risk_score / 200, 0, 1);

  const recommendation =
    risk_level === "Critical"
      ? "Manual review required. No automatic misconduct finding."
      : risk_level === "Warning"
        ? "Manual review recommended. No automatic misconduct finding."
        : "No anomalies detected.";

  return {
    risk_level,
    risk_score,
    confidence: Math.round(confidence * 100) / 100,
    categories,
    reasoning: null, // populated by Claude narrative when enabled
    recommendation,
    source: { score: "local_heuristic", reasoning: null },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all riskScoring tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/academic/riskScoring.js tests/unit/riskScoring.test.js
git commit -m "feat: add local academic risk scoring with category breakdown"
```

---

## Task 7 — Academic: event taxonomy

**Files:**

- Create: `src/academic/academicEvents.js`
- Create: `tests/unit/academicEvents.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/academicEvents.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { EVENTS, createEvent, eventTimeline } from "../../src/academic/academicEvents.js";

describe("academicEvents", () => {
  test("EVENTS exports all required taxonomy constants", () => {
    const required = [
      "EXAM_STARTED",
      "PRIVACY_ACCEPTED",
      "HELPER_CONNECTED",
      "HELPER_DISCONNECTED",
      "TELEMETRY_WINDOW_RECEIVED",
      "FOCUS_LOSS",
      "BULK_PASTE",
      "ABNORMAL_WPM_SPIKE",
      "LONG_IDLE_GAP",
      "CAPTURE_EXCLUDED_WINDOW",
      "RISK_ESCALATED",
      "RISK_DEESCALATED",
      "EXAM_SUBMITTED",
      "REPORT_GENERATED",
      "AUDIT_VERIFIED",
    ];
    for (const name of required) {
      assert.ok(EVENTS[name], `Missing event: ${name}`);
    }
  });

  test("createEvent returns a well-shaped event object", () => {
    const ev = createEvent("sess_1", EVENTS.EXAM_STARTED, { examId: "exam_1" });
    assert.equal(ev.sessionId, "sess_1");
    assert.equal(ev.type, EVENTS.EXAM_STARTED);
    assert.deepEqual(ev.detail, { examId: "exam_1" });
    assert.ok(typeof ev.ts === "number");
    assert.ok(ev.ts > 0);
  });

  test("eventTimeline adds and retrieves events in insertion order", () => {
    const timeline = eventTimeline();
    timeline.add("sess_x", EVENTS.EXAM_STARTED, {});
    timeline.add("sess_x", EVENTS.PRIVACY_ACCEPTED, {});
    const events = timeline.get("sess_x");
    assert.equal(events.length, 2);
    assert.equal(events[0].type, EVENTS.EXAM_STARTED);
    assert.equal(events[1].type, EVENTS.PRIVACY_ACCEPTED);
  });

  test("eventTimeline returns empty array for unknown session", () => {
    const timeline = eventTimeline();
    assert.deepEqual(timeline.get("unknown_session"), []);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/academic/academicEvents.js`**

```js
export const EVENTS = {
  EXAM_STARTED: "EXAM_STARTED",
  PRIVACY_ACCEPTED: "PRIVACY_ACCEPTED",
  HELPER_CONNECTED: "HELPER_CONNECTED",
  HELPER_DISCONNECTED: "HELPER_DISCONNECTED",
  TELEMETRY_WINDOW_RECEIVED: "TELEMETRY_WINDOW_RECEIVED",
  FOCUS_LOSS: "FOCUS_LOSS",
  LONG_TIME_OFF_WINDOW: "LONG_TIME_OFF_WINDOW",
  BULK_PASTE: "BULK_PASTE",
  REPEATED_PASTE: "REPEATED_PASTE",
  ABNORMAL_WPM_SPIKE: "ABNORMAL_WPM_SPIKE",
  LONG_IDLE_GAP: "LONG_IDLE_GAP",
  CAPTURE_EXCLUDED_WINDOW: "CAPTURE_EXCLUDED_WINDOW",
  RISK_ESCALATED: "RISK_ESCALATED",
  RISK_DEESCALATED: "RISK_DEESCALATED",
  SESSION_RECONNECTED: "SESSION_RECONNECTED",
  EXAM_SUBMITTED: "EXAM_SUBMITTED",
  REPORT_GENERATED: "REPORT_GENERATED",
  AUDIT_VERIFIED: "AUDIT_VERIFIED",
};

export function createEvent(sessionId, type, detail = {}) {
  return { sessionId, type, detail, ts: Date.now() };
}

export function eventTimeline() {
  const store = new Map();

  return {
    add(sessionId, type, detail = {}) {
      if (!store.has(sessionId)) store.set(sessionId, []);
      store.get(sessionId).push(createEvent(sessionId, type, detail));
    },
    get(sessionId) {
      return store.get(sessionId) ?? [];
    },
    clear(sessionId) {
      store.delete(sessionId);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/academic/academicEvents.js tests/unit/academicEvents.test.js
git commit -m "feat: add academic event taxonomy and timeline"
```

---

## Task 8 — Integrate Sprint 1 into server.js

**Files:**

- Modify: `server.js`

Replace `localHeuristic` calls with `scoreAcademicRisk`, apply `normaliseTelemetry`, and wire the Claude narrative as async/fail-open.

- [ ] **Step 1: Add imports to top of server.js**

After the existing imports block (after `import { dirname, join } from "node:path";`), add:

```js
import { stagingConfig } from "./src/config/env.js";
import { normaliseTelemetry } from "./src/privacy/normaliseTelemetry.js";
import { scoreAcademicRisk } from "./src/academic/riskScoring.js";
import { EVENTS, eventTimeline } from "./src/academic/academicEvents.js";
```

- [ ] **Step 2: Create a shared event timeline instance**

After the `sessions` Map declaration (after `const sessions = new Map();`), add:

```js
const timeline = eventTimeline();
```

- [ ] **Step 3: Extend the session object shape in `getSession()`**

Find the `getSession` function. It currently sets:

```js
sessions.set(id, {
  createdAt: Date.now(),
  lastActivity: Date.now(),
  latest: null,
  history: [],
  affinity: { hostile: [], lastHeartbeat: null, source: null, forensic: null },
  auditChain: { prevHash: "GENESIS", entries: [], truncated: false },
  rate: { tokens: 3, lastRefill: Date.now() },
});
```

Replace that object literal with:

```js
sessions.set(id, {
  createdAt: Date.now(),
  lastActivity: Date.now(),
  latest: null,
  history: [],
  affinity: { hostile: [], lastHeartbeat: null, source: null, forensic: null },
  auditChain: { prevHash: "GENESIS", entries: [], truncated: false },
  rate: { tokens: 3, lastRefill: Date.now() },
  // Stage 1 Academic Shield fields
  state: "active",
  examId: null,
  studentIdHash: null,
  reconnects: 0,
  startedAt: Date.now(),
  latestRiskScore: null,
  latestCategories: null,
});
```

- [ ] **Step 4: Replace `localHeuristic` call in the DEMO_MODE branch of `/api/telemetry`**

Find this block inside `app.post("/api/telemetry", ...)`:

```js
if (!client || DEMO_MODE) {
  const h = localHeuristic(telemetry);
  const verdict = {
    ...h,
    ts: Date.now(),
    source: "heuristic-fallback",
    cache: { creation: 0, read: 0 },
  };
  persistVerdict(sessionId, verdict);
  return res.json(verdict);
}
```

Replace with:

```js
if (!client || DEMO_MODE) {
  const normed = normaliseTelemetry(telemetry) ?? telemetry;
  const scored = scoreAcademicRisk(
    normed,
    {
      connected:
        sess.affinity.lastHeartbeat != null && Date.now() - sess.affinity.lastHeartbeat < 8000,
      hostileCount: sess.affinity.hostile.length,
    },
    { reconnects: sess.reconnects || 0, startedAt: sess.startedAt }
  );
  const verdict = {
    risk_level: scored.risk_level,
    risk_score: scored.risk_score,
    confidence: scored.confidence,
    categories: scored.categories,
    reasoning: scored.reasoning || scored.recommendation,
    recommendation: scored.recommendation,
    source: scored.source,
    ts: Date.now(),
    cache: { creation: 0, read: 0 },
  };
  sess.latestRiskScore = scored.risk_score;
  sess.latestCategories = scored.categories;
  timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, {
    risk_level: scored.risk_level,
    risk_score: scored.risk_score,
  });
  if (telemetry.focus_losses > 0)
    timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
  if (telemetry.paste_payload_chars >= 200)
    timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
  if (telemetry.effective_wpm >= 250)
    timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
  if (telemetry.max_idle_gap_ms >= 60000)
    timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
  persistVerdict(sessionId, verdict);
  return res.json(verdict);
}
```

- [ ] **Step 5: Update the Claude branch to use hybrid scoring**

Find the try/catch block that calls `client.messages.create(...)`. After the `const verdict = {...}` object is assembled, and before `persistVerdict(sessionId, verdict)`, update the Claude branch to first run local scoring, then use Claude only for reasoning:

Replace the Claude response parsing and verdict assembly block. Find:

```js
const verdict = {
  risk_level: ["Safe", "Warning", "Critical"].includes(parsed.risk_level)
    ? parsed.risk_level
    : "Safe",
  reasoning: String(parsed.reasoning ?? "").slice(0, 280),
  ts: Date.now(),
  source: "claude",
  cache: {
    creation: response.usage?.cache_creation_input_tokens ?? 0,
    read: response.usage?.cache_read_input_tokens ?? 0,
  },
};
persistVerdict(sessionId, verdict);
res.json(verdict);
```

Replace with:

```js
const normed = normaliseTelemetry(telemetry) ?? telemetry;
const scored = scoreAcademicRisk(
  normed,
  {
    connected:
      sess.affinity.lastHeartbeat != null && Date.now() - sess.affinity.lastHeartbeat < 8000,
    hostileCount: sess.affinity.hostile.length,
  },
  { reconnects: sess.reconnects || 0, startedAt: sess.startedAt }
);
const claudeReasoning = String(parsed.reasoning ?? "").slice(0, 280);
const verdict = {
  risk_level: scored.risk_level,
  risk_score: scored.risk_score,
  confidence: scored.confidence,
  categories: scored.categories,
  reasoning: claudeReasoning || scored.recommendation,
  recommendation: scored.recommendation,
  source: { score: "local_heuristic", reasoning: "claude_narrative" },
  ts: Date.now(),
  cache: {
    creation: response.usage?.cache_creation_input_tokens ?? 0,
    read: response.usage?.cache_read_input_tokens ?? 0,
  },
};
sess.latestRiskScore = scored.risk_score;
sess.latestCategories = scored.categories;
timeline.add(sessionId, EVENTS.TELEMETRY_WINDOW_RECEIVED, {
  risk_level: scored.risk_level,
  risk_score: scored.risk_score,
});
if (telemetry.focus_losses > 0)
  timeline.add(sessionId, EVENTS.FOCUS_LOSS, { count: telemetry.focus_losses });
if (telemetry.paste_payload_chars >= 200)
  timeline.add(sessionId, EVENTS.BULK_PASTE, { chars: telemetry.paste_payload_chars });
if (telemetry.effective_wpm >= 250)
  timeline.add(sessionId, EVENTS.ABNORMAL_WPM_SPIKE, { wpm: telemetry.effective_wpm });
if (telemetry.max_idle_gap_ms >= 60000)
  timeline.add(sessionId, EVENTS.LONG_IDLE_GAP, { ms: telemetry.max_idle_gap_ms });
persistVerdict(sessionId, verdict);
res.json(verdict);
```

- [ ] **Step 6: Also update the fallback error branch**

Find the fallback `const verdict = { ...h, ts: Date.now(), source: lowCredit ? "fallback-low-credit" : "fallback-error", ... }` in the catch block. Replace `localHeuristic(telemetry)` with:

```js
const normed = normaliseTelemetry(telemetry) ?? telemetry;
const scored = scoreAcademicRisk(
  normed,
  {
    connected:
      sess.affinity.lastHeartbeat != null && Date.now() - sess.affinity.lastHeartbeat < 8000,
    hostileCount: sess.affinity.hostile.length,
  },
  { reconnects: sess.reconnects || 0, startedAt: sess.startedAt }
);
const verdict = {
  risk_level: scored.risk_level,
  risk_score: scored.risk_score,
  confidence: scored.confidence,
  categories: scored.categories,
  reasoning: scored.recommendation,
  recommendation: scored.recommendation,
  source: {
    score: "local_heuristic",
    reasoning: lowCredit ? "fallback-low-credit" : "fallback-error",
  },
  ts: Date.now(),
  cache: { creation: 0, read: 0 },
};
sess.latestRiskScore = scored.risk_score;
sess.latestCategories = scored.categories;
```

- [ ] **Step 7: Smoke test the server**

```bash
npm start
```

In a second terminal:

```bash
curl -s -X POST http://localhost:3030/api/telemetry \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test123","telemetry":{"keystrokes":20,"chars_typed":80,"effective_wpm":70,"focus_losses":0,"time_off_window_ms":0,"pastes":0,"paste_payload_chars":0,"max_idle_gap_ms":0,"window_seconds":5}}'
```

Expected response shape:

```json
{"risk_level":"Safe","risk_score":0,"confidence":0.5,"categories":{...},"reasoning":"...","recommendation":"No anomalies detected.","source":{...}}
```

Stop server with `Ctrl+C`.

- [ ] **Step 8: Commit**

```bash
git add server.js
git commit -m "feat: integrate local risk scoring and event timeline into telemetry flow"
```

---

## Task 9 — Session lifecycle and exam registry

**Files:**

- Create: `src/academic/exams.js`
- Create: `src/academic/sessions.js`
- Create: `tests/unit/sessions.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/sessions.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createExam, getExam, listExams } from "../../src/academic/exams.js";
import {
  STATES,
  createSessionRecord,
  transitionState,
  canTransition,
} from "../../src/academic/sessions.js";

describe("exams", () => {
  test("createExam returns an exam with id, title, and created state", () => {
    const exam = createExam({ title: "COMP3130 Final", durationMinutes: 120 });
    assert.ok(exam.id.startsWith("exam_"));
    assert.equal(exam.title, "COMP3130 Final");
    assert.equal(exam.durationMinutes, 120);
    assert.ok(typeof exam.createdAt === "number");
  });

  test("getExam retrieves a created exam", () => {
    const exam = createExam({ title: "Test Exam" });
    const retrieved = getExam(exam.id);
    assert.equal(retrieved.id, exam.id);
  });

  test("listExams returns all created exams", () => {
    const before = listExams().length;
    createExam({ title: "Another Exam" });
    assert.equal(listExams().length, before + 1);
  });
});

describe("sessions state machine", () => {
  test("createSessionRecord starts in created state", () => {
    const rec = createSessionRecord("exam_1", "student_hash_abc");
    assert.equal(rec.state, STATES.CREATED);
    assert.equal(rec.examId, "exam_1");
    assert.equal(rec.studentIdHash, "student_hash_abc");
    assert.ok(rec.id.startsWith("sess_"));
  });

  test("canTransition allows created → joined", () => {
    const rec = createSessionRecord("e1", "h1");
    assert.ok(canTransition(rec.state, STATES.JOINED));
  });

  test("transitionState advances state", () => {
    let rec = createSessionRecord("e1", "h1");
    rec = transitionState(rec, STATES.JOINED);
    assert.equal(rec.state, STATES.JOINED);
    rec = transitionState(rec, STATES.PRIVACY_ACCEPTED);
    assert.equal(rec.state, STATES.PRIVACY_ACCEPTED);
  });

  test("transitionState throws on illegal transition", () => {
    const rec = createSessionRecord("e1", "h1");
    assert.throws(() => transitionState(rec, STATES.SUBMITTED), /Invalid transition/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/academic/exams.js`**

```js
import crypto from "node:crypto";
import { getStore } from "../storage/memoryStore.js";

const store = getStore("exams");

export function createExam({
  title = "Untitled Exam",
  durationMinutes = 120,
  description = "",
} = {}) {
  const exam = {
    id: `exam_${crypto.randomBytes(6).toString("hex")}`,
    title,
    durationMinutes,
    description,
    createdAt: Date.now(),
  };
  store.set(exam.id, exam);
  return exam;
}

export function getExam(examId) {
  return store.get(examId) ?? null;
}

export function listExams() {
  return [...store.values()];
}
```

- [ ] **Step 4: Create `src/academic/sessions.js`**

```js
import crypto from "node:crypto";

export const STATES = {
  CREATED: "created",
  JOINED: "joined",
  PRIVACY_ACCEPTED: "privacy_accepted",
  HELPER_CONNECTED: "helper_connected",
  EXAM_STARTED: "exam_started",
  ACTIVE: "active",
  SUBMITTED: "submitted",
  REPORT_GENERATED: "report_generated",
  CLOSED: "closed",
};

// Allowed forward transitions
const TRANSITIONS = {
  [STATES.CREATED]: [STATES.JOINED],
  [STATES.JOINED]: [STATES.PRIVACY_ACCEPTED],
  [STATES.PRIVACY_ACCEPTED]: [STATES.HELPER_CONNECTED, STATES.EXAM_STARTED],
  [STATES.HELPER_CONNECTED]: [STATES.EXAM_STARTED],
  [STATES.EXAM_STARTED]: [STATES.ACTIVE],
  [STATES.ACTIVE]: [STATES.SUBMITTED],
  [STATES.SUBMITTED]: [STATES.REPORT_GENERATED],
  [STATES.REPORT_GENERATED]: [STATES.CLOSED],
  [STATES.CLOSED]: [],
};

export function canTransition(currentState, nextState) {
  return (TRANSITIONS[currentState] ?? []).includes(nextState);
}

export function createSessionRecord(examId, studentIdHash) {
  return {
    id: `sess_${crypto.randomBytes(6).toString("hex")}`,
    examId,
    studentIdHash,
    state: STATES.CREATED,
    createdAt: Date.now(),
    startedAt: null,
    submittedAt: null,
    reconnects: 0,
  };
}

export function transitionState(record, nextState) {
  if (!canTransition(record.state, nextState)) {
    throw new Error(`Invalid transition: ${record.state} → ${nextState}`);
  }
  return { ...record, state: nextState };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/academic/exams.js src/academic/sessions.js tests/unit/sessions.test.js
git commit -m "feat: add exam registry and session state machine"
```

---

## Task 10 — New lifecycle API endpoints

**Files:**

- Modify: `server.js`

Add 5 new routes. None of these change existing routes.

- [ ] **Step 1: Add exam and session registry imports to server.js**

After the existing Stage 1 imports from Task 8, add:

```js
import { createExam, getExam, listExams } from "./src/academic/exams.js";
import { STATES, createSessionRecord, transitionState } from "./src/academic/sessions.js";
import { hashStudentId } from "./src/privacy/hashIdentity.js";
```

- [ ] **Step 2: Create an in-memory exam sessions map**

After the `timeline` declaration, add:

```js
const examSessions = new Map(); // sessionId → sessionRecord (Stage 1 lifecycle)
```

- [ ] **Step 3: Add the 7 new routes before the `app.listen` call**

Add this block immediately before `const server = app.listen(...)`:

```js
// ─────────────────────────────────────────────────────────────
//  Stage 1 Academic Shield — exam lifecycle endpoints
// ─────────────────────────────────────────────────────────────

// Create exam (instructor only)
app.post("/api/exams", requireInstructorAuth, (req, res) => {
  const { title, durationMinutes, description } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title required" });
  const exam = createExam({ title, durationMinutes, description });
  res.status(201).json(exam);
});

// List exams (instructor only)
app.get("/api/exams", requireInstructorAuth, (_req, res) => {
  res.json({ exams: listExams() });
});

// Student joins exam — creates a session record and links to existing telemetry session
app.post("/api/exams/:examId/join", (req, res) => {
  const exam = getExam(req.params.examId);
  if (!exam) return res.status(404).json({ error: "exam not found" });
  const rawStudentId = String(req.body?.studentId ?? "").slice(0, 256);
  if (!rawStudentId) return res.status(400).json({ error: "studentId required" });
  const studentIdHash = hashStudentId(rawStudentId);
  const sessionId =
    String(req.body?.sessionId ?? "").slice(0, 64) ||
    `sess_${require("node:crypto").randomBytes(6).toString("hex")}`;
  let record = createSessionRecord(exam.id, studentIdHash);
  record = { ...record, id: sessionId };
  record = transitionState(record, STATES.JOINED);
  examSessions.set(sessionId, record);
  // Ensure a telemetry session also exists
  getSession(sessionId);
  res.json({ sessionId, examId: exam.id, studentIdHash, state: record.state });
});

// Student accepts privacy notice
app.post("/api/sessions/:sessionId/privacy-accept", (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    const updated = transitionState(record, STATES.PRIVACY_ACCEPTED);
    examSessions.set(req.params.sessionId, updated);
    timeline.add(req.params.sessionId, EVENTS.PRIVACY_ACCEPTED, {});
    res.json({ state: updated.state });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Start exam
app.post("/api/sessions/:sessionId/start", (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    let updated = record;
    if (record.state === STATES.PRIVACY_ACCEPTED) {
      updated = transitionState(record, STATES.EXAM_STARTED);
    } else if (record.state === STATES.HELPER_CONNECTED) {
      updated = transitionState(record, STATES.EXAM_STARTED);
    } else {
      updated = transitionState(record, STATES.EXAM_STARTED);
    }
    updated = { ...updated, startedAt: Date.now() };
    // Sync startedAt to telemetry session
    const sess = getSession(req.params.sessionId);
    sess.startedAt = updated.startedAt;
    examSessions.set(req.params.sessionId, updated);
    timeline.add(req.params.sessionId, EVENTS.EXAM_STARTED, { examId: record.examId });
    appendAudit(sess, "exam_started", { examId: record.examId, ts: updated.startedAt });
    res.json({ state: updated.state, startedAt: updated.startedAt });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// Submit exam
app.post("/api/sessions/:sessionId/submit", (req, res) => {
  const record = examSessions.get(req.params.sessionId);
  if (!record) return res.status(404).json({ error: "session not found" });
  try {
    let updated = transitionState(record, STATES.SUBMITTED);
    updated = { ...updated, submittedAt: Date.now() };
    examSessions.set(req.params.sessionId, updated);
    const sess = getSession(req.params.sessionId);
    timeline.add(req.params.sessionId, EVENTS.EXAM_SUBMITTED, { ts: updated.submittedAt });
    appendAudit(sess, "exam_submitted", { ts: updated.submittedAt });
    sseBroadcast("session_submitted", { sessionId: req.params.sessionId });
    res.json({ state: updated.state, submittedAt: updated.submittedAt });
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});
```

Note: the `/api/exams/:examId/join` route uses `require` for crypto inline. Replace that inline import with a top-level import instead. Add `import crypto from "node:crypto";` — but server.js already imports it (`import crypto from "node:crypto";`). So just use `crypto.randomBytes(6).toString("hex")` directly.

Fix that join route's sessionId generation:

```js
const sessionId =
  String(req.body?.sessionId ?? "").slice(0, 64) || `sess_${crypto.randomBytes(6).toString("hex")}`;
```

- [ ] **Step 4: Smoke test new routes**

```bash
npm start
```

In a second terminal, run these in order:

```bash
# Create exam
curl -s -X POST http://localhost:3030/api/exams \
  -H 'Content-Type: application/json' \
  -d '{"title":"COMP3130 Final","durationMinutes":120}' | jq .

# List exams
curl -s http://localhost:3030/api/exams | jq .

# Join exam (use examId from above)
curl -s -X POST http://localhost:3030/api/exams/EXAM_ID_HERE/join \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"alice@example.com","sessionId":"sess_demo1"}' | jq .

# Accept privacy
curl -s -X POST http://localhost:3030/api/sessions/sess_demo1/privacy-accept \
  -H 'Content-Type: application/json' | jq .

# Start exam
curl -s -X POST http://localhost:3030/api/sessions/sess_demo1/start \
  -H 'Content-Type: application/json' | jq .

# Submit exam
curl -s -X POST http://localhost:3030/api/sessions/sess_demo1/submit \
  -H 'Content-Type: application/json' | jq .
```

Each step should return the new `state` value. Stop server with `Ctrl+C`.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: add exam lifecycle API endpoints (create, join, start, submit)"
```

---

## Task 11 — Audit: HMAC chain module and verifier

**Files:**

- Create: `src/audit/hmacChain.js`
- Create: `src/audit/verifyAudit.js`
- Create: `tests/unit/hmacChain.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/hmacChain.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createChain, appendEntry, verifyChain } from "../../src/audit/hmacChain.js";

const TEST_KEY = "test-hmac-secret-key-for-unit-tests";

describe("hmacChain", () => {
  test("createChain returns a chain with GENESIS prev hash", () => {
    const chain = createChain();
    assert.equal(chain.prevHash, "GENESIS");
    assert.deepEqual(chain.entries, []);
    assert.equal(chain.truncated, false);
  });

  test("appendEntry adds an entry with a signature", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Safe" });
    assert.equal(chain.entries.length, 1);
    assert.ok(chain.entries[0].sig, "entry must have a sig");
    assert.equal(chain.entries[0].type, "verdict");
    assert.equal(chain.entries[0].seq, 0);
  });

  test("chain is valid after several entries", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "start", {});
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Warning" });
    appendEntry(chain, TEST_KEY, "submit", {});
    const { valid, errors } = verifyChain(chain, TEST_KEY);
    assert.ok(valid, `Chain invalid: ${JSON.stringify(errors)}`);
    assert.equal(errors.length, 0);
  });

  test("tampered entry invalidates chain", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Safe" });
    appendEntry(chain, TEST_KEY, "verdict", { risk_level: "Warning" });
    // Tamper with first entry
    chain.entries[0].payload.risk_level = "Critical";
    const { valid } = verifyChain(chain, TEST_KEY);
    assert.ok(!valid, "Tampered chain should fail verification");
  });

  test("prevHash links entries (each entry prev equals prior sig)", () => {
    const chain = createChain();
    appendEntry(chain, TEST_KEY, "a", {});
    appendEntry(chain, TEST_KEY, "b", {});
    assert.equal(chain.entries[1].prev, chain.entries[0].sig);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/audit/hmacChain.js`**

```js
import crypto from "node:crypto";

export const CHAIN_CAP = 5000;

export function createChain() {
  return { prevHash: "GENESIS", entries: [], truncated: false };
}

export function appendEntry(chain, hmacKey, type, payload) {
  if (chain.truncated) return;
  if (chain.entries.length >= CHAIN_CAP) {
    chain.truncated = true;
    return;
  }
  const entry = {
    seq: chain.entries.length,
    ts: Date.now(),
    type,
    payload,
    prev: chain.prevHash,
  };
  const sig = crypto.createHmac("sha256", hmacKey).update(JSON.stringify(entry)).digest("hex");
  entry.sig = sig;
  chain.entries.push(entry);
  chain.prevHash = sig;
}

export function verifyChain(chain, hmacKey) {
  const errors = [];
  let prevHash = "GENESIS";

  for (const entry of chain.entries) {
    const { sig, ...rest } = entry;
    const expected = crypto
      .createHmac("sha256", hmacKey)
      .update(JSON.stringify(rest))
      .digest("hex");
    if (expected !== sig) {
      errors.push(`Entry seq=${entry.seq} signature mismatch`);
    }
    if (rest.prev !== prevHash) {
      errors.push(`Entry seq=${entry.seq} prev hash mismatch`);
    }
    prevHash = sig;
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Create `src/audit/verifyAudit.js`**

```js
import { verifyChain } from "./hmacChain.js";

export function verifyAuditExport(auditExport, hmacKey) {
  const chain = {
    prevHash: "GENESIS",
    entries: auditExport.entries ?? [],
    truncated: auditExport.truncated ?? false,
  };
  const { valid, errors } = verifyChain(chain, hmacKey);
  return {
    valid,
    errors,
    entry_count: chain.entries.length,
    truncated: chain.truncated,
    verified_at: new Date().toISOString(),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/audit/hmacChain.js src/audit/verifyAudit.js tests/unit/hmacChain.test.js
git commit -m "feat: add HMAC audit chain module and chain verifier"
```

---

## Task 12 — Report builder

**Files:**

- Create: `src/academic/reportBuilder.js`
- Create: `tests/unit/reportBuilder.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/reportBuilder.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../../src/academic/reportBuilder.js";

describe("buildReport", () => {
  const sessionRecord = {
    id: "sess_abc",
    examId: "exam_1",
    studentIdHash: "sha256abc",
    state: "submitted",
    createdAt: Date.now() - 3600000,
    startedAt: Date.now() - 3500000,
    submittedAt: Date.now(),
    reconnects: 0,
  };

  const sessionData = {
    latest: { risk_level: "Warning", risk_score: 55, categories: { paste_risk: 60 } },
    affinity: { hostile: [], lastHeartbeat: null, source: null },
  };

  const eventList = [
    { type: "EXAM_STARTED", ts: Date.now() - 3500000, detail: {} },
    { type: "BULK_PASTE", ts: Date.now() - 1000000, detail: { chars: 220 } },
  ];

  test("returns a report with all required top-level fields", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.ok(report.report_id.startsWith("rep_"));
    assert.equal(report.session_id, "sess_abc");
    assert.equal(report.exam_id, "exam_1");
    assert.equal(report.student_id_hash, "sha256abc");
    assert.equal(report.privacy_mode, "metadata_only");
    assert.ok(typeof report.duration_minutes === "number");
    assert.ok(report.audit_chain_valid === true || report.audit_chain_valid === false);
    assert.ok(Array.isArray(report.timeline));
    assert.ok(typeof report.recommendation === "string");
  });

  test("recommendation always contains manual review language", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.match(report.recommendation, /[Mm]anual review/);
  });

  test("timeline includes passed events", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.equal(report.timeline.length, 2);
    assert.equal(report.timeline[0].event, "EXAM_STARTED");
  });

  test("duration_minutes is calculated correctly", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.ok(
      report.duration_minutes > 55 && report.duration_minutes < 65,
      `Expected ~60, got ${report.duration_minutes}`
    );
  });

  test("helper_connected reflects affinity state", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.equal(report.helper_connected, false); // no lastHeartbeat
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/academic/reportBuilder.js`**

```js
import crypto from "node:crypto";

export function buildReport(sessionRecord, sessionData, eventList, auditChainValid) {
  const { id, examId, studentIdHash, startedAt, submittedAt, createdAt } = sessionRecord;
  const { latest, affinity } = sessionData;

  const durationMs = submittedAt
    ? submittedAt - (startedAt ?? createdAt)
    : Date.now() - (startedAt ?? createdAt);
  const duration_minutes = Math.round(durationMs / 60000);

  const riskLevel = latest?.risk_level ?? "Safe";
  const riskScore = latest?.risk_score ?? 0;

  const recommendation =
    riskLevel === "Critical"
      ? "Manual review required. No automatic misconduct finding."
      : riskLevel === "Warning"
        ? "Manual review recommended. No automatic misconduct finding."
        : "No anomalies detected. Standard record-keeping applies.";

  const helperConnected =
    affinity?.lastHeartbeat != null && Date.now() - affinity.lastHeartbeat < 8000;

  const timeline = (eventList ?? []).map((ev) => ({
    ts: new Date(ev.ts).toISOString(),
    event: ev.type,
    detail: ev.detail ?? {},
  }));

  // Build a short plain-text summary from the event list
  const anomalyEvents = timeline.filter((e) =>
    [
      "BULK_PASTE",
      "FOCUS_LOSS",
      "ABNORMAL_WPM_SPIKE",
      "LONG_IDLE_GAP",
      "CAPTURE_EXCLUDED_WINDOW",
      "RISK_ESCALATED",
    ].includes(e.event)
  );
  const summary =
    anomalyEvents.length > 0
      ? `${anomalyEvents.length} anomalous event(s) detected: ${anomalyEvents.map((e) => e.event).join(", ")}.`
      : "No significant anomalies detected during the session.";

  return {
    report_id: `rep_${crypto.randomBytes(6).toString("hex")}`,
    session_id: id,
    exam_id: examId,
    student_id_hash: studentIdHash,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
    duration_minutes,
    final_risk_level: riskLevel,
    final_risk_score: riskScore,
    privacy_mode: "metadata_only",
    audit_chain_valid: !!auditChainValid,
    helper_connected: helperConnected,
    summary,
    recommendation,
    timeline,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/academic/reportBuilder.js tests/unit/reportBuilder.test.js
git commit -m "feat: add academic JSON report builder"
```

---

## Task 13 — Report and audit verify endpoints

**Files:**

- Modify: `server.js`

Add `GET /api/sessions/:sessionId/report` and `GET /api/audit/:sessionId/verify`.

- [ ] **Step 1: Add report builder and audit verifier imports to server.js**

After the existing Stage 1 imports, add:

```js
import { buildReport } from "./src/academic/reportBuilder.js";
import { verifyAuditExport } from "./src/audit/verifyAudit.js";
```

- [ ] **Step 2: Add the two new routes before `app.listen`**

After the submit endpoint from Task 10, add:

```js
// Report export — assembles JSON report for a session
app.get("/api/sessions/:sessionId/report", requireInstructorAuth, (req, res) => {
  const { sessionId } = req.params;
  const sess = sessions.get(sessionId);
  const record = examSessions.get(sessionId);
  if (!sess && !record) return res.status(404).json({ error: "session not found" });

  const { valid: auditValid } = verifyAuditExport(
    { entries: sess?.auditChain?.entries ?? [], truncated: sess?.auditChain?.truncated ?? false },
    AUDIT_KEY
  );

  const report = buildReport(
    record ?? {
      id: sessionId,
      examId: null,
      studentIdHash: null,
      state: "active",
      createdAt: sess?.createdAt ?? Date.now(),
      startedAt: sess?.startedAt,
      submittedAt: null,
      reconnects: 0,
    },
    {
      latest: sess?.latest ?? null,
      affinity: sess?.affinity ?? { hostile: [], lastHeartbeat: null, source: null },
    },
    timeline.get(sessionId),
    auditValid
  );

  timeline.add(sessionId, EVENTS.REPORT_GENERATED, { report_id: report.report_id });
  if (sess) appendAudit(sess, "report_generated", { report_id: report.report_id });

  res.json(report);
});

// Audit chain verification endpoint
app.get("/api/audit/:sessionId/verify", requireInstructorAuth, (req, res) => {
  const sess = sessions.get(req.params.sessionId);
  if (!sess) return res.status(404).json({ error: "session not found" });

  const result = verifyAuditExport(
    { entries: sess.auditChain.entries, truncated: sess.auditChain.truncated },
    AUDIT_KEY
  );

  timeline.add(req.params.sessionId, EVENTS.AUDIT_VERIFIED, { valid: result.valid });
  sseBroadcast("audit_verified", { sessionId: req.params.sessionId, valid: result.valid });

  res.json({ sessionId: req.params.sessionId, ...result });
});
```

- [ ] **Step 3: Smoke test both endpoints**

```bash
npm start
```

Run a telemetry call first to create a session and audit entries:

```bash
# Create a session with some telemetry
curl -s -X POST http://localhost:3030/api/telemetry \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"report_test","telemetry":{"keystrokes":50,"chars_typed":200,"effective_wpm":80,"focus_losses":1,"time_off_window_ms":3000,"pastes":1,"paste_payload_chars":90,"max_idle_gap_ms":0,"window_seconds":5}}'

# Get report
curl -s http://localhost:3030/api/sessions/report_test/report | jq .

# Verify audit chain
curl -s http://localhost:3030/api/audit/report_test/verify | jq .
```

Expected: report JSON with `final_risk_level`, `timeline`, `recommendation`. Verify returns `"valid": true`.

Stop server with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add report export and audit verification endpoints"
```

---

## Task 14 — Student page: privacy notice and lifecycle flow

**Files:**

- Modify: `public/index.html`

Read the current file first, then add a privacy notice banner, helper status indicator, and session state awareness.

- [ ] **Step 1: Read the current student page**

```bash
wc -l public/index.html
```

Open `public/index.html` and review its current structure before making changes.

- [ ] **Step 2: Add a privacy notice modal**

Inside the `<body>` tag, before the main exam content, add a privacy consent modal that is shown on page load and must be dismissed before the exam starts. Add this HTML (place it as the first element in `<body>`):

```html
<!-- Privacy Notice Modal -->
<div
  id="privacy-modal"
  style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;"
>
  <div
    style="background:#0f1117;border:1px solid #1e3a5f;border-radius:12px;padding:2rem;max-width:480px;width:90%;color:#e2e8f0;font-family:monospace;"
  >
    <div style="color:#38bdf8;font-size:1.1rem;font-weight:700;margin-bottom:1rem;">
      🛡 Simurgh Academic Shield
    </div>
    <div style="font-size:0.85rem;color:#94a3b8;margin-bottom:1rem;line-height:1.6;">
      <strong style="color:#e2e8f0;">Privacy Mode: Metadata Only</strong><br /><br />
      This session monitors <em>behavioural metadata only</em>:<br />
      keystroke timing, focus events, paste lengths, and typing cadence.<br /><br />
      <strong style="color:#22c55e;">We do not collect:</strong> screen content, typed answers,
      paste content, webcam, audio, or biometrics.<br /><br />
      Risk scores are heuristic-based. Any anomaly triggers <em>manual review</em>, not automatic
      findings.
    </div>
    <button
      id="accept-privacy-btn"
      style="background:#1d4ed8;color:#fff;border:none;padding:0.6rem 1.5rem;border-radius:6px;cursor:pointer;font-family:monospace;font-size:0.9rem;"
    >
      I understand — begin exam
    </button>
  </div>
</div>
```

- [ ] **Step 3: Add a helper status badge**

Find the exam header area in `public/index.html` and add a helper status indicator:

```html
<!-- Helper status badge — add near session status display -->
<span
  id="helper-status-badge"
  style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-family:monospace;background:#1e293b;color:#94a3b8;border:1px solid #334155;"
>
  <span id="helper-dot" style="width:8px;height:8px;border-radius:50%;background:#64748b;"></span>
  <span id="helper-label">Helper: checking…</span>
</span>
```

- [ ] **Step 4: Add privacy modal JS and helper status polling**

In the `<script>` section of `public/index.html`, add:

```js
// Privacy modal
document.getElementById("accept-privacy-btn")?.addEventListener("click", async () => {
  document.getElementById("privacy-modal").style.display = "none";
  // Notify server of privacy acceptance if session exists
  const sessionId = window._sessionId || sessionStorage.getItem("simurgh_session");
  if (sessionId) {
    await fetch(`/api/sessions/${sessionId}/privacy-accept`, { method: "POST" });
  }
});

// Helper status polling (every 4s)
async function pollHelperStatus() {
  const sessionId = window._sessionId || sessionStorage.getItem("simurgh_session");
  if (!sessionId) return;
  try {
    const res = await fetch(`/api/affinity/${sessionId}`);
    const data = await res.json();
    const connected = data.lastHeartbeat && Date.now() - data.lastHeartbeat < 8000;
    const dot = document.getElementById("helper-dot");
    const label = document.getElementById("helper-label");
    if (dot && label) {
      dot.style.background = connected ? "#22c55e" : "#f59e0b";
      label.textContent = connected ? "Helper: Connected" : "Helper: Not detected";
    }
  } catch {}
}
setInterval(pollHelperStatus, 4000);
pollHelperStatus();
```

- [ ] **Step 5: Verify page loads in browser**

```bash
npm start
```

Open `http://localhost:3030` in your browser. Verify:

- Privacy modal appears on load
- Clicking "I understand" dismisses it
- Helper status badge is visible
- Existing exam functionality still works

Stop server with `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add public/index.html
git commit -m "feat: add privacy notice modal and helper status to student exam page"
```

---

## Task 15 — Instructor dashboard: risk scores, timeline, filters

**Files:**

- Modify: `public/instructor.html`

Read the current file first, then add risk score cards, event timeline, filter bar, report export, and audit verify buttons.

- [ ] **Step 1: Read current instructor dashboard structure**

```bash
wc -l public/instructor.html
```

Open `public/instructor.html` and identify where sessions are rendered.

- [ ] **Step 2: Add CSS for new components**

In the `<style>` section (or add a `<style>` block), add:

```css
.risk-card {
  background: #0f1117;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 1rem;
  min-width: 140px;
  text-align: center;
}
.risk-score {
  font-size: 2rem;
  font-weight: 800;
  font-family: monospace;
}
.risk-safe {
  color: #22c55e;
}
.risk-warning {
  color: #f59e0b;
}
.risk-critical {
  color: #ef4444;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-family: monospace;
  font-weight: 600;
}
.badge-safe {
  background: #14532d;
  color: #4ade80;
}
.badge-warning {
  background: #78350f;
  color: #fbbf24;
}
.badge-critical {
  background: #7f1d1d;
  color: #fca5a5;
}
.badge-missing {
  background: #1e293b;
  color: #94a3b8;
}
.event-timeline {
  max-height: 180px;
  overflow-y: auto;
  font-size: 0.72rem;
  font-family: monospace;
  color: #94a3b8;
}
.event-row {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid #1e293b;
}
.event-row .ev-time {
  color: #475569;
  flex-shrink: 0;
}
.event-row .ev-type {
  color: #38bdf8;
}
.event-row .ev-type.critical {
  color: #ef4444;
}
.filter-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.filter-btn {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-family: monospace;
  cursor: pointer;
  border: 1px solid #334155;
  background: #1e293b;
  color: #94a3b8;
}
.filter-btn.active {
  background: #1d4ed8;
  border-color: #3b82f6;
  color: #fff;
}
```

- [ ] **Step 3: Add filter bar HTML**

Inside the instructor dashboard, before the sessions list, add:

```html
<div class="filter-bar" id="filter-bar">
  <button class="filter-btn active" data-filter="all">All</button>
  <button class="filter-btn" data-filter="safe">Safe</button>
  <button class="filter-btn" data-filter="warning">Warning</button>
  <button class="filter-btn" data-filter="critical">Critical</button>
  <button class="filter-btn" data-filter="helper_missing">Helper Missing</button>
  <button class="filter-btn" data-filter="review_required">Review Required</button>
  <button class="filter-btn" data-filter="submitted">Submitted</button>
</div>
```

- [ ] **Step 4: Update session card rendering JS**

Find where sessions are rendered in the instructor page JS. Update the session card template to include risk score, categories, helper status, event timeline, and action buttons. Replace the existing card render function (or add to it) with:

```js
function renderSessionCard(sess) {
  const level = (sess.latest?.risk_level || "Safe").toLowerCase();
  const score = sess.latest?.risk_score ?? 0;
  const cats = sess.latest?.categories ?? {};
  const helperActive = sess.helper_active;
  const submittedState = sess.state === "submitted" || sess.state === "report_generated";

  const badgeClass =
    level === "critical" ? "badge-critical" : level === "warning" ? "badge-warning" : "badge-safe";
  const scoreClass =
    level === "critical" ? "risk-critical" : level === "warning" ? "risk-warning" : "risk-safe";

  return `
<div class="session-card" data-session="${sess.sessionId}" data-level="${level}" data-helper="${helperActive}" data-submitted="${submittedState}">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
    <span style="font-family:monospace;color:#64748b;font-size:0.75rem;">${sess.sessionId}</span>
    <span class="badge ${badgeClass}">${level.toUpperCase()}</span>
  </div>
  <div style="display:flex;gap:1rem;align-items:center;margin-bottom:0.75rem;">
    <div class="risk-card">
      <div class="risk-score ${scoreClass}">${score}</div>
      <div style="font-size:0.65rem;color:#64748b;margin-top:2px;">RISK SCORE</div>
    </div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:0.68rem;font-family:monospace;">
      ${Object.entries(cats)
        .map(
          ([k, v]) => `
        <div style="color:#64748b;">${k.replace("_risk", "")}: <span style="color:${v >= 70 ? "#ef4444" : v >= 40 ? "#f59e0b" : "#22c55e"}">${v}</span></div>
      `
        )
        .join("")}
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:0.5rem;font-size:0.72rem;font-family:monospace;">
    <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${helperActive ? "#22c55e" : "#f59e0b"};"></span>
    <span style="color:#94a3b8;">Helper: ${helperActive ? "Connected" : "Not detected"}</span>
    ${submittedState ? '<span class="badge" style="background:#1e3a5f;color:#38bdf8;margin-left:auto;">Submitted</span>' : ""}
  </div>
  <div id="timeline-${sess.sessionId}" class="event-timeline" style="margin-bottom:0.5rem;">
    <em style="color:#475569;">Loading timeline…</em>
  </div>
  <div style="display:flex;gap:6px;margin-top:0.5rem;">
    <button onclick="exportReport('${sess.sessionId}')" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:3px 10px;border-radius:6px;font-size:0.72rem;font-family:monospace;cursor:pointer;">Export Report</button>
    <button onclick="verifyAudit('${sess.sessionId}')" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:3px 10px;border-radius:6px;font-size:0.72rem;font-family:monospace;cursor:pointer;">Verify Audit</button>
  </div>
</div>`;
}

async function exportReport(sessionId) {
  const token = new URLSearchParams(location.search).get("token") || "";
  const res = await fetch(`/api/sessions/${sessionId}/report${token ? "?token=" + token : ""}`);
  const report = await res.json();
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `simurgh-report-${sessionId}.json`;
  a.click();
}

async function verifyAudit(sessionId) {
  const token = new URLSearchParams(location.search).get("token") || "";
  const res = await fetch(`/api/audit/${sessionId}/verify${token ? "?token=" + token : ""}`);
  const data = await res.json();
  alert(
    `Audit chain: ${data.valid ? "✅ VALID" : "❌ INVALID"}\nEntries: ${data.entry_count}\n${data.errors?.join("\n") || ""}`
  );
}

// Filter bar logic
document.getElementById("filter-bar")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const filter = btn.dataset.filter;
  document.querySelectorAll(".session-card").forEach((card) => {
    const show =
      filter === "all"
        ? true
        : filter === "safe"
          ? card.dataset.level === "safe"
          : filter === "warning"
            ? card.dataset.level === "warning"
            : filter === "critical"
              ? card.dataset.level === "critical"
              : filter === "helper_missing"
                ? card.dataset.helper === "false"
                : filter === "review_required"
                  ? card.dataset.level === "warning" || card.dataset.level === "critical"
                  : filter === "submitted"
                    ? card.dataset.submitted === "true"
                    : true;
    card.style.display = show ? "" : "none";
  });
});
```

- [ ] **Step 5: Verify dashboard in browser**

```bash
npm start
```

Open `http://localhost:3030/instructor` in browser (or with `?token=demo` in non-demo mode). Verify:

- Risk score cards appear per session
- Filter buttons are clickable and hide/show cards
- Export Report button downloads a JSON file
- Verify Audit button shows a valid/invalid alert
- Helper status indicator shows

Stop server with `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add public/instructor.html
git commit -m "feat: update instructor dashboard with risk cards, timeline, filters, report export"
```

---

## Task 16 — Documentation: README + AGENT.md + CHANGELOG.md

**Files:**

- Modify: `README.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

Read AGENT.md and CHANGELOG.md first to match existing style.

- [ ] **Step 1: Add Academic Shield section to README.md**

Open `README.md`. Find the end of the table of contents and add an entry, then add a new section near the top of the document body (after the intro / threat model section):

```markdown
## Simurgh Academic Shield

Stage 1 extends the core behavioural telemetry engine into a complete **privacy-first academic integrity workflow**.

**What it adds:**

| Capability         | Detail                                                                                |
| ------------------ | ------------------------------------------------------------------------------------- |
| Exam lifecycle     | `POST /api/exams` → join → privacy-accept → start → submit                            |
| Identity privacy   | Student IDs are SHA-256 hashed — raw names never stored                               |
| Local risk scoring | Weighted category model (paste, focus, typing, idle, affinity, helper, session)       |
| Claude narrative   | Called only on Warning/Critical; fail-open (local score stands if Claude unavailable) |
| Academic events    | Named taxonomy (BULK_PASTE, FOCUS_LOSS, CAPTURE_EXCLUDED_WINDOW, etc.)                |
| JSON report export | `GET /api/sessions/:id/report` — includes timeline, risk summary, audit validity      |
| Audit verification | `GET /api/audit/:id/verify` — HMAC chain integrity check                              |

**Privacy commitment:** Simurgh collects behavioural metadata only. No screen pixels, no webcam frames, no typed content, no paste content. Risk scores are heuristic-based. Any anomaly recommendation requires manual human review — Simurgh never makes automatic misconduct findings.
```

- [ ] **Step 2: Append entry to AGENT.md**

At the top of the `## Agent Change Log` section, add:

```markdown
### 2026-05-13 (Australia/Sydney)

**Raouf:**

- **Scope:** Stage 1 Academic Shield
- **Summary:** Implemented full Stage 1 Academic Shield — exam lifecycle, privacy-safe telemetry normaliser, SHA-256 identity hashing, local category-based risk scoring (7 weighted categories), Claude narrative layer (Warning/Critical only, fail-open), academic event taxonomy, session state machine, HMAC audit chain module, JSON report builder, and updated instructor dashboard with risk cards, event timeline, filter bar, report export, and audit verify.
- **Files Changed:**
  - `src/config/env.js`, `src/privacy/privacyConfig.js`, `src/privacy/normaliseTelemetry.js`, `src/privacy/hashIdentity.js`
  - `src/storage/memoryStore.js`
  - `src/academic/riskScoring.js`, `src/academic/academicEvents.js`, `src/academic/exams.js`, `src/academic/sessions.js`, `src/academic/reportBuilder.js`
  - `src/audit/hmacChain.js`, `src/audit/verifyAudit.js`
  - `server.js` — integrated all modules, added 7 new routes
  - `public/index.html` — privacy modal, helper status
  - `public/instructor.html` — risk cards, timeline, filters, report export, audit verify
  - `README.md` — Academic Shield section added
  - `tests/unit/` — 8 test files covering all new modules
- **Verification:** All unit tests pass. Server starts cleanly. Telemetry endpoint returns category-based risk scores. Report endpoint returns valid JSON. Audit verify confirms chain integrity. Dashboard loads with new components.
- **Follow-ups:** Stage 1.5 — route-level refactor of server.js into src/routes/. PDF report export (P2).
```

- [ ] **Step 3: Append entry to CHANGELOG.md**

Add a new entry at the top:

```markdown
## [0.2.0] — 2026-05-13

### Added

- **Stage 1 Academic Shield** — full academic integrity workflow
- `src/privacy/` — privacy config, telemetry normaliser, SHA-256 identity hashing
- `src/academic/` — local risk scoring (7 categories), academic event taxonomy, session state machine, exam registry, JSON report builder
- `src/audit/` — HMAC chain module, audit chain verifier
- `src/config/env.js` — Stage 1 environment variable config
- `src/storage/memoryStore.js` — namespace memory store
- 7 new API endpoints: `/api/exams`, `/api/exams/:id/join`, `/api/sessions/:id/privacy-accept`, `/api/sessions/:id/start`, `/api/sessions/:id/submit`, `/api/sessions/:id/report`, `/api/audit/:id/verify`
- Privacy notice modal on student exam page
- Helper status badge on student exam page
- Risk score cards, event timeline, filter bar, report export, audit verify on instructor dashboard
- `node:test` unit test suite (8 modules covered)

### Changed

- Telemetry scoring now uses local heuristic category model; Claude provides narrative only on Warning/Critical (fail-open)
- Session objects extended with lifecycle state, exam linkage, reconnect count, risk score cache

### Fixed

- N/A
```

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: all tests passing.

- [ ] **Step 5: Start the server and do a final end-to-end check**

```bash
npm start
```

Check:

1. `http://localhost:3030` loads with privacy modal ✅
2. `http://localhost:3030/instructor` loads with dashboard ✅
3. Telemetry POST returns `risk_score` and `categories` ✅
4. `/api/exams` (POST) creates an exam ✅
5. `/api/sessions/:id/report` returns a JSON report ✅
6. `/api/audit/:id/verify` returns `valid: true` ✅

Stop server with `Ctrl+C`.

- [ ] **Step 6: Final commit**

```bash
git add README.md AGENT.md CHANGELOG.md
git commit -m "docs: add Stage 1 Academic Shield documentation and changelogs"
```

---

## Self-Review

### Spec coverage check

| Spec requirement                                    | Task                |
| --------------------------------------------------- | ------------------- |
| `src/config/env.js`                                 | Task 2              |
| `privacyConfig.js` + privacy enforcement            | Tasks 2, 3          |
| SHA-256 student identity hashing                    | Task 4              |
| Memory store                                        | Task 5              |
| Local risk scoring with 7 categories                | Task 6              |
| Academic event taxonomy                             | Task 7              |
| Integrate scoring into server.js                    | Task 8              |
| Exam registry + session state machine               | Task 9              |
| 7 new API endpoints                                 | Tasks 10, 13        |
| HMAC chain module + verifier                        | Task 11             |
| JSON report builder                                 | Task 12             |
| Report + verify endpoints                           | Task 13             |
| Student page: privacy notice + helper status        | Task 14             |
| Instructor dashboard: risk cards, timeline, filters | Task 15             |
| README Academic Shield section                      | Task 16             |
| AGENT.md + CHANGELOG.md                             | Task 16             |
| Unit tests for all modules                          | Tasks 3–7, 9, 11–12 |

All spec requirements are covered.

### Placeholder check

No TBDs, TODOs, or "implement later" found.

### Type consistency check

- `scoreAcademicRisk` returns `{risk_level, risk_score, confidence, categories, reasoning, recommendation, source}` — used consistently in Tasks 6 and 8.
- `buildReport` parameters match what Task 13 passes: `(sessionRecord, sessionData, eventList, auditChainValid)`.
- `appendEntry(chain, hmacKey, type, payload)` signature in Task 11 matches usage in Task 13 (`verifyAuditExport`).
- `timeline.add(sessionId, EVENTS.X, detail)` used consistently in Tasks 8, 10, 13.
- `createSessionRecord` returns object with `.id`, `.state`, `.examId`, `.studentIdHash` — matched in Task 12 report builder.
