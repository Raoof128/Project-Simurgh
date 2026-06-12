# Banking Pilot Simurgh Alignment Audit

**Date:** 2026-06-12 (Australia/Sydney)  
**Stage:** B3 pre-tester readiness  
**Scope:** Public Banking Shield Phase A tester pages, `/api/banking-pilot`, Banking Shield tests, Banking Shield smoke/security/privacy gates, and alignment with existing Simurgh Academic Shield functions.

## Verdict

Approved for trusted internal tester demo use.

The Banking Shield Phase A tester flow is aligned with the broader Simurgh interface and architecture while preserving the Banking Shield scope lock. It uses the correct Simurgh structural functions: local deterministic scoring, HMAC audit chain, token-bound report/audit/verify exports, closure-before-auth write locking, rate limits, recursive forbidden-field rejection, and metadata-only narrative sanitisation.

It must not reuse Academic Shield proctoring telemetry for Banking Shield Phase A. Academic Shield Sonnet 4.6 proctoring is a separate exam telemetry workflow. Banking Shield Phase A is a synthetic banking-adjacent workflow and must not collect focus events, device scanner signals, screenshots, process names, window titles, app names, real account data, or payment content.

## Alignment Matrix

| Area                         | Status | Evidence                                                                                                                                              |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual system                | Pass   | Public Banking pages now use the Simurgh paper/ink/oxblood/moss system, seal header, research panels, and shared stylesheet.                          |
| Tester entry flow            | Pass   | Consent page creates a `bp_` session and scoped token; scenario and report pages use the existing session storage flow.                               |
| Local official result        | Pass   | `scoreBankingRisk()` remains the official Banking Shield result.                                                                                      |
| HMAC audit chain             | Pass   | Consent, submit, rejected attempt, withdrawal, report, audit, and verify events are HMAC chained.                                                     |
| Report/audit/verify exports  | Pass   | Report, audit, and verify buttons are present in the public tester flow and remain token-bound.                                                       |
| Sonnet narrative boundary    | Pass   | Banking narrative payload builder emits metadata only and tests prove sensitive fields are excluded. Runtime Sonnet narrative remains off by default. |
| Academic proctoring boundary | Pass   | Banking Shield does not call `/api/telemetry`, does not use focus/paste/window/device scanner telemetry, and does not collect proctoring data.        |
| Privacy claims               | Pass   | Reports emit all sensitive collection assertions as `false`, including `sonnet_received_sensitive_payload: false`.                                    |
| Phase B state                | Pass   | B3 remains pre-tester readiness only. No human dry-run results are reported.                                                                          |

## Sonnet 4.6 And Proctoring Assessment

Project Simurgh already has an Academic Shield path where `SIMURGH_MODEL` defaults to `claude-sonnet-4-6`, and the academic telemetry route uses the model as a narrative layer around local risk scoring when enabled.

Banking Shield Phase A should not directly use that proctoring path. Doing so would break the Banking Shield data-minimisation promise because the academic route is built around browser telemetry windows and optional device-integrity signals. Banking Shield only needs scenario categories, booleans, local policy scoring, and safe evidence exports.

Correct Banking Shield position:

- Sonnet can be narrative support only.
- Sonnet must receive a sanitized metadata payload only.
- Sonnet must never receive sensitive banking fields or values.
- The local deterministic banking policy remains the official result.
- The report must keep `sonnet_received_sensitive_payload: false`.
- No fraud, scam, financial-advice, compliance, production bank-security, or automatic-protection claim is made.

## Public UI Audit

The tester pages now present the same product language as Simurgh:

- `public/banking-pilot-consent.html` uses the Simurgh brand header, scope badges, privacy boundary banner, synthetic scope panel, and Simurgh function coverage panel.
- `public/banking-pilot-scenario.html` presents the five fixed synthetic scenarios and the separate withdrawal path.
- `public/banking-pilot-report.html` exposes report, audit, and verify exports in the tester flow.
- `public/banking-pilot.css` centralizes the Banking Shield page theme and responsive controls.

The UI does not invite real banking details, real app/process/window names, screenshots, or account/payment content.

## Runtime Function Audit

Banking Shield Phase A uses:

- `/api/banking-pilot/consent/accept`
- `/api/banking-pilot/submit`
- `/api/banking-pilot/withdraw`
- `/api/banking-pilot/:sessionId/report`
- `/api/banking-pilot/:sessionId/audit`
- `/api/banking-pilot/:sessionId/verify`

Banking Shield Phase A intentionally does not use:

- `/api/telemetry`
- Academic focus-loss or paste telemetry
- Device Shield daemon proof or scanner state
- screen capture
- app/process/window title collection
- real bank or payment integrations
- real CDR or Confirmation of Payee integrations

## Security And Privacy Audit

Controls confirmed:

- Closure flag returns `410` before auth on write routes.
- Token/session mismatch returns `403`.
- One-session-one-submit is enforced.
- Unknown scenario types are rejected.
- Unknown extra fields are rejected.
- Weak `consent_scope_hash` is rejected.
- Pollution keys are rejected.
- Forbidden banking fields are rejected recursively.
- Rejection responses do not echo submitted sensitive values.
- Rejected-attempt audit payloads store route, reason, and field name only.
- Generated evidence fixtures contain no sensitive values.
- Sonnet sanitisation fixture contains no forbidden field names or values.

## Verification

Latest local verification after the alignment audit:

| Gate                                           | Result                                                   |
| ---------------------------------------------- | -------------------------------------------------------- |
| Static Banking page/CSS checks                 | 200 for CSS, consent, scenario, and report pages         |
| `npm test`                                     | 389/389 pass                                             |
| `bash scripts/smoke-banking-pilot.sh`          | 14/14 pass                                               |
| `bash scripts/security-audit-banking-pilot.sh` | 27/27 pass                                               |
| `node scripts/privacy-audit-banking-pilot.mjs` | PASS                                                     |
| `bash scripts/smoke-banking-pilot-full-e2e.sh` | 41/41 pass                                               |
| Targeted Prettier check                        | pass                                                     |
| Local Playwright visual checks                 | desktop consent and mobile scenario screenshots captured |

## Final Decision

Banking Shield Phase A is aligned with Simurgh for tester demo purposes.

Do not add Academic Shield proctoring telemetry to Banking Shield Phase A. The correct integration is structural reuse plus safe narrative support: local scoring, audit chain, report/audit/verify exports, privacy assertions, optional sanitized Sonnet narrative payloads, and explicit non-claims.
