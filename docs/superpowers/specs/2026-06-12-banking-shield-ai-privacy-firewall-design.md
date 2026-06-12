# Stage B4-A — Banking Shield AI Privacy Firewall

**Date:** 2026-06-12
**Status:** Approved design (pre-implementation)
**Stage:** B4-A
**Subtitle:** Offline deterministic narrative generation with input exclusion, output claim control, and privacy receipts

---

## 1. Purpose and revolutionary framing

Banking Shield inverts the usual "AI in banking" risk model. Instead of making AI
powerful by giving it more private data, B4-A proves AI can help **while receiving
almost nothing sensitive**.

> Banking Shield explores whether AI can improve the understandability of
> high-risk financial-session integrity evidence without receiving credentials,
> OTPs, account identifiers, balances, payees, payment amounts, transaction text,
> screenshots, app names, process names, or window titles.

B4-A is the **backend privacy firewall** only. It proves the cage holds. The
user-facing report-page presentation is deferred to a later **B4-B** stage.

The research claim B4-A earns:

> We demonstrate a bounded AI privacy firewall for banking-adjacent integrity
> evidence, where a narrative layer improves explanation while remaining
> structurally unable to receive sensitive financial payloads or alter
> deterministic policy outcomes. The firewall is validated entirely offline with
> deterministic narrative generation and CI-verifiable evidence receipts.

## 2. Scope

### In scope (B4-A)

- Input Firewall (allowlist-only metadata payload + defensive re-scan + byte cap + enum validation).
- Output Claim Firewall (schema validation, forbidden-claim scan, length caps, official-result-unchanged check).
- AI Privacy Receipt (including an auditable "off" path).
- Deterministic mock narrative generator (no network imports).
- `GET /api/banking-pilot/:sessionId/ai-privacy-explain` JSON endpoint.
- Security audit, privacy audit (with a no-egress static gate), smoke script, unit tests.
- Evidence pack, closeout, and claim audit docs.

### Out of scope (deferred or forbidden)

- Public report-page AI explanation UI, button, panel, or styling (→ **B4-B**).
- Live Claude/OpenAI provider, network egress, secrets.
- Phase C logic, real banking integrations, real CDR / Confirmation of Payee.
- Renamed API fields (`verdict` stays as the API field name).
- Any change to report availability, risk score, manual-review recommendation,
  audit validity, withdrawal state, or privacy assertions.
- Any disallowed banking-capability claim (see §9).

## 3. Existing scaffolding reused (not greenfield)

The metadata-only payload is already prepared but unwired. B4-A wires and hardens it.

| Module                                                                                                                               | Role                                                         | Status            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------- |
| `src/bankingPilot/bankingNarrativeSanitiser.js` (`buildBankingNarrativePayload`, `hashBankingSessionId`)                             | Input firewall — allowlist-only metadata payload             | Exists, reused    |
| `src/bankingPilot/bankingNarrativePrompt.js` (`BANKING_NARRATIVE_RECOMMENDATIONS`)                                                   | Claim allowlist source of truth                              | Exists, reused    |
| `src/bankingPilot/forbiddenBankingFields.js` (`containsForbiddenBankingFieldDeep`, `isStructuralPollutionKey`, `MAX_DEPTH_SENTINEL`) | Recursive forbidden-field + prototype-pollution + depth scan | Exists, reused    |
| `src/bankingPilot/bankingReportBuilder.js`, `bankingScenarioPolicy.js`, `bankingRiskScoring.js`                                      | Source of official result fields                             | Exists, read-only |
| `src/bankingPilot/index.js`                                                                                                          | Express router — new route added here                        | Exists, extended  |
| `src/bankingPilot/bankingAudit.js` (`BANKING_PILOT_EVENTS`)                                                                          | Audit event enum — new event added                           | Exists, extended  |

## 4. New modules

All new modules live in `src/bankingPilot/` and import **no** network primitives.

| Module                              | Responsibility                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bankingNarrativeGenerator.js`      | Deterministic mock narrator: maps allowlisted enum metadata → fixed-template narrative object. Pure function, no free text, no randomness, no I/O.                   |
| `bankingNarrativeOutputFirewall.js` | Output claim firewall: schema validation, JSON-only shape, per-field length caps, case-insensitive forbidden-claim scan, official-result-unchanged deep-equal check. |
| `bankingAiPrivacyReceipt.js`        | Builds the privacy receipt for both the enabled (narrative emitted) and disabled/blocked (no narrative) paths.                                                       |
| `bankingAiExplain.js`               | Orchestrator: input firewall → generator → output firewall → receipt. Fail-closed on any gate failure.                                                               |

## 5. Data flow

All in-process; zero network egress.

```
record ─► buildBankingNarrativePayload (INPUT FIREWALL)
        │   ├─ defensive containsForbiddenBankingFieldDeep re-scan
        │   ├─ byte cap
        │   └─ enum-only field validation
        │   receipt: input_firewall_passed, sensitive_payload_sent_to_ai=false
        ▼
   deterministic mock generator (enum → template; no free text, no network)
        ▼
   OUTPUT CLAIM FIREWALL
        │   ├─ schema valid (exact fixed object, JSON-only)
        │   ├─ per-field length caps
        │   ├─ forbidden-claim scan (case-insensitive)
        │   └─ official fields deep-equal to source record
        ▼
   receipt assembled ─► { narrative, receipt }

Any gate failure ⇒ fail-closed: HTTP 422, NO narrative, receipt records the failed gate.
```

## 6. Endpoint contract

**`GET /api/banking-pilot/:sessionId/ai-privacy-explain`**

GET chosen to mirror existing `report` / `audit` / `verify` exports, which are all
GET and append exactly one audit event.

Middleware / behaviour:

- `requireBankingConfig` (pepper + token secret present).
- `limitBankingRead` rate limiting.
- `requireBankingToken` + `requirePathTokenMatch` (token-bound, path-token match).
- **Feature flag `SIMURGH_BANKING_PILOT_AI_EXPLAIN` — default `false` (off).**
  When off, return HTTP `503` with the disabled receipt (see §7.3). No narrative
  generated, no generator invoked.
- **Withdrawn sessions blocked**: return a clear blocked response
  (`ai_explain_blocked_session_withdrawn`). No narrative generated for withdrawn
  sessions. Mirrors `/report` withdrawal blocking.
- On success (flag on, session active): append `AI_EXPLANATION_EXPORTED` to the
  HMAC audit chain, then return narrative + receipt. (Opening this export grows
  the event count, consistent with the existing event-count note.)
- **Disabled and withdrawn paths do NOT append `AI_EXPLANATION_EXPORTED`** — no
  explanation was exported, so no export event is logged. (Dedicated
  `AI_EXPLANATION_BLOCKED_DISABLED` / `AI_EXPLANATION_BLOCKED_WITHDRAWN` events
  are a possible future refinement, deferred for B4-A to keep the chain simple.)

### Route response matrix

| Case                  |                       HTTP | Narrative | Appends `AI_EXPLANATION_EXPORTED` |
| --------------------- | -------------------------: | --------- | --------------------------------- |
| Feature flag off      |                      `503` | none      | no                                |
| Withdrawn session     |                      `403` | none      | no                                |
| Token missing/invalid | existing auth code (`401`) | none      | no                                |
| Path-token mismatch   | existing auth code (`403`) | none      | no                                |
| Input firewall fail   |                      `422` | none      | no                                |
| Output firewall fail  |                      `422` | none      | no                                |
| Success               |                      `200` | emitted   | yes                               |

### Enabled success response

```json
{
  "ai_privacy_layer_enabled": true,
  "provider": "deterministic_mock",
  "narrative": {
    "plain_english_summary": "...",
    "policy_outcome_explanation": "...",
    "privacy_boundary_note": "...",
    "audit_verify_explanation": "...",
    "manual_review_note": "...",
    "non_claims": [
      "not fraud detection",
      "not scam prevention",
      "not financial advice",
      "not a banking decision"
    ],
    "official_result_unchanged": true
  },
  "receipt": {
    "stage": "B4-A",
    "provider": "deterministic_mock",
    "ai_privacy_layer_enabled": true,
    "input_contract_version": "1.0",
    "output_contract_version": "1.0",
    "input_firewall_passed": true,
    "output_claim_firewall_passed": true,
    "sensitive_payload_sent_to_ai": false,
    "network_egress_used": false,
    "official_result_unchanged": true,
    "claim_guard_passed": true,
    "privacy_assertions_preserved": true,
    "narrative_generated": true,
    "narrative_hash": "sha256:<hex>"
  }
}
```

`narrative_hash` is the SHA-256 of the canonical serialized narrative object,
present **only on successful (200) responses**. Because the generator is
deterministic, this hash is stable and assertable in tests — an evidence
fingerprint that proves _what_ was emitted without storing the text. It is
omitted from disabled/blocked receipts (no narrative exists to hash).

## 7. The firewalls and receipt

### 7.1 Input firewall

- Reuse `buildBankingNarrativePayload` to produce an allowlist-only payload
  (session-id **hash**, scenario_type, risk_score, verdict, risk_categories,
  user_action_category, privacy_assertions, manual_review_required).
- Defensive `containsForbiddenBankingFieldDeep` re-scan of the assembled payload;
  any forbidden field or `MAX_DEPTH_SENTINEL` ⇒ fail-closed.
- Byte cap on the serialized payload.
- Enum-only validation of every field (no free text reaches the generator).
- Failure ⇒ receipt `input_firewall_passed:false`, no narrative.

### 7.2 Output claim firewall

- **Schema**: narrative must be the exact fixed object shape; JSON-only; each
  string field within its length cap.
- **Forbidden-claim scanner**: case-insensitive scan of every narrative string
  against a canonical blocklist of **affirmative-capability phrases** (not bare
  words) sourced from the claim-audit disallowed list:
  `fraud detected`, `fraud detection`, `detects fraud`,
  `scam detected`, `detects scams`, `scam prevention capability`,
  `prevents scams`, `scam protection`, `likely scam`, `probably a scam`,
  `payee verified`, `verifies payees`, `safe payment`, `payment is safe`,
  `financial advice`, `bank-grade`, `bank grade`, `APRA compliant`,
  `CDR compliant`, `Confirmation of Payee compliant`, `AML compliant`,
  `CTF compliant`, `production ready`, `production-ready`,
  `protects your account`, `prevents loss`, `prevents financial loss`,
  `malware detected`, `reimbursement assessment`. Any hit ⇒ HTTP 422, receipt
  `claim_guard_passed:false`, no narrative emitted.
- **Bare words are deliberately NOT blocked.** The required non-claim phrases
  (`not scam prevention`, `does not detect scams`, `not fraud detection`,
  `not a banking decision`) must pass the scanner unharmed. The blocklist
  therefore targets affirmative-capability phrasings only; negated/disclaimer
  forms are allowed. Unit tests assert both directions: each forbidden phrase is
  rejected, and each required non-claim phrase is accepted.
- **Official-result-unchanged**: deep-equal the official fields the narrative
  references (`risk_score`, `verdict`, `manual_review_required`) against the
  source record. Any drift ⇒ fail-closed, `official_result_unchanged:false`.

### 7.3 Receipt — including the auditable "off" path

Disabled / blocked response (flag off, or session withdrawn) still returns an
auditable padlock receipt and generates **no** narrative:

```json
{
  "ai_privacy_layer_enabled": false,
  "provider": "deterministic_mock",
  "network_egress_used": false,
  "sensitive_payload_sent_to_ai": false,
  "narrative_generated": false,
  "blocked_reason": "ai_explain_disabled"
}
```

`blocked_reason` is `ai_explain_disabled` (flag off, HTTP 503) or
`ai_explain_blocked_session_withdrawn` (withdrawn session, HTTP 403).

## 8. Verification and evidence (offline, CI-provable)

### Unit tests (`node:test`)

- Generator determinism: same input ⇒ byte-identical output.
- Input firewall rejects every forbidden field name and prototype-pollution key.
- Output firewall rejects each forbidden claim phrase.
- Length-cap enforcement on every narrative field.
- Official-result-unchanged drift detection.
- Receipt correctness for enabled, disabled, and withdrawn-blocked paths.
- Endpoint integration: token required, path-token match, flag-off ⇒ 503,
  withdrawn ⇒ 403, success appends exactly one `AI_EXPLANATION_EXPORTED` event,
  `sensitive_payload_sent_to_ai:false`.

### Smoke script

`scripts/smoke-banking-pilot-ai-firewall.sh`:
consent → submit → `SIMURGH_BANKING_PILOT_AI_EXPLAIN=true` explain → assert receipt
flags → withdraw → assert explain blocked. Also asserts flag-off ⇒ 503.

### No-egress static gate

Extend `scripts/privacy-audit-banking-pilot.mjs` to assert the new generator,
output-firewall, receipt, and orchestrator modules import **no** network
primitives (`fetch`, `node:http`, `node:https`, `node:net`, `node:dgram`,
`undici`, `axios`). Turns "no egress" into a grep-provable fact.

### Evidence pack

- `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md`
- `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLOSEOUT.md`
- `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/` (gate logs:
  npm-test, smoke, security audit, privacy audit, no-egress scan, plus
  accepted/rejected receipt fixtures).

Mirrors the existing Phase A / Phase B naming and layout.

## 9. Claim discipline

### Allowed (B4-A)

> The AI privacy firewall is present, disabled by default, and only enabled
> explicitly for deterministic offline validation. AI improves explanation while
> remaining structurally unable to receive sensitive financial payloads or alter
> deterministic policy outcomes.

### Disallowed (must stay blocked, enforced by the output firewall)

Fraud detection, scam prevention, real banking protection, payment safety, real
payee verification, financial advice, CDR compliance, Confirmation of Payee
compliance, APRA compliance, AML/CTF compliance, reimbursement assessment,
malware detection, production readiness, "protects your account",
"prevents financial loss".

## 10. Change-protocol compliance

Per `raouf-change-protocol`: read `AGENT.md` + `CHANGELOG.md` before changes;
after implementation, prepend a `Raouf:` entry to both
(`[banking-shield-phase-b4a-ai-firewall]`) describing scope, files changed,
verification, and follow-ups (B4-B UI surface).

## 11. Stage that follows

**B4-B — Banking Shield AI Privacy Explanation UI**: surface the
firewall-approved explanation on the public report page with clear user-facing
labels and UI smoke tests, without changing the privacy boundary or official
policy result. Out of scope for this spec.
