# Simurgh Academic Shield — Stage 1 Design Spec

**Date:** 2026-05-13  
**Status:** Approved  
**Author:** Raouf (Raoof999)

---

## Mission

A privacy-first academic integrity prototype that verifies exam-session trust using behavioural metadata, native display-affinity checks, explainable risk scoring, and tamper-evident audit reports. Simurgh produces **review recommendations**, not automatic misconduct findings.

---

## Stage 1 Success Condition

Stage 1 is complete when Simurgh can:

1. Create an exam
2. Let a student join with a hashed identity
3. Show a privacy notice and record consent
4. Collect metadata-only telemetry
5. Score risk using local heuristics
6. Add Claude narrative (async) for Warning/Critical cases
7. Generate academic events and append them to the HMAC audit chain
8. Stream live risk status to the instructor dashboard
9. Export a signed JSON report
10. Verify the audit chain

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Code structure | Extend in-place | Avoid restructure bugs while adding major features; `server.js` stays as conductor |
| Frontend | Vanilla HTML + polished CSS | No build step, demo-stable, faster to ship |
| Risk scoring | Local heuristics + Claude narrative | Deterministic scores, cheaper, fail-open; Claude explains Warning/Critical only |

---

## Module Layout

```
server.js                    ← route owner, imports all src/ modules
src/
  config/
    env.js                   ← centralises all process.env reads
  privacy/
    privacyConfig.js         ← what is allowed / never collected
    normaliseTelemetry.js    ← strips content, keeps metadata
    hashIdentity.js          ← SHA-256 student identifiers
  academic/
    riskScoring.js           ← local heuristics → composite score (0–100)
    academicEvents.js        ← named event taxonomy + emitter
    reportBuilder.js         ← assembles JSON report from session state
    sessions.js              ← session state machine
    exams.js                 ← exam registry
  helper/
    helperState.js           ← tracks last-seen, connected/missing status
    affinityIngest.js        ← validates and processes affinity payloads
  audit/
    hmacChain.js             ← wraps HMAC logic as a module
    verifyAudit.js           ← chain integrity check
  storage/
    memoryStore.js           ← in-memory Map store (no DB in Stage 1)
data/
  exams.json                 ← seeded on start
  sessions/                  ← one JSON file per session
  audit/                     ← HMAC chain files (existing behaviour)
  reports/                   ← exported report JSONs
public/
  index.html                 ← student exam view (updated)
  instructor.html            ← instructor dashboard (updated)
```

---

## Data Flow

```
Student browser
  → POST /api/telemetry (every 5s)
      1. normaliseTelemetry()        strip content, enforce privacy config
      2. helperState.getStatus()     inject helper connected / missing
      3. riskScoring.score()         local heuristics → risk_score, categories
      4. academicEvents.emit()       log typed events to session
      5. hmacChain.append()          append to audit chain
      6. SSE push local result       instructor sees result immediately
      7. if Warning/Critical (async):
             Claude API → reasoning string
             update session.lastReasoning
             SSE patch with reasoning
```

Claude is **always async and fail-open**. If the Claude call fails, the local result stands. The dashboard never blocks waiting for Claude.

---

## Privacy Boundaries

### Collected (metadata only)

- Keystroke count, character count, effective WPM
- Focus loss count, time off window (seconds)
- Paste count, paste length (char count, not content)
- Idle gap durations
- Keydown timing intervals (cadence, not content)
- Helper connection status
- Display-affinity alert flags

### Never collected

- Screen pixels or screenshots
- Webcam frames or audio
- Pasted text content
- Typed answer content
- Raw student name or biometric identifiers

### Privacy config (src/privacy/privacyConfig.js)

```js
export const privacyConfig = {
  collectScreenPixels: false,
  collectWebcamFrames: false,
  collectAudio: false,
  collectPasteContent: false,
  collectTypedContent: false,
  collectBiometrics: false,

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

---

## Risk Scoring Model

### Categories and weights

| Category | Signal | Weight |
|---|---|---|
| `paste_risk` | paste length > 200 chars; paste immediately after blur | 25% |
| `focus_risk` | blur count; cumulative time off window > 30s | 20% |
| `typing_risk` | WPM burst > 250; sudden cadence spike | 15% |
| `idle_risk` | idle gap > 60s followed by paste | 10% |
| `affinity_risk` | helper reports capture-excluded window | 20% |
| `helper_risk` | helper not connected within first 30s of exam | 5% |
| `session_risk` | session reconnects > 2 | 5% |

### Thresholds

| Score | Level |
|---|---|
| 0–39 | Safe |
| 40–69 | Warning |
| 70–100 | Critical |

### Affinity override rule

If `categories.affinity_risk >= 100` (helper confirmed an excluded window):

```js
risk_score = Math.max(risk_score, 85);
risk_level = "critical";
```

This reflects the paper's finding that display-affinity exclusion is the core structural bypass, not a soft signal.

### Score output shape

```json
{
  "risk_level": "warning",
  "risk_score": 64,
  "confidence": 0.82,
  "categories": {
    "paste_risk": 80,
    "focus_risk": 60,
    "typing_risk": 45,
    "idle_risk": 20,
    "affinity_risk": 0,
    "helper_risk": 30,
    "session_risk": 10
  },
  "reasoning": "Two focus losses and a bulk paste detected.",
  "recommendation": "Manual review recommended. No automatic misconduct finding.",
  "source": {
    "score": "local_heuristic",
    "reasoning": "claude_narrative"
  }
}
```

`source` field makes provenance explicit. Claude never silently overrides the local score.

---

## Academic Event Taxonomy

Events emitted by `academicEvents.js`:

```
EXAM_STARTED
PRIVACY_ACCEPTED
HELPER_CONNECTED
HELPER_DISCONNECTED
TELEMETRY_WINDOW_RECEIVED
FOCUS_LOSS
LONG_TIME_OFF_WINDOW
BULK_PASTE
REPEATED_PASTE
ABNORMAL_WPM_SPIKE
LONG_IDLE_GAP
CAPTURE_EXCLUDED_WINDOW
RISK_ESCALATED
RISK_DEESCALATED
SESSION_RECONNECTED
EXAM_SUBMITTED
REPORT_GENERATED
AUDIT_VERIFIED
```

Each event appended to the HMAC audit chain and available in the session event timeline.

---

## Session State Machine

```
created → joined → privacy_accepted → helper_connected → exam_started
  → active → submitted → report_generated → closed
```

`helper_connected` is optional: if no native helper is available, state transitions directly from `privacy_accepted` to `exam_started`, and `helper_risk` score is elevated.

---

## API Surface

### New endpoints (additions only — no existing routes change)

```
POST /api/exams
POST /api/exams/:examId/join
POST /api/sessions/:sessionId/privacy-accept
POST /api/sessions/:sessionId/start
POST /api/sessions/:sessionId/submit
GET  /api/sessions/:sessionId/report
GET  /api/audit/:sessionId/verify
```

### Existing endpoints (unchanged)

```
POST /api/telemetry
POST /api/affinity
GET  /api/sessions
GET  /api/sessions/:sessionId
GET  /api/audit
```

---

## Report Structure

```json
{
  "report_id": "rep_<id>",
  "session_id": "sess_<id>",
  "exam_id": "exam_<id>",
  "student_id_hash": "sha256...",
  "started_at": "ISO8601",
  "submitted_at": "ISO8601",
  "duration_minutes": 62,
  "final_risk_level": "warning",
  "final_risk_score": 61,
  "privacy_mode": "metadata_only",
  "audit_chain_valid": true,
  "helper_connected": true,
  "summary": "Two focus-loss events and one paste-length anomaly detected.",
  "recommendation": "Manual review recommended. No automatic misconduct finding.",
  "timeline": [
    { "ts": "ISO8601", "event": "EXAM_STARTED" },
    { "ts": "ISO8601", "event": "FOCUS_LOSS", "detail": "3s off window" },
    { "ts": "ISO8601", "event": "BULK_PASTE", "detail": "284 chars" }
  ]
}
```

---

## Security Controls

| Control | Implementation |
|---|---|
| Instructor auth | Bearer token (`SIMURGH_INSTRUCTOR_TOKEN`) |
| Helper auth | `x-simurgh-helper-secret` header |
| Student identity | HMAC-SHA256 hash (never raw name) |
| Audit chain | HMAC-SHA256 linked entries |
| CORS | `SIMURGH_ALLOWED_ORIGIN` |
| Data minimisation | `normaliseTelemetry()` enforced before any storage |
| Debug process names | Disabled unless `SIMURGH_DEBUG_RAW_PROCESS_NAMES=true` |

---

## Environment Variables (src/config/env.js)

```env
ANTHROPIC_API_KEY
SIMURGH_MODEL
SIMURGH_HELPER_SECRET
SIMURGH_AUDIT_SECRET
SIMURGH_INSTRUCTOR_TOKEN
SIMURGH_ALLOWED_ORIGIN
SIMURGH_DEMO_MODE
SIMURGH_SCORING_MODE=hybrid
SIMURGH_CLAUDE_ON_SAFE=false
SIMURGH_CLAUDE_ON_WARNING=true
SIMURGH_CLAUDE_ON_CRITICAL=true
SIMURGH_RETENTION_DAYS=30
SIMURGH_DEBUG_RAW_PROCESS_NAMES=false
PORT
```

---

## Instructor Dashboard Updates

### New panels

- Risk score card (0–100 with level badge)
- Category breakdown (paste, focus, typing, idle, affinity, helper, session)
- Helper status indicator (Connected / Missing)
- Event timeline (scrollable, colour-coded)
- Export Report button
- Verify Audit Chain button

### Filters

```
All | Safe | Warning | Critical | Helper Missing | Review Required | Submitted
```

---

## Build Order (4 sprints)

### Sprint 1 — Privacy + scoring foundation
`env.js`, `privacyConfig.js`, `normaliseTelemetry.js`, `hashIdentity.js`, `riskScoring.js`, `academicEvents.js`

### Sprint 2 — Session lifecycle
`exams.js`, `sessions.js`, `sessionState.js`, new session/exam API endpoints

### Sprint 3 — Audit + reports
`hmacChain.js` (module wrap), `verifyAudit.js`, `reportBuilder.js`, report/verify endpoints

### Sprint 4 — Dashboard polish
Risk score cards, event timeline, helper status, report export, audit verify button, filter bar

---

## Acceptance Criteria

| Requirement | Priority |
|---|---|
| Privacy config enforced | P0 |
| Telemetry normaliser strips content | P0 |
| Student ID hashed | P0 |
| Local risk scoring with categories | P0 |
| Event taxonomy emitted | P0 |
| Session lifecycle (created → submitted) | P0 |
| Helper status in scoring | P0 |
| HMAC audit chain stores events | P0 |
| Report builder exports JSON | P0 |
| Instructor dashboard shows risk scores | P1 |
| Dashboard event timeline | P1 |
| Audit verification endpoint | P1 |
| README updated with Academic Shield section | P1 |
| AGENT.md and CHANGELOG.md updated | P1 |
| PDF export | P2 |
| Database storage | P2 |
| LMS integration | P3 |
