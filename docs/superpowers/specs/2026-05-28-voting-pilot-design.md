# Project Simurgh × MQ Persian Society Voting Pilot — Design Spec

**Date:** 2026-05-28
**Status:** Locked
**Branch target:** `stage-3-mq-persian-society-voting-pilot`

---

## 0. Research thesis

> Can Project Simurgh provide privacy-preserving integrity evidence for small-scale student-society online voting sessions without collecting ballot content, screen recordings, webcam/audio, or personal device identifiers?

The pilot runs in shadow mode beside (or after) the official MQ Persian Society vote. It does not decide winners, disqualify votes, or touch ballot choices. Simurgh records only metadata-level integrity evidence.

---

## 1. Pilot mode

**Mode: Shadow + Mock Ballot (tiered)**

| Layer | Official election | Simurgh pilot |
|---|---|---|
| MQ Persian Society vote | Runs normally | Not affected |
| Simurgh | Consent-gated shadow | Runs beside or after |
| Ballot content | Voting tool only | Never sent to Simurgh |
| Result impact | Real election decides | Research data only |

**Integrity tiers:**

| Tier | Requirement | Coverage |
|---|---|---|
| `browser_only` | Browser-SDK only, no install | Session metadata, audit chain |
| `browser_plus_daemon` | Browser-SDK + optional native daemon | Above + signed device proof |

Daemon absence is not treated as misconduct, vote invalidity, or suspicious behaviour. It is recorded as reduced integrity-signal coverage. `SIMURGH_REQUIRE_DAEMON=false` for all Phase C participants.

---

## 2. Data categories

| Category | Label in paper |
|---|---|
| Persona script sessions | Synthetic generated sessions |
| Researcher manual walkthrough | Researcher self-pilot |
| Real consenting members | Human participant pilot |
| Official election outcome | Out of scope |

These categories must not be mixed. Each session carries a `data_source` field.

---

## 3. Architecture

### 3.1 Module structure

```
src/votingPilot/
  index.js          ← Express router; five routes
  consentStore.js   ← In-memory consent records; no PII
  reportBuilder.js  ← Assembles pilot report JSON
  events.js         ← Namespaced event constants

tools/
  voting-pilot-persona.mjs   ← HTTP-level synthetic scenario runner

public/
  voting-pilot.html          ← Landing + consent page
  voting-pilot-submit.html   ← Mock ballot + submit

docs/research/mq-voting-pilot/
  VOTING_PILOT_PROTOCOL.md
  PARTICIPANT_INFORMATION_AND_CONSENT.md
  DATA_MANAGEMENT_PLAN.md
  EXPERIMENT_MATRIX.md
  NON_CLAIMS.md
  evidence/synthetic/        ← Persona run outputs
  evidence/pre-pilot/        ← Gate verification outputs

scripts/
  smoke-voting-pilot.sh
  security-audit-voting-pilot.sh
```

### 3.2 Mount point

`server.js` receives one line:

```js
app.use('/api/voting-pilot', require('./src/votingPilot/index.js'));
```

### 3.3 Routes

```
GET  /voting-pilot                          ← consent landing page (static)
GET  /voting-pilot/submit                   ← mock ballot page (static)

POST /api/voting-pilot/consent/accept       ← atomic consent + session creation
POST /api/voting-pilot/submit               ← submit intent only
POST /api/voting-pilot/withdraw             ← withdrawal; one audit event; hard stop
GET  /api/voting-pilot/:sessionId/report    ← report export (blocked if withdrawn)
```

### 3.4 Import boundary

The voting pilot module may import shared security, privacy, telemetry, device-proof, and audit modules. It must not import academic exam lifecycle modules or reuse exam-specific event types. Exam routes have no knowledge of the voting pilot. The boundary is hard.

### 3.5 Shared infrastructure (reused, not duplicated)

```
session token logic
daemon proof verification (replay, tamper, stale)
HMAC audit chain
privacy-audit scanner
report export format (extended with pilot fields)
```

### 3.6 Namespaced events (`events.js`)

```
VOTING_PILOT_CONSENT_ACCEPTED
VOTING_PILOT_STARTED
VOTING_PILOT_SUBMITTED
VOTING_PILOT_WITHDRAWN
VOTING_PILOT_REPORT_EXPORTED
BALLOT_FIELD_REJECTED
```

`VOTING_PILOT_CONSENT_DECLINED` is reserved in `events.js` but not emitted to the application layer.

---

## 4. Consent gate

### 4.1 Rule

No pilot session, telemetry, participant code, device proof, audit chain entry, report, or research record is created until consent is accepted. No application-level pilot research data is created before consent. (The server may still process a basic HTTP page request.)

### 4.2 Flow

```
1. Member loads /voting-pilot
   Static page only. No session. No telemetry. No participant code.
   No application-level research record.

2. Member clicks Decline
   Show exit page. No POST required.
   No session. No record. No participant code. No audit event.

3. Member clicks Agree
   POST /api/voting-pilot/consent/accept (atomic)
   Server creates pilot_session_id and consent record in one transaction.
   Returns session token + participant code (shown once; raw code never stored).
   Telemetry and mock ballot unlock.

4. Member withdraws
   POST /api/voting-pilot/withdraw
   Telemetry stops immediately.
   Session marked withdrawn: true.
   Exactly one VOTING_PILOT_WITHDRAWN audit event appended (timestamp only).
   Report export disabled.
   All further pilot events for this session are rejected.
```

### 4.3 Consent record (stored only on acceptance)

```json
{
  "pilot_session_id": "vp_<uuid>",
  "participant_code_hash": "sha256(PEPPER + anonymous_code)",
  "consent_version": "2026-05-v1",
  "accepted": true,
  "accepted_at": "<ISO timestamp — server-generated>",
  "withdrawn": false,
  "withdrawn_at": null,
  "integrity_tier": "browser_only | browser_plus_daemon"
}
```

`participant_code_hash` uses a server-side pepper (`SIMURGH_VOTING_PILOT_PEPPER`). The raw anonymous code is shown once to the participant and never stored by Simurgh.

### 4.4 Never stored (any path)

```
student name, student ID, email address
vote choice, candidate selected, ballot content
```

### 4.5 Decline handling in the paper

> Participants who declined exited before application-level research data was created. Decline counts were not retained by Simurgh.

Do not report aggregate decline counts from Simurgh data. Count declines outside Simurgh during recruitment if ethics approves.

---

## 5. Ballot handling

### 5.1 Core rule

Simurgh records that a mock ballot was submitted. Simurgh never records which option was selected.

### 5.2 Client-side handling

The selected option exists only in transient browser memory. It is discarded before `POST /api/voting-pilot/submit`. No `console.log`, no `localStorage`, no `sessionStorage`, no URL encoding.

### 5.3 Submit endpoint

`POST /api/voting-pilot/submit` accepts only:

```json
{
  "pilot_session_id": "vp_<uuid>",
  "submit_intent": true
}
```

Server creates (timestamp server-generated):

```json
{
  "ballot_presented": true,
  "ballot_submitted": true,
  "ballot_choice_recorded_by_simurgh": false,
  "submitted_at": "<server ISO timestamp>"
}
```

### 5.4 Forbidden field enforcement

If any forbidden ballot-choice field is present in the request body, the server:

1. Rejects the request with HTTP 400 before any session mutation
2. Records a `BALLOT_FIELD_REJECTED` audit event containing **field names only, never values**
3. Does not mark the session submitted

Response:

```json
{
  "error": "ballot_choice_field_rejected",
  "forbidden_fields": ["choice"]
}
```

**Forbidden keys:**

```
choice, selected_choice, selected_option
candidate, candidate_id
vote, vote_choice
ballot_choice, ballot_content, ballot_answer, ballot
selected_candidate
```

**Allowed pilot metadata keys (not flagged by audit):**

```
ballot_presented, ballot_submitted, ballot_choice_recorded_by_simurgh
pilot_mode, voting_pilot, integrity_tier
```

### 5.5 Confirmation wording

```
Thank you. Your pilot submission was recorded.
Your selected option was not sent to Simurgh or stored.
```

### 5.6 Privacy audit extension

`tools/privacy-audit.mjs` gets exact forbidden-key matching against the list in §5.4. It does not scan for substring `ballot` or `vote` (which would produce false positives on allowed keys).

### 5.7 Mock ballot question

```
Which MQ Persian Society event should we prioritise next?

A. Nowruz cultural night
B. Persian movie night
C. Career/networking night
D. Food and music night
```

---

## 6. Persona engine (C-lite)

### 6.1 Purpose

`tools/voting-pilot-persona.mjs` is a deterministic HTTP-level synthetic scenario runner. It creates reproducible protocol-level sessions for consent, submission, telemetry, daemon availability, replay rejection, tamper rejection, withdrawal, and forbidden ballot-field rejection.

Each persona represents a synthetic member behaviour pattern, not a real society member. The engine validates protocol and privacy behaviour, not real browser UX or accessibility.

### 6.2 Invocation

```bash
node tools/voting-pilot-persona.mjs --persona <name> --seed <n> [--fixed-clock <ISO>]
```

`--fixed-clock` makes timestamps deterministic. Without it, output is behaviourally deterministic but timestamps vary.

### 6.3 Personas

| Persona | Behaviour |
|---|---|
| `compliant_browser_only` | Accepts consent, completes ballot, submits. No daemon. Clean session. |
| `compliant_with_real_daemon` | Same, but sends a real signed daemon proof. Requires local daemon running. |
| `compliant_with_fixture_daemon` | Same, but uses a deterministic test-fixture proof. Labelled synthetic, not real device attestation. |
| `distracted_member` | Accepts consent, generates seeded focus-loss + paste events mid-session, submits. |
| `daemon_unavailable` | Accepts consent, probes localhost daemon, gets no response, continues browser-only. |
| `replay_attempt` | Completes session 1, replays its proof challenge in session 2. Server rejects. |
| `tampered_proof` | Sends daemon proof with mutated `platform` field. Server rejects signature. |
| `withdraws_midway` | Accepts consent, sends telemetry, POSTs `/withdraw`. Session halts. Report blocked. |
| `declines_consent` | Loads consent page, does not POST. No session. Runner logs: declined — no server record. |
| `forbidden_ballot_field_attempt` | Sends `choice` field in submit body. Server returns 400. Field name audited. |

### 6.4 Output schema

Written to `docs/research/mq-voting-pilot/evidence/synthetic/session-<id>.json`:

```json
{
  "schema_version": "2026-05-v1",
  "persona": "compliant_browser_only",
  "seed": 101,
  "fixed_clock": null,
  "run_at": "<ISO timestamp>",
  "synthetic": true,
  "human_participant": false,
  "pilot_session_id": "vp_...",
  "integrity_tier": "browser_only",
  "steps": [
    { "name": "accept_consent", "status": "pass", "server_status": 200 },
    { "name": "submit_ballot", "status": "pass", "server_status": 200 }
  ],
  "privacy": {
    "ballot_choice_sent": false,
    "token_redacted": true,
    "forbidden_values_recorded": false
  },
  "final_server_response": {
    "status": 200,
    "summary": "submitted"
  },
  "assertion": "PASS",
  "notes": "Clean synthetic browser-only session; audit chain valid."
}
```

For `declines_consent`:

```json
{
  "persona": "declines_consent",
  "pilot_session_id": null,
  "server_record_created": false,
  "assertion": "PASS"
}
```

### 6.5 Redacted fields

Output JSON must not contain:

```
session token, bearer token
raw challenge, raw signature
raw participant code
raw daemon public key
vote choice
forbidden payload values
```

---

## 7. Report schema

`GET /api/voting-pilot/:sessionId/report` — blocked with HTTP 403 if `withdrawn: true`.

```json
{
  "schema_version": "2026-05-v1",
  "pilot_mode": "mq_persian_society_voting_shadow",
  "official_vote_impact": false,
  "synthetic": false,
  "data_source": "researcher_self_pilot | human_participant | synthetic_persona",
  "consent": {
    "accepted": true,
    "withdrawn": false,
    "version": "2026-05-v1"
  },
  "integrity_tier": "browser_only | browser_plus_daemon",
  "session_result": {
    "completed": true,
    "submitted": true,
    "withdrawn": false
  },
  "privacy_contract": {
    "ballot_choice_recorded_by_simurgh": false,
    "screen_capture_collected": false,
    "webcam_audio_collected": false,
    "typed_content_collected": false,
    "pasted_content_collected": false,
    "forbidden_fields_rejected": 0
  },
  "device_integrity": {
    "daemon_connected": false,
    "daemon_platform": "none | macos | windows | linux",
    "proof_accept_count": 0,
    "proof_reject_count": 0,
    "replay_rejection_count": 0,
    "tamper_rejection_count": 0
  },
  "audit": {
    "chain_valid": true,
    "event_count": 4
  }
}
```

---

## 8. Safety gates

All six gates must pass before any human participant sees the pilot:

```bash
npm test
npm audit --audit-level=high
node tools/privacy-audit.mjs
bash scripts/check.sh
bash scripts/smoke-voting-pilot.sh
bash scripts/security-audit-voting-pilot.sh
```

### 8.1 `smoke-voting-pilot.sh` covers

```
consent accept → submit → report export (browser-only)
consent accept → submit → report export (browser + fixture daemon)
consent decline → no session created
withdrawal → telemetry stop → report blocked (403)
```

### 8.2 `security-audit-voting-pilot.sh` covers

```
replay proof rejected
tampered proof rejected
forbidden ballot field → 400, field names only in audit event
session without consent token → 401
report for withdrawn session → 403
decline path creates no server-side pilot session, participant code, audit event, or report
```

---

## 9. Non-claims

This pilot does not claim to secure public elections, replace electoral commissions, prevent coercion, prevent malware on compromised devices, guarantee voter eligibility, or validate official vote outcomes. It is a small-scale, consented, voting-adjacent research pilot evaluating privacy-preserving session-integrity evidence in a student-society setting.

---

## 10. Build order

1. **Docs** — create `docs/research/mq-voting-pilot/` protocol files
2. **Module** — `src/votingPilot/index.js`, `consentStore.js`, `reportBuilder.js`, `events.js`
3. **Server wire-up** — one mount in `server.js`
4. **UI** — `public/voting-pilot.html`, `public/voting-pilot-submit.html`
5. **Persona engine** — `tools/voting-pilot-persona.mjs`
6. **Tests** — `tests/e2e/voting-pilot/`
7. **Safety scripts** — `smoke-voting-pilot.sh`, `security-audit-voting-pilot.sh`
8. **All gates pass** — then and only then: researcher self-pilot, then governance/ethics review before human participants

---

## 11. Governance prerequisite

Before any human participant sessions:

- MQ Persian Society Terms of Reference reviewed
- Written executive approval obtained
- MQ Human Research Ethics application submitted and approved (if publishing participant data)
- Consent page version locked and dated
