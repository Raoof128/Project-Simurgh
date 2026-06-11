# Stage B1 Banking Shield Phase A Design

## Status

Approved for implementation planning on 2026-06-11.

## Stage Name

Stage B1 - Banking Shield Phase A Synthetic Demo

## Goal

Prove that a banking-adjacent consent and payment-intent workflow can produce verifiable integrity evidence while structurally preventing sensitive banking payloads from entering accepted server state.

## Scope Lock

Phase A implementation is synthetic-only.

In scope:

- Synthetic banking-style consent acceptance.
- Synthetic scenario submission for five mocked banking-adjacent workflows.
- Metadata-only accepted session state.
- Recursive forbidden-field rejection.
- Explicit scenario allowlists and unknown-field rejection.
- Local deterministic banking risk policy as the official result.
- Optional Sonnet narrative support off by default, with sanitisation tests only.
- HMAC audit chain for lifecycle events and rejected attempts.
- Collection closure on write routes with HTTP 410 before auth.
- Token-protected report, audit, and verification exports.
- Phase A smoke, security, privacy, and unit gates.
- Phase A evidence pack.
- Documentation roadmap for Phase A, Phase B, and Phase C continuity.

Out of scope:

- Phase B or Phase C routes, states, or human-pilot logic.
- Real bank integration.
- Real Consumer Data Right implementation.
- Real Confirmation of Payee implementation.
- Real payment processing.
- Real accounts, balances, payees, transaction amounts, OTPs, credentials, screenshots, app names, process names, window titles, or bank branding.
- Fraud detection, scam detection, reimbursement assessment, financial advice, APRA compliance, CDR compliance, AML/CTF compliance, or malware detection.

## Research Question

Can a privacy-preserving integrity system produce verifiable evidence that a banking-adjacent consent or payment-intent workflow collected only disclosed session metadata, while structurally preventing credentials, OTPs, account identifiers, balances, payee details, transaction amounts, payment references, and transaction content from reaching accepted server state?

## Architecture

Create a new `src/bankingPilot/` subsystem modeled on the voting pilot, mounted in `server.js` at `/api/banking-pilot`.

Primary runtime components:

- `index.js`: Express router and route-level orchestration.
- `bankingSessionStore.js`: in-memory Phase A session records.
- `forbiddenBankingFields.js`: frozen forbidden field list and recursive guard.
- `bankingScenarioPolicy.js`: synthetic scenario allowlists and category validation.
- `bankingRiskScoring.js`: local official score and manual-review wording.
- `bankingReportBuilder.js`: report export with privacy assertions.
- `bankingAudit.js`: audit event names and safe audit helpers.
- `bankingCollectionClosed.js`: closure flag and middleware.
- `bankingNarrativeSanitiser.js`: Sonnet-safe metadata payload builder.
- `bankingNarrativePrompt.js`: narrative prompt text and output contract.

Public pages:

- `public/banking-pilot-consent.html`
- `public/banking-pilot-scenario.html`
- `public/banking-pilot-report.html`

Research docs:

- `docs/research/banking-pilot/BANKING_PILOT_PROTOCOL.md`
- `docs/research/banking-pilot/BANKING_PILOT_THREAT_MODEL.md`
- `docs/research/banking-pilot/BANKING_PILOT_DATA_MANAGEMENT.md`
- `docs/research/banking-pilot/BANKING_PILOT_PARTICIPANT_NOTICE.md`
- `docs/research/banking-pilot/BANKING_PILOT_NON_CLAIMS.md`
- `docs/research/banking-pilot/BANKING_PILOT_PHASE_A_CLOSEOUT.md`
- `docs/research/banking-pilot/BANKING_PILOT_CLAIM_AUDIT.md`

## API

Phase A routes:

- `POST /api/banking-pilot/consent/accept`
- `POST /api/banking-pilot/submit`
- `POST /api/banking-pilot/withdraw`
- `GET /api/banking-pilot/:sessionId/report`
- `GET /api/banking-pilot/:sessionId/audit`
- `GET /api/banking-pilot/:sessionId/verify`

Closure flag:

```text
SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true
```

When enabled, write routes return `410 Gone` before token authentication:

- `POST /consent/accept`
- `POST /submit`
- `POST /withdraw`

Read routes stay token-protected and available for already-created sessions.

## Token Semantics

Banking pilot tokens must be HMAC-signed and scoped to:

- `banking_session_id`
- `anonymous_participant_code_hash`
- `phase = phase_a_synthetic`
- `issued_at`
- `expires_at`
- `purpose = banking_pilot_session`
- `version = banking-pilot-token-v1`

Tokens must never include real banking data, submitted scenario payloads, sensitive values, or raw rejected request bodies.

Token rules:

- Report, audit, and verify routes require token session id to match the path session id.
- Submit and withdraw routes require token session id to match the session state and any optional body session id.
- Phase A tokens expire after a fixed TTL.

## Synthetic Scenarios

The Phase A scenario policy accepts only these five scenario types:

- `mock_cdr_consent`
- `mock_confirmation_of_payee`
- `remote_access_warning`
- `mock_payment_pause`
- `mock_ai_agent_finance_action`

Each scenario has its own explicit allowlist. Unknown fields are rejected unless listed in that scenario contract.

One session may submit exactly one scenario. Smoke tests must create a fresh session for each valid synthetic scenario. Double submit on the same session is rejected.

Allowed examples:

```json
{
  "scenario_type": "mock_confirmation_of_payee",
  "mock_cop_result_category": "close_match",
  "risk_prompt_shown": true,
  "user_action": "pause"
}
```

```json
{
  "scenario_type": "mock_ai_agent_finance_action",
  "agent_action_type": "payment_draft",
  "user_decision": "reject",
  "financial_payload_recorded_by_simurgh": false
}
```

The AI-agent scenario must reject any payload where `financial_payload_recorded_by_simurgh` is not exactly `false`.

The CDR consent scenario must require `consent_scope_hash` to match:

```text
/^sha256:[a-f0-9]{64}$/
```

It must reject weak, uppercase, or prefix-less values such as `sha256:abc`, `sha256:E3B0...`, and raw hex without the `sha256:` prefix.

## Privacy And Security Model

The implementation uses structural exclusion, not participant trust.

Controls:

- Browser pages send explicit JSON only.
- Server enforces scenario allowlists.
- Server rejects unknown fields.
- Server recursively rejects forbidden fields in nested objects and arrays.
- Rejection responses may include the forbidden field name only.
- Rejection responses must never echo the submitted value.
- Rejected-attempt audit entries record route, reason, and field name only.
- Accepted session state stores only metadata and risk categories.
- Reports emit all sensitive collection assertions as `false`.
- Sonnet narrative payloads are built only from sanitised metadata.

Security hardening requirements:

- Banking pilot JSON request body limit: 16 KB.
- Recursive payload scans must enforce max depth 20.
- Reject structural pollution keys: `__proto__`, `prototype`, and `constructor`.
- Structural pollution keys return `400` with `invalid_payload_key`.
- Unknown scenario type returns `400` with `invalid_scenario_type`.
- Runtime Sonnet calls are disabled by default.
- Phase A runtime smoke does not call external Sonnet unless `SIMURGH_BANKING_PILOT_ENABLE_NARRATIVE=true`.
- Default smoke validates the narrative sanitiser with local fixtures only.

Sensitive collection assertions required in reports:

```json
{
  "credential_recorded_by_simurgh": false,
  "otp_recorded_by_simurgh": false,
  "account_identifier_recorded_by_simurgh": false,
  "balance_recorded_by_simurgh": false,
  "transaction_amount_recorded_by_simurgh": false,
  "payee_recorded_by_simurgh": false,
  "payment_reference_recorded_by_simurgh": false,
  "transaction_content_recorded_by_simurgh": false,
  "screen_capture_recorded_by_simurgh": false,
  "webcam_audio_recorded_by_simurgh": false,
  "raw_process_or_window_title_recorded_by_simurgh": false,
  "remote_access_app_name_recorded_by_simurgh": false,
  "banking_payload_recorded_by_simurgh": false,
  "sonnet_received_sensitive_payload": false
}
```

## Privacy Audit Correction

The privacy audit must distinguish field-name definitions from payload leakage.

Allowed appearances:

- Forbidden field names inside `src/bankingPilot/forbiddenBankingFields.js`.
- Forbidden field names inside docs that describe the privacy contract.
- Forbidden field names inside tests that verify rejection behavior.
- Forbidden field names inside audit scripts that define attack cases.

Failing appearances:

- Sensitive values or forbidden payload structures in accepted session state.
- Sensitive values or forbidden payload structures in generated reports.
- Sensitive values or forbidden payload structures in HMAC audit payloads.
- Sensitive values or forbidden payload structures in generated Phase A evidence.
- Sensitive values or forbidden payload structures in Sonnet narrative payload fixtures.

The audit therefore scans generated artifacts and accepted/exported JSON semantics, not merely source text that names the forbidden fields.

The privacy audit must have meaningful generated fixtures to scan:

- `accepted-report-fixture.json`
- `rejected-attempt-audit-fixture.json`
- `sonnet-sanitised-payload-fixture.json`
- `closure-response-fixture.json`

The audit must fail if known attack values appear in generated evidence, including:

- `111111`
- `123456`
- `4111111111111111`
- `VerySecretOtp`
- `MockSensitivePayee`

## Local Risk Policy

The official result is local deterministic risk scoring.

Risk levels:

- `safe`: 0-29
- `warning`: 30-69
- `critical`: 70-100

Allowed recommendation text:

- `No banking-integrity anomaly detected.`
- `Manual review recommended. No automatic fraud finding.`
- `Manual review required. No automatic fraud finding.`

Forbidden wording:

- Fraud detected.
- Scam detected.
- User is victim.
- User is malicious.
- Payment is fraudulent.
- Banking account compromised.

## Sonnet Narrative Support

Sonnet support is optional and off by default in Phase A.

If enabled later, Sonnet receives only sanitised metadata:

- Session id hash.
- Scenario type.
- Risk score and verdict.
- Risk categories.
- User action category.
- Privacy assertions.
- Manual-review requirement.

Sonnet must not receive credentials, OTPs, account identifiers, balances, payees, transaction amounts, payment references, transaction text, screen content, webcam/audio data, app names, process names, window titles, or personal identifiers.

Phase A tests must prove `buildBankingNarrativePayload()` rejects or omits forbidden fields and sets `sonnet_received_sensitive_payload` to `false`.

Runtime Sonnet calls are not part of the default Phase A smoke path. The default Phase A proof is local sanitiser output plus tests. External narrative calls require an explicit future opt-in flag and must still pass the same sanitiser contract.

## Response Contracts

Forbidden field rejection:

```json
{
  "ok": false,
  "error": "forbidden_banking_field",
  "field": "otp"
}
```

Unknown field rejection:

```json
{
  "ok": false,
  "error": "unknown_field",
  "field": "note"
}
```

Structural pollution key rejection:

```json
{
  "ok": false,
  "error": "invalid_payload_key",
  "field": "__proto__"
}
```

Closure response:

```json
{
  "ok": false,
  "error": "banking_pilot_collection_closed"
}
```

Token mismatch:

```json
{
  "ok": false,
  "error": "forbidden"
}
```

Audit and verify routes:

- `/audit` returns safe audit entries only.
- `/verify` returns boolean verification state and verification metadata only.
- Neither route returns raw submitted values, chain secret material, token secrets, HMAC keys, or raw rejected request bodies.

## Phase Roadmap

Phase A: Synthetic demo.

- Implemented now.
- Synthetic sessions only.
- No human participants.
- No real banking data.
- Evidence label: `synthetic_test_suite`.

Phase B: Internal dry run.

- Documentation roadmap only in this implementation.
- Requires separate approval before code changes.
- Would use trusted internal testers and fictional scenarios only.
- No real bank names, real accounts, real balances, real transaction amounts, screenshots, personal finance details, or real remote-access app names.

Phase C: Small pilot.

- Documentation roadmap only in this implementation.
- Requires participant notice, governance decision, and separate approval before code changes.
- Would target aggregate results only.
- Still synthetic banking scenarios only.

## Test Plan

Unit tests:

- Forbidden field list is frozen and duplicate-free.
- Recursive guard rejects nested object fields.
- Recursive guard rejects nested array fields.
- Recursive guard rejects structural pollution keys.
- Scenario allowlists accept valid synthetic payloads.
- Scenario allowlists reject unknown fields.
- Scenario allowlists reject unknown `scenario_type`.
- Scenario allowlists reject invalid categories.
- CDR consent rejects weak, uppercase, prefix-less, and malformed consent scope hashes.
- CDR consent accepts `sha256:<64 lowercase hex chars>`.
- AI-agent scenario accepts only boolean `false` for `financial_payload_recorded_by_simurgh`.
- Risk scoring thresholds and manual-review wording are stable.
- Report builder emits all sensitive assertions as `false`.
- Collection closure middleware returns 410 before auth.
- Narrative sanitiser excludes forbidden fields.
- Audit tamper fixture fails verification after one event is mutated.

Security audit:

- Submit `account_number`, nested `otp`, card number in array, amount, payee, payment reference, window title, process name, remote app name.
- Verify all are rejected with `400`.
- Verify responses never echo submitted sensitive values.
- Verify authenticated, session-bound rejected attempts append audit entries with route, reason, and field name only.
- Verify unauthenticated rejected attempts do not create session audit records or store user-supplied values.
- Verify valid token after closure receives `410`.
- Verify withdrawn report returns `403`.
- Verify token/path mismatch returns `403`.
- Verify tampered audit chain fails verification.
- Verify replay or double submit is rejected.
- Verify one session cannot submit more than one scenario.

Smoke gates:

- Consent page loads.
- Consent accept returns anonymous session id and token.
- All five synthetic scenarios submit, using a fresh session for each scenario.
- Forbidden banking field is rejected.
- Report exports privacy assertions.
- Audit chain verifies.
- Withdrawal excludes report.
- Collection closure returns 410 on write routes.
- Local Sonnet sanitisation fixture contains metadata only.

Privacy audit:

- Generated Phase A evidence contains no sensitive values.
- Reports contain privacy assertions only, not forbidden payloads.
- Audit payloads contain route, reason, and field name only.
- Sonnet payload fixtures contain metadata only.
- Accepted-report, rejected-attempt audit, Sonnet sanitised payload, and closure response fixtures are generated and scanned.
- Known attack values are absent from generated evidence.
- Guard modules, docs, and tests are exempt from simple forbidden-name failure.

Static/doc gates:

- Public demo pages use fictional labels such as `Mock Bank`, `Example Payee Check`, and `Synthetic Finance Agent`.
- Public demo pages must not include real bank names or branding.
- Docs may mention real institutions only in cited research or regulatory context, not as demo UI branding.

## Evidence Pack

Create Phase A evidence under:

```text
docs/research/banking-pilot/evidence/phase-a-synthetic/
```

Expected files:

- `npm-test.txt`
- `npm-audit.txt`
- `privacy-audit-banking-pilot.txt`
- `smoke-banking-pilot.txt`
- `security-audit-banking-pilot.txt`
- `sonnet-sanitisation-audit.txt`
- `smoke-banking-pilot-closed.txt`
- `accepted-report-fixture.json`
- `rejected-attempt-audit-fixture.json`
- `sonnet-sanitised-payload-fixture.json`
- `closure-response-fixture.json`
- `phase-a-closeout.md`
- `claim-audit.md`

## Acceptance Criteria

Stage B1 Phase A is complete when:

- Five synthetic scenarios submit successfully.
- No forbidden banking fields are accepted.
- Forbidden-field rejection is recursive.
- Unknown extra fields are rejected unless allowlisted.
- Rejection responses do not echo sensitive values.
- Rejected-attempt audit entries contain only route, reason, and field name.
- Local deterministic risk policy remains the official result.
- Sonnet support is optional/off by default and sanitisation is tested.
- HMAC audit chain verifies.
- Reports emit all sensitive collection assertions as `false`.
- Withdrawn sessions cannot export reports.
- Collection closure returns 410 before auth.
- Unit tests, smoke scripts, security audit, privacy audit, and npm audit pass or have documented environment-specific blockers.
- Phase A evidence pack is archived.
- Phase A docs and A/B/C roadmap docs are complete.
- `AGENT.md` and `CHANGELOG.md` contain the final implementation log.
