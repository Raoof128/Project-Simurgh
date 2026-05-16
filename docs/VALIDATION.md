# Stage 2 macOS Validation Matrix

> **Status (v0.4.10, 2026-05-16):** Stage 2 macOS Device Shield prototype complete and frozen. This matrix maps the Stage 2 requirements to their verification evidence for macOS. For the Stage 2.5 closeout specifically see [`STAGE_2_MACOS_VALIDATION_MATRIX.md`](STAGE_2_MACOS_VALIDATION_MATRIX.md) and [`STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`](STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md).

This matrix maps reviewer checks to expected behavior and repo evidence. Results should be refreshed after every material change. Evidence files that do not yet exist are marked as pending evidence rather than invented.

| Test                                   | Expected                                                  | Result                                                          | Evidence                                                                       | Status             |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| Tab switch / focus loss detection      | Focus loss increments risk/event timeline                 | Covered by scoring and events; manual browser demo still useful | `src/academic/riskScoring.js`, `server.js`, `tests/unit/riskScoring.test.js`   | Evidence available |
| Paste anomaly scoring                  | Large paste or paste after blur escalates risk            | Covered by local scoring tests                                  | `src/academic/riskScoring.js`, `tests/unit/riskScoring.test.js`                | Evidence available |
| Replay rejection                       | Duplicate or rolled-back sequence rejected                | Covered by unit test and server path                            | `src/security/replayGuard.js`, `tests/unit/replayGuard.test.js`                | Evidence available |
| Stale timestamp rejection              | Timestamp older than skew window rejected                 | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available |
| Future timestamp rejection             | Timestamp beyond future tolerance rejected                | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available |
| Duplicate sequence rejection           | Duplicate sequence rejected                               | Covered by unit test                                            | `tests/unit/replayGuard.test.js`                                               | Evidence available |
| Invalid session token rejection        | Invalid HMAC token rejected                               | Covered by unit test and middleware                             | `src/security/sessionToken.js`, `tests/unit/sessionToken.test.js`, `server.js` | Evidence available |
| Missing session token rejection        | Joined session lifecycle/telemetry rejects missing token  | Covered by middleware and check script smoke                    | `server.js`, `.simurgh_check_logs/smoke.log`                                   | Evidence available |
| Instructor auth protection             | Instructor APIs require bearer token outside demo mode    | Implemented; smoke checks auth gates                            | `server.js`, `scripts/check.sh`                                                | Evidence available |
| macOS Daemon proof validation          | Signed P-256 proofs verified by server                    | Covered by E2E smoke and unit tests                             | `src/integrity/proofValidator.js`, `tests/e2e/stage24_25_smoke.mjs`            | Evidence available |
| macOS Daemon pairing registry          | Session bound to specific node identity                   | Implemented in pairing registry                                 | `src/integrity/pairingRegistry.js`, `scripts/smoke-stage-2-2-2-3.sh`           | Evidence available |
| macOS Affinity scanner risk escalation | Capture-excluded windows force Critical risk              | Implemented in Swift daemon and server risk logic               | `src/academic/riskScoring.js`, `scripts/smoke-stage-2-4-2-5.sh`                | Evidence available |
| Audit-chain verification               | Valid chain verifies                                      | Covered by unit/tool checks                                     | `src/audit/hmacChain.js`, `tools/verify-audit.mjs`, `scripts/check.sh`         | Evidence available |
| Audit tamper detection                 | Modified entry fails verification                         | Covered by tests/check script                                   | `tests/unit/hmacChain.test.js`, `scripts/check.sh`                             | Evidence available |
| Privacy audit                          | Forbidden generated-data fields fail audit                | Privacy CLI available                                           | `tools/privacy-audit.mjs`                                                      | Evidence available |
| Recursive field rejection              | Daemon proofs with forbidden fields are rejected          | Covered by security audit gate                                  | `scripts/security-audit-stage-2-4-2-5.sh`                                      | Evidence available |
| Dashboard device integrity status      | Dashboard shows daemon state and scanner summaries        | Implemented in dashboard and report                             | `public/instructor.html`, `src/academic/reportBuilder.js`                      | Evidence available |
| Rate limiting                          | High-risk endpoints limited                               | Covered by unit tests                                           | `src/security/rateLimit.js`, `tests/unit/rateLimit.test.js`                    | Evidence available |
| Server boot smoke test                 | Server starts and `/health` responds                      | Check script full mode validates                                | `scripts/check.sh`, `.simurgh_check_logs/smoke.log`                            | Evidence available |
| CI workflow status                     | GitHub Actions runs check suite                           | Workflow exists                                                 | `.github/workflows/stage-1-checks.yml`                                         | Evidence available |
| Dependency audit                       | No high/critical npm advisories                           | `npm audit --audit-level=high`                                  | `package-lock.json`, local command output                                      | Evidence available |
| Secret scan                            | No committed real tokens or API keys                      | Check script and explicit grep                                  | `scripts/check.sh`, local command output                                       | Evidence available |
| macOS Swift Daemon build               | Daemon builds on macOS                                    | Validated in check script and security audit                    | `tools/simurgh-daemon-macos/`, `scripts/check.sh`                              | Evidence available |
| macOS Swift Daemon test                | Daemon logic passes native tests                          | Validated in check script and security audit                    | `tools/simurgh-daemon-macos/Tests/`, `scripts/check.sh`                        | Evidence available |
| Known invisible-window attack          | Stage 2 mitigates through native display-affinity scanner | Implemented for macOS                                           | `docs/STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`                                 | Mitigated (macOS)  |
| GPU overlay attack                     | Not fully solved in Stage 2                               | Documented limitation                                           | `docs/LIMITATIONS.md`, `docs/RISK_REGISTER.md`                                 | Known limitation   |
| Windows/Linux scanner                  | Not yet implemented                                       | Stage 2.6+ roadmap milestone                                    | `ROADMAP.md`                                                                   | Planned (2.6)      |

## Commands

Run from repo root:

```bash
npm install
./scripts/check.sh
npm test
node tools/privacy-audit.mjs
./scripts/smoke-stage-2-2-2-3.sh
./scripts/smoke-stage-2-4-2-5.sh
./scripts/security-audit-stage-2-4-2-5.sh
cd tools/simurgh-daemon-macos && swift test && swift build && cd ../..
```
