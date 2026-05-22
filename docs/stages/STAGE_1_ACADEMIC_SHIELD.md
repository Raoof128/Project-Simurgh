# Simurgh Academic Shield — Stage 1 Documentation

> **Status:** Stage 1 frozen baseline
> **Release:** `v0.3.2-stage-1-ci`
> **Scope:** Academic Shield only
> **Next Stage:** Device Shield
> **Document purpose:** Technical summary, audit record, and reviewer reference

## Contents

1. Overview
2. Research Foundation
3. Stage 1 Goal
4. Stage 1 Threat Model
5. Core Design Decisions
6. Stage 1 Milestones
7. Architecture After Stage 1
8. Module Layout
9. Privacy Model
10. Authentication and Authorisation
11. Replay Protection
12. Input Validation
13. Rate Limiting
14. Risk Scoring
15. Academic Events
16. HMAC Audit Chain
17. Report Model
18. Frontend Hardening
19. Quality Gate
20. Test Coverage
21. CI Status
22. Verification Commands
23. Branch and Release Management
24. Branch Protection
25. Security Posture After Stage 1
26. Known Limitations
27. Why Stage 1 Matters
28. Reviewer Notes
29. Final Stage 1 Status
30. TL;DR

---

## 1. Overview

**Simurgh Academic Shield** is the Stage 1 implementation milestone of Project Simurgh. It transforms the original research prototype into a privacy-first, hardened, audit-backed academic integrity workflow.

Project Simurgh’s original design addresses a structural weakness in browser-based proctoring: visual capture cannot be trusted as a faithful representation of what the user sees. The project therefore avoids relying on screen pixels and instead evaluates behavioural and environment metadata.

Stage 1 focuses only on the **academic integrity layer**. It does not yet implement Stage 2 Device Shield or Stage 3 Agent Shield. The goal is to create a stable, privacy-preserving academic prototype with strong cybersecurity hygiene before expanding into deeper device and agent integrity layers.

---

## 2. Research Foundation

Stage 1 is grounded in the _Invisible Window_ research paper.

The paper demonstrates that browser-based proctoring systems relying on `getDisplayMedia()` can be bypassed using documented operating system display-affinity APIs. On Windows, `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` can hide a visible window from capture output. On macOS, `NSWindow.SharingType.none` provides an equivalent capture-exclusion mechanism.

The key technical finding is that screen capture does **not** guarantee display fidelity. A student may see an overlay or assistant window on the physical display, while the proctoring system receives a clean capture stream. This breaks the trust boundary between the browser and the operating system’s display pipeline.

Because of that, Stage 1 avoids invasive visual surveillance and instead strengthens three safer signals:

1. **Behavioural metadata** from the browser.
2. **Native helper telemetry** for display-affinity detection.
3. **Tamper-evident audit trails** for review and accountability.

---

## 3. Stage 1 Goal

The goal of Stage 1 is to make Simurgh Academic Shield:

```text
Privacy-preserving
Tamper-evident
Deterministic in scoring
Claude-assisted but not Claude-dependent
Authenticated at key trust boundaries
Validated at every API boundary
Resistant to replay and basic spoofing
Safe from obvious dashboard XSS
Backed by automated tests, local checks, and CI
```

Stage 1 does **not** claim to be unbreakable or complete security against all possible adversaries. The correct security posture is:

> Hardened against the Stage 1 threat model, with honest limitations documented.

---

## 4. Stage 1 Threat Model

Stage 1 is hardened against realistic prototype-stage threats, not against all possible adversaries.

| Actor                       | Goal                                               | Stage 1 Defence                                               |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| Student                     | Replay safe telemetry or spoof session activity    | Session token, sequence number, timestamp checks              |
| Student using overlay tools | Hide unauthorised content from screen capture      | Native helper telemetry and affinity-risk escalation          |
| External attacker           | Access instructor sessions, reports, or audit logs | Instructor bearer-token authentication                        |
| Fake helper                 | Submit false affinity reports                      | Helper secret and payload validation                          |
| Network attacker            | Replay or tamper with telemetry                    | Session-bound telemetry, sequence checks, timestamp freshness |
| Curious insider             | Over-collect or misuse student data                | Metadata-only privacy model and report minimisation           |
| Dashboard attacker          | Inject malicious content into event/report views   | Safer rendering and XSS checks                                |
| Repository watcher          | Find secrets or private generated data             | `.gitignore`, secret scan, CI quality gate                    |

Stage 1 does not defend against kernel-level malware, compromised operating systems, hardware-level attacks, or malicious administrators with direct server access.

---

## 5. Core Design Decisions

Three architectural decisions were locked for Stage 1.

### 5.1 Extend in-place

`server.js` remains the main application entry point and route owner.

Instead of doing a full route-level refactor, Stage 1 adds modular logic under `src/` and imports those modules into `server.js`.

Reason:

- Lower risk.
- Faster delivery.
- Existing routes stay working.
- Future refactor remains possible.
- Better for a demo-stable prototype.

### 5.2 Vanilla HTML dashboard

The frontend remains vanilla HTML, CSS, and JavaScript.

No React, Tailwind, Vite, or build system was added in Stage 1.

Reason:

- No build pipeline risk.
- Easier local demo.
- Faster dashboard iteration.
- Better alignment with the existing HTML/SSE dashboard architecture.

### 5.3 Hybrid scoring

Stage 1 uses hybrid scoring:

```text
Local heuristics = official score
Claude = optional narrative on Warning/Critical cases
```

Claude does not silently override numeric risk scores. The local scoring system remains the deterministic source of truth.

Reason:

- Better auditability.
- Lower cost.
- Lower latency.
- Stronger privacy posture.
- Demo works without an Anthropic API key.
- Academic reviewers can inspect deterministic scoring logic.

---

## 6. Stage 1 Milestones

Stage 1 was frozen through three tagged milestones.

| Milestone                          | Tag                           | Purpose                                        |
| ---------------------------------- | ----------------------------- | ---------------------------------------------- |
| Academic Shield Security Hardening | `v0.3.0-stage-1-hardening`    | Added core security and privacy controls       |
| Stage 1 Quality Gate               | `v0.3.1-stage-1-quality-gate` | Added Prettier and `scripts/check.sh`          |
| Stage 1 CI                         | `v0.3.2-stage-1-ci`           | Added GitHub Actions CI and release checkpoint |

The final Stage 1 release is:

```text
v0.3.2-stage-1-ci
```

---

## 7. Architecture After Stage 1

Stage 1 keeps a simple but hardened architecture.

```text
Student Browser
  ├─ privacy notice
  ├─ metadata-only telemetry collector
  ├─ session token
  ├─ sequence number
  └─ timestamp
        |
        v
server.js
  ├─ configuration and secrets
  ├─ auth middleware
  ├─ rate limiting
  ├─ strict validation
  ├─ privacy normalisation
  ├─ local risk scoring
  ├─ optional Claude narrative
  ├─ academic event generation
  ├─ HMAC audit chain
  ├─ report generation
  └─ SSE dashboard stream
        ^
        |
simurgh-helper
  ├─ helper secret
  ├─ display-affinity scan
  ├─ helper heartbeat
  └─ minimised helper payload
```

The original project architecture already established the browser client, Node/Express server, Claude integration, `simurgh-helper`, instructor dashboard, telemetry every 5 seconds, and helper affinity reports every 2 seconds. Stage 1 hardening builds on that foundation.

---

## 8. Module Layout

Stage 1 introduced or formalised a modular structure while keeping `server.js` as the route owner.

```text
src/
  config/
    env.js

  security/
    sessionToken.js
    replayGuard.js
    rateLimit.js

  privacy/
    privacyConfig.js
    normaliseTelemetry.js
    hashIdentity.js

  academic/
    riskScoring.js
    academicEvents.js
    reportBuilder.js
    sessions.js
    exams.js

  helper/
    helperState.js
    affinityIngest.js

  audit/
    hmacChain.js
    verifyAudit.js

  storage/
    memoryStore.js
```

The exact file names may evolve, but the Stage 1 boundary is clear:

- `config/` handles environment and secrets.
- `security/` handles tokens, replay protection, and rate limiting.
- `privacy/` enforces data minimisation.
- `academic/` handles exam/session/risk/report logic.
- `helper/` handles native helper state.
- `audit/` handles tamper-evident verification.
- `storage/` handles local prototype storage.

---

## 9. Privacy Model

Stage 1 is designed around a metadata-only privacy model.

### 9.1 Allowed data

Stage 1 may process and store:

```text
session_id
exam_id
student_id_hash
timestamps
keystroke count
character count
effective WPM
focus loss count
time off window
paste count
paste length
maximum idle gap
keydown interval metadata
helper connected/missing/stale state
capture-excluded window count
risk score
risk categories
academic events
audit hashes
Claude narrative, if generated
```

### 9.2 Forbidden data

Stage 1 must not store:

```text
screen pixels
screenshots
screen recordings
webcam frames
microphone audio
typed answer content
pasted text content
biometric identifiers
raw student names
raw process names by default
raw window titles by default
```

This is the core privacy guarantee of Stage 1.

### 9.3 Privacy audit

Stage 1 added a CI-ready privacy audit tool:

```bash
node tools/privacy-audit.mjs
```

The tool fails if forbidden fields appear in generated data, reports, sessions, or audit output.

Forbidden field examples include:

```text
typed_content
paste_content
answer_text
screenshot
screen_frame
webcam
audio
microphone
face
biometric
raw_student_name
process_name
window_title
```

Hash fields are allowed:

```text
student_id_hash
process_name_hash
window_title_hash
```

---

## 10. Authentication and Authorisation

Stage 1 separates secrets by responsibility.

| Secret                           | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `SIMURGH_INSTRUCTOR_TOKEN`       | Instructor dashboard, report, session, and audit access |
| `SIMURGH_HELPER_SECRET`          | Native helper authentication                            |
| `SIMURGH_AUDIT_SECRET`           | HMAC audit chain                                        |
| `SIMURGH_SESSION_SIGNING_SECRET` | Student session tokens and lifecycle protection         |

The system fails fast when required secrets are missing in hardened modes.

### 10.1 Instructor boundary

Instructor APIs require bearer-token authentication.

Protected surfaces include:

```text
session listing
session report access
audit export
audit verification
dashboard-sensitive routes
```

### 10.2 Helper boundary

Helper APIs require the helper secret.

The `/api/affinity` route rejects unauthorised helper payloads.

### 10.3 Student session boundary

Joined sessions require a HMAC bearer token on state-changing requests and telemetry posts.

This prevents a third party from trivially posting telemetry into another student session.

---

## 11. Replay Protection

Stage 1 added sequence and timestamp replay protection.

Student telemetry includes:

```text
session identity
session token
sequence number
timestamp
telemetry payload
```

The server rejects:

```text
duplicate sequence numbers
sequence rollback
stale timestamps
future timestamps outside tolerance
unknown sessions
closed sessions
invalid session tokens
```

Anonymous sessions still work for demo compatibility, but joined sessions enforce stronger token-bound telemetry.

---

## 12. Input Validation

Stage 1 added strict validation at API boundaries.

Validation rejects:

```text
NaN
Infinity
negative numbers
invalid types
oversized request bodies
overlong arrays
unknown huge fields
invalid session IDs
invalid timestamps
malformed helper payloads
```

A 32 KB JSON body limit is enforced for API payloads.

This reduces the risk of telemetry spoofing, memory abuse, parser abuse, and accidental storage of unwanted data.

---

## 13. Rate Limiting

Stage 1 added route-level rate limiting.

Rate limits protect:

```text
telemetry posts
helper affinity posts
exam join routes
report endpoints
audit endpoints
dashboard-sensitive routes
```

The telemetry rate limit is designed around the expected 5-second telemetry cycle. Normal telemetry is approximately 12 requests per minute, so limits allow legitimate operation while rejecting abusive traffic.

---

## 14. Risk Scoring

Stage 1 uses deterministic local heuristics for official scoring.

### 14.1 Categories

The score is calculated from weighted categories:

| Category        | Purpose                                          |
| --------------- | ------------------------------------------------ |
| `paste_risk`    | Bulk paste or paste-after-blur behaviour         |
| `focus_risk`    | Focus losses and time away from exam window      |
| `typing_risk`   | Abnormal WPM bursts or burst cadence             |
| `idle_risk`     | Long idle gaps before suspicious activity        |
| `affinity_risk` | Capture-excluded window detection                |
| `helper_risk`   | Missing/stale helper signal                      |
| `session_risk`  | Reconnects or unusual session lifecycle patterns |

### 14.2 Thresholds

|  Score | Level    |
| -----: | -------- |
|   0–39 | Safe     |
|  40–69 | Warning  |
| 70–100 | Critical |

### 14.3 Critical override

If the native helper reports a capture-excluded window, the final risk is forced to at least Critical with a score of 85 or higher.

This follows the research finding that display-affinity windows directly break screen capture fidelity and require native detection rather than visual trust.

### 14.4 Claude narrative

Claude is used only as an optional explanation layer.

Claude may generate:

```text
reasoning
summary
manual review recommendation
```

Claude does not silently change:

```text
risk_score
risk_level
category scores
audit state
```

Safe sessions skip Claude calls by default.

---

## 15. Academic Events

Stage 1 introduced an academic event taxonomy.

Events include:

```text
SESSION_CREATED
PRIVACY_ACCEPTED
EXAM_STARTED
TELEMETRY_RECEIVED
FOCUS_LOSS
LONG_TIME_OFF_WINDOW
BULK_PASTE
REPEATED_PASTE
ABNORMAL_WPM_SPIKE
LONG_IDLE_GAP
HELPER_CONNECTED
HELPER_DISCONNECTED
CAPTURE_EXCLUDED_WINDOW
RISK_ESCALATED
RISK_DEESCALATED
CLAUDE_NARRATIVE_ADDED
EXAM_SUBMITTED
REPORT_GENERATED
AUDIT_VERIFIED
```

Events are used for:

- live dashboard updates,
- report generation,
- audit-chain entries,
- manual review context.

Events do not include student answer text or pasted content.

---

## 16. HMAC Audit Chain

Stage 1 preserves and hardens the HMAC audit chain.

Each important academic event can be appended to the chain with:

```text
index
session_id
timestamp
event_type
event hash
previous hash
entry hash
HMAC
```

Stage 1 added or formalised verification through:

```text
GET /api/audit/:sessionId/verify
```

and local check coverage through `scripts/check.sh`.

Tamper testing ensures that changing an audit entry causes verification failure.

---

## 17. Report Model

Stage 1 reports are JSON-first.

A report includes:

```text
report_id
session_id
exam_id
student_id_hash
started_at
submitted_at
duration
final risk level
final risk score
risk category breakdown
event timeline
helper status
privacy mode
audit-chain verification result
manual review recommendation
```

Reports must not state that a student committed misconduct.

Required wording:

```text
Manual review recommended. No automatic misconduct finding.
```

This protects fairness, avoids overclaiming, and keeps the system aligned with academic review processes rather than automated punishment.

---

## 18. Frontend Hardening

Stage 1 kept the frontend vanilla but hardened it.

Implemented protections include:

```text
token stripped from URL after capture
Authorization header used for report and verify calls
unsafe dynamic rendering reduced
dashboard XSS risks checked
no frontend exposure of server secrets
```

Dynamic dashboard data should be rendered with safe DOM methods such as `textContent`, not unsafe `innerHTML`, unless the content is static and trusted.

---

## 19. Quality Gate

Stage 1 added a comprehensive local quality gate:

```bash
./scripts/check.sh
```

Fast mode:

```bash
./scripts/check.sh --quick
```

Fix mode:

```bash
./scripts/check.sh --fix
```

Verbose mode:

```bash
./scripts/check.sh --verbose
```

The check script covers:

```text
Node version
dependency installation status
JavaScript syntax checks
Prettier formatting
unit tests
privacy audit
forbidden-field scanning
forbidden tracking package scanning
secret scanning
unsafe tone/claim scanning
npm audit
server boot smoke test
security header checks
negative-number rejection
duplicate-sequence rejection
join token issuance
joined-session token enforcement
audit-chain build and verify round trip
git status and ahead/behind summary
```

This script became the local enforcement layer for Stage 1.

---

## 20. Test Coverage

Stage 1 added significant test coverage.

Reported final state:

```text
65 total tests
0 failing tests
23 new Stage 1 tests
10 replay protection tests
7 rate limiting tests
11/11 hardened smoke scenarios verified
```

The test suite verifies both feature behaviour and security boundaries.

---

## 21. CI Status

Stage 1 added GitHub Actions CI.

Workflow:

```text
.github/workflows/stage-1-checks.yml
```

The workflow runs on:

```text
push to main
push to stage-1-academic-shield
pull requests targeting main
```

The CI environment uses:

```text
Ubuntu
Node 22
npm ci
./scripts/check.sh
safe SIMURGH_* test environment variables
artifact upload on failure
concurrency cancellation
```

The first CI run on `main` passed all 21 gates in approximately 30 seconds.

Stage 1 intentionally adds **CI**, not CD. There is no deployment automation yet because Stage 1 is a prototype and not a production service.

---

## 22. Verification Commands

Run the full Stage 1 verification suite:

```bash
./scripts/check.sh
```

Run the quick local pre-commit suite:

```bash
./scripts/check.sh --quick
```

Run the formatter and auto-fix supported formatting issues:

```bash
./scripts/check.sh --fix
```

Run tests directly:

```bash
npm test
```

Run the privacy audit directly:

```bash
node tools/privacy-audit.mjs
```

Run the dependency audit:

```bash
npm audit --audit-level=high
```

A Stage 1 build should not be considered ready unless the full check suite passes locally and the GitHub Actions Stage 1 Security Checks workflow is green.

---

## 23. Branch and Release Management

Stage 1 uses:

```text
main
stage-1-academic-shield
```

Both branches are synced at the Stage 1 final commit.

The feature branch remains alive as a visible development branch, while `main` contains the stable Stage 1 release.

Tags:

```text
v0.3.0-stage-1-hardening
v0.3.1-stage-1-quality-gate
v0.3.2-stage-1-ci
```

Release:

```text
v0.3.2-stage-1-ci
```

This creates a clean public milestone history.

---

## 24. Branch Protection

Stage 1 recommends GitHub branch protection on `main`.

Recommended settings:

```text
Require a pull request before merging
Require status checks to pass before merging
Require branches to be up to date before merging
Require Stage 1 Security Checks
Disallow force pushes
Require conversation resolution before merging
```

For solo development, required approvals can be disabled unless another reviewer is available.

---

## 25. Security Posture After Stage 1

Stage 1 defends against:

| Risk                           | Stage 1 Control                      |
| ------------------------------ | ------------------------------------ |
| Unauthorised instructor access | Instructor bearer token              |
| Helper spoofing                | Helper secret                        |
| Telemetry replay               | Sequence and timestamp guard         |
| Session hijack                 | Session token                        |
| Telemetry abuse                | Validation and rate limits           |
| Oversized payloads             | 32 KB body limit                     |
| Unsafe private-data storage    | Privacy normaliser and audit tool    |
| Secret leakage                 | Secret scan in quality gate          |
| Dashboard XSS                  | safer rendering and token handling   |
| Audit tampering                | HMAC audit verification              |
| Overclaiming                   | tone check and manual-review wording |
| Broken main branch             | CI quality gate                      |

Stage 1 does not claim complete security. It creates a hardened prototype baseline.

---

## 26. Known Limitations

Stage 1 has honest limits.

```text
Not a production deployment.
Not a replacement for institutional policy.
Not an automatic misconduct decision system.
Not a biometric identity system.
Not a full device attestation layer.
Not a Windows/Linux helper implementation yet.
Not a hardware-rooted trust system.
Not resistant to all local malware or kernel-level attackers.
```

The research foundation itself shows that browser-only proctoring cannot solve the display-fidelity problem, and that stronger detection requires native helper capability or longer-term OS/hardware integrity support.

---

## 27. Why Stage 1 Matters

Stage 1 matters because it turns Simurgh from:

```text
research prototype
```

into:

```text
privacy-first academic integrity system with security discipline
```

The strongest engineering shift is not just the new features. It is the enforcement layer:

```text
security hardening
privacy guardrails
tests
local quality gate
CI
release tags
branch protection plan
```

This signals that Project Simurgh is not just a clever idea. It is being built as a controlled, auditable security product.

---

## 28. Reviewer Notes

This document describes the Stage 1 prototype state, not a production deployment. The system is designed to support manual academic review by producing privacy-preserving metadata, deterministic risk scores, and tamper-evident audit evidence. It does not automatically determine misconduct and does not collect screen, webcam, microphone, pasted-text, or typed-answer content.

---

## 29. Final Stage 1 Status

```text
Stage 1 Academic Shield: Complete
Security hardening: Complete
Quality gate: Complete
GitHub CI: Complete
Release: Complete
Branch protection: Manual follow-up
Stage 2 readiness: Ready
```

Final frozen baseline:

```text
v0.3.2-stage-1-ci
```

Stage 2 should begin only after `main` remains green under the Stage 1 CI gate.

---

## 30. TL;DR

Stage 1 now documents a clean engineering arc:

```text
Research vulnerability
→ privacy-first academic prototype
→ hardened security controls
→ automated quality gate
→ CI-backed release
```

Simurgh Academic Shield is now a hardened, metadata-only, audit-backed academic integrity prototype ready to serve as the foundation for Stage 2: Device Shield.
