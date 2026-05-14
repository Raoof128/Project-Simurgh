# Stage 1.5 Validation Matrix

This matrix maps reviewer checks to expected behavior and repo evidence. Results should be refreshed after every material change. Evidence files that do not yet exist are marked as pending evidence rather than invented.

| Test                                          | Expected                                                                | Result                                                          | Evidence                                                                       | Status                             |
| --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| Tab switch / focus loss detection             | Focus loss increments risk/event timeline                               | Covered by scoring and events; manual browser demo still useful | `src/academic/riskScoring.js`, `server.js`, `tests/unit/riskScoring.test.js`   | Evidence available                 |
| Paste anomaly scoring                         | Large paste or paste after blur escalates risk                          | Covered by local scoring tests                                  | `src/academic/riskScoring.js`, `tests/unit/riskScoring.test.js`                | Evidence available                 |
| Replay rejection                              | Duplicate or rolled-back sequence rejected                              | Covered by unit test and server path                            | `src/security/replayGuard.js`, `tests/unit/replayGuard.test.js`                | Evidence available                 |
| Stale timestamp rejection                     | Timestamp older than skew window rejected                               | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available                 |
| Future timestamp rejection                    | Timestamp beyond future tolerance rejected                              | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available                 |
| Duplicate sequence rejection                  | Duplicate sequence rejected                                             | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available                 |
| Invalid session token rejection               | Invalid HMAC token rejected                                             | Covered by unit test and middleware                             | `src/security/sessionToken.js`, `tests/unit/sessionToken.test.js`, `server.js` | Evidence available                 |
| Missing session token rejection               | Joined session lifecycle/telemetry rejects missing token                | Covered by middleware and check script smoke                    | `server.js`, `.simurgh_check_logs/smoke.log`                                   | Evidence available after local run |
| Instructor auth protection                    | Instructor APIs require bearer token outside demo mode                  | Implemented; smoke checks auth gates                            | `server.js`, `scripts/check.sh`                                                | Evidence available after local run |
| Missing helper secret rejection               | Non-demo server refuses or helper ingest disabled in demo               | Implemented in bootstrap                                        | `server.js`, `.env.example`                                                    | Evidence available                 |
| Bad helper secret rejection                   | `/api/affinity` returns `401 invalid_helper_secret`                     | Implemented in helper route                                     | `server.js`, `scripts/check.sh`                                                | Evidence available after local run |
| Capture-excluded helper event risk escalation | Hostile helper signal forces Critical floor                             | Implemented in `persistVerdict` and scoring                     | `server.js`, `src/academic/riskScoring.js`                                     | Evidence available                 |
| Audit-chain verification                      | Valid chain verifies                                                    | Covered by unit/tool checks                                     | `src/audit/hmacChain.js`, `tools/verify-audit.mjs`, `scripts/check.sh`         | Evidence available after local run |
| Audit tamper detection                        | Modified entry fails verification                                       | Covered by tests/check script                                   | `tests/unit/hmacChain.test.js`, `scripts/check.sh`                             | Evidence available after local run |
| Privacy audit                                 | Forbidden generated-data fields fail audit                              | Privacy CLI available                                           | `tools/privacy-audit.mjs`                                                      | Evidence available after local run |
| Forbidden-field scan                          | Source guard excludes forbidden content fields outside enforcement code | Check script includes static grep                               | `scripts/check.sh`                                                             | Evidence available after local run |
| Dashboard token stripping                     | Query token removed and Authorization header used                       | Implemented in dashboard                                        | `public/instructor.html`                                                       | Evidence available                 |
| Dashboard safe rendering / XSS hardening      | Dynamic values escaped before rendering                                 | Implemented in dashboard                                        | `public/instructor.html`                                                       | Evidence available                 |
| Rate limiting                                 | High-risk endpoints limited                                             | Covered by unit tests                                           | `src/security/rateLimit.js`, `tests/unit/rateLimit.test.js`                    | Evidence available                 |
| Oversized JSON rejection                      | Body limit rejects payloads above configured limit                      | Express limit configured                                        | `server.js`, `src/config/env.js`                                               | Pending explicit request evidence  |
| Negative value rejection                      | Negative telemetry rejected                                             | Implemented in `sanitiseTelemetry`                              | `server.js`, `scripts/check.sh`                                                | Evidence available after local run |
| `NaN` rejection                               | Non-finite telemetry rejected                                           | Implemented in `sanitiseTelemetry`                              | `server.js`, `tests/unit/replayGuard.test.js`                                  | Evidence available                 |
| `Infinity` rejection                          | Non-finite telemetry rejected                                           | Implemented in `sanitiseTelemetry`                              | `server.js`, `tests/unit/replayGuard.test.js`                                  | Evidence available                 |
| Submitted-session telemetry rejection         | Closed/submitted sessions reject new telemetry                          | Implemented in telemetry route                                  | `server.js`, `scripts/check.sh`                                                | Evidence available after local run |
| Server boot smoke test                        | Server starts and `/health` responds                                    | Check script full mode validates                                | `scripts/check.sh`, `.simurgh_check_logs/smoke.log`                            | Evidence available after local run |
| CI workflow status                            | GitHub Actions runs Stage 1 check suite                                 | Workflow exists; live status depends on GitHub after push       | `.github/workflows/stage-1-checks.yml`                                         | Pending remote CI evidence         |
| Dependency audit                              | No high/critical npm advisories                                         | `npm audit --audit-level=high`                                  | `package-lock.json`, local command output                                      | Evidence available after local run |
| Secret scan                                   | No committed real tokens or API keys                                    | Check script and explicit grep                                  | `scripts/check.sh`, local command output                                       | Evidence available after local run |
| Known invisible-window attack                 | Stage 1 partially mitigates through helper telemetry                    | Documented; not fully solved without helper availability        | `tools/simurgh-helper/README.md`, `docs/THREAT_MODEL.md`                       | Partial                            |
| GPU overlay attack                            | Not fully solved in Stage 1                                             | Documented limitation                                           | `docs/LIMITATIONS.md`, `docs/RISK_REGISTER.md`                                 | Known limitation                   |
| Read-only cheating workflow                   | Not fully solved in Stage 1                                             | Documented limitation                                           | `docs/LIMITATIONS.md`, `SECURITY.md`                                           | Known limitation                   |

## Commands

Run from repo root:

```bash
npm install
./scripts/check.sh --fix
./scripts/check.sh
npm test
node tools/privacy-audit.mjs
npm audit --audit-level=high
git diff --check
git status --short
```

If a command fails, record the exact output under `docs/evidence/stage-1/` only after redacting secrets, local identifiers, tokens, and private data.
