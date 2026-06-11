# Banking Shield Pilot Protocol

## Stage

Stage B1 - Banking Shield Phase A Synthetic Demo.

## Purpose

This protocol tests whether Project Simurgh can produce verifiable metadata-only integrity evidence for banking-adjacent consent and payment-intent workflows while structurally preventing sensitive banking payloads from entering accepted server state.

## Phase A Scope

Phase A is synthetic-only. It uses fictional scenarios, fixed category choices, in-memory session state, token-bound exports, and HMAC audit-chain verification.

Implemented Phase A scenarios:

- Mock CDR-style consent receipt.
- Mock Confirmation-of-Payee-style decision category.
- Mock remote-access warning.
- Mock payment pause.
- Mock AI-agent finance approval.

## Data Collected

Accepted state may contain:

- Banking session id.
- Anonymous participant code hash.
- Consent timestamps.
- Synthetic scenario type.
- Allowed metadata categories.
- Local risk score and risk categories.
- Manual-review recommendation text.
- HMAC audit-chain events.
- Phase and synthetic data-source labels.

## Data Never Collected

Phase A must not collect credentials, OTPs, account identifiers, BSBs, card numbers, balances, payees, transaction amounts, payment references, transaction text, screenshots, screen pixels, audio, webcam data, app names, process names, window titles, device serials, or MAC addresses.

## Consent Flow

`POST /api/banking-pilot/consent/accept` creates a synthetic Phase A session, anonymous participant code, HMAC-hashed participant code, scoped token, and initial audit-chain events.

## Submission Flow

`POST /api/banking-pilot/submit` requires a valid banking pilot token. One session may submit exactly one synthetic scenario. Unknown fields, forbidden fields, invalid scenario categories, weak consent hashes, and structural pollution keys are rejected before accepted state mutation.

## Withdrawal Flow

`POST /api/banking-pilot/withdraw` requires a valid token and marks the synthetic session withdrawn. Withdrawn sessions cannot export reports.

## Report Flow

`GET /api/banking-pilot/:sessionId/report`, `/audit`, and `/verify` require the token session id to match the path session id. Reports expose privacy assertions, local risk result, and audit validity only. Audit exports contain safe audit entries and no raw rejected request bodies.

## Closure Flow

When `SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true`, write routes return `410 Gone` before auth. Read exports remain token-protected.

## Phase Roadmap

Phase A is implemented now. Phase B and Phase C are roadmap only.

Phase B would require separate approval before any code changes, use fictional scenarios only, and prohibit real bank names, real account data, screenshots, balances, transaction values, personal finance details, or real remote-access app names.

Phase C would require participant notice, governance decision, and separate approval before any code changes. It would remain synthetic banking-adjacent and aggregate-only.

## Non-Claims

This prototype does not implement fraud detection, scam detection, real banking security, payment processing, CDR compliance, Confirmation of Payee, APRA compliance, financial advice, reimbursement assessment, AML/CTF compliance, or malware detection.
