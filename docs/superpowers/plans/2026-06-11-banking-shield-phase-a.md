# Banking Shield Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage B1 - Banking Shield Phase A Synthetic Demo with metadata-only synthetic banking-adjacent scenarios, privacy gates, HMAC evidence, and Phase A documentation.

**Architecture:** Add an isolated `src/bankingPilot/` Express subsystem mounted at `/api/banking-pilot`, modeled on the voting pilot but with explicit scenario allowlists, recursive forbidden banking-field rejection, local deterministic risk scoring, optional/off-by-default narrative sanitisation, and Phase A-only evidence exports. Documentation covers the Phase A/B/C roadmap, but implementation contains no Phase B/C routes, states, or human-pilot logic.

**Tech Stack:** Node.js ES modules, Express, `node:test`, existing HMAC audit chain, existing session-token helper, Bash smoke/security scripts, Prettier.

---

## File Structure

Create:

- `src/bankingPilot/bankingAudit.js`: event constants and safe rejected-attempt payload builder.
- `src/bankingPilot/bankingCollectionClosed.js`: closure flag and 410-before-auth middleware.
- `src/bankingPilot/forbiddenBankingFields.js`: frozen forbidden banking-field names and recursive deep guard.
- `src/bankingPilot/bankingScenarioPolicy.js`: five synthetic scenario contracts, allowlist validation, and unknown-field rejection.
- `src/bankingPilot/bankingConsentToken.js`: HMAC token issuer/verifier scoped to Phase A banking session identity.
- `src/bankingPilot/bankingRiskScoring.js`: official local risk score and fixed recommendation wording.
- `src/bankingPilot/bankingNarrativePrompt.js`: Sonnet narrative prompt and schema constants.
- `src/bankingPilot/bankingNarrativeSanitiser.js`: metadata-only Sonnet payload builder.
- `src/bankingPilot/bankingSessionStore.js`: in-memory Phase A session store.
- `src/bankingPilot/bankingReportBuilder.js`: privacy-preserving report, audit, and verify exports.
- `src/bankingPilot/index.js`: router and route orchestration.
- `public/banking-pilot-consent.html`: synthetic-only consent page.
- `public/banking-pilot-scenario.html`: synthetic scenario page with explicit JSON bodies.
- `public/banking-pilot-report.html`: token-based report lookup page.
- `tests/unit/bankingPilot/*.test.js`: focused unit tests.
- `tests/security/banking_pilot_security_audit.test.js`: static/serverless security assertions.
- `tests/e2e/banking_pilot_smoke.mjs`: optional direct route/app smoke helper if needed by scripts.
- `tests/e2e/banking_pilot_closed_smoke.mjs`: optional closure helper if needed by scripts.
- `scripts/smoke-banking-pilot.sh`: running-server Phase A smoke gates.
- `scripts/smoke-banking-pilot-closed.sh`: dedicated closure smoke gates.
- `scripts/security-audit-banking-pilot.sh`: running-server security audit.
- `scripts/privacy-audit-banking-pilot.mjs`: generated-artifact semantic privacy audit.
- `docs/research/banking-pilot/*.md`: protocol, threat model, data management, participant notice, non-claims, closeout, claim audit.
- `docs/research/banking-pilot/evidence/phase-a-synthetic/README.md`: evidence pack index.

Modify:

- `server.js`: import and mount the banking pilot router.
- `.env.example`: document `SIMURGH_BANKING_PILOT_PEPPER`, `SIMURGH_BANKING_PILOT_TOKEN_SECRET`, and `SIMURGH_BANKING_PILOT_COLLECTION_CLOSED`.
- `scripts/check.sh`: add targeted banking test, smoke, security, privacy, and closure gates.
- `AGENT.md`: append final `Raouf:` implementation log after verification.
- `CHANGELOG.md`: append final release entry after verification.

---

### Task 1: Banking Core Guards

**Files:**

- Create: `src/bankingPilot/forbiddenBankingFields.js`
- Create: `src/bankingPilot/bankingScenarioPolicy.js`
- Test: `tests/unit/bankingPilot/forbiddenBankingFields.test.js`
- Test: `tests/unit/bankingPilot/bankingScenarioPolicy.test.js`

- [ ] **Step 1: Write forbidden-field tests**

Create `tests/unit/bankingPilot/forbiddenBankingFields.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  FORBIDDEN_BANKING_FIELD_NAMES,
  containsForbiddenBankingFieldDeep,
} from "../../../src/bankingPilot/forbiddenBankingFields.js";

test("FORBIDDEN_BANKING_FIELD_NAMES is frozen and duplicate-free", () => {
  assert.ok(Object.isFrozen(FORBIDDEN_BANKING_FIELD_NAMES));
  assert.equal(new Set(FORBIDDEN_BANKING_FIELD_NAMES).size, FORBIDDEN_BANKING_FIELD_NAMES.length);
});

test("recursive guard rejects top-level and nested forbidden banking fields", () => {
  assert.equal(containsForbiddenBankingFieldDeep({ account_number: "111" }), "account_number");
  assert.equal(containsForbiddenBankingFieldDeep({ nested: { otp: "123456" } }), "otp");
  assert.equal(
    containsForbiddenBankingFieldDeep({ rows: [{ window_title: "Bank" }] }),
    "window_title"
  );
});

test("recursive guard rejects structural pollution keys", () => {
  assert.equal(containsForbiddenBankingFieldDeep({ constructor: { value: "x" } }), "constructor");
  assert.equal(containsForbiddenBankingFieldDeep({ nested: { prototype: "x" } }), "prototype");
  assert.equal(
    containsForbiddenBankingFieldDeep(JSON.parse('{"__proto__":{"polluted":true}}')),
    "__proto__"
  );
});

test("recursive guard ignores metadata-only payloads", () => {
  assert.equal(
    containsForbiddenBankingFieldDeep({
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    }),
    null
  );
});
```

- [ ] **Step 2: Write scenario-policy tests**

Create `tests/unit/bankingPilot/bankingScenarioPolicy.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateBankingScenarioPayload } from "../../../src/bankingPilot/bankingScenarioPolicy.js";

const VALID_SCOPE_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test("accepts all five valid Phase A synthetic scenarios", () => {
  const validPayloads = [
    {
      scenario_type: "mock_cdr_consent",
      submit_intent: true,
      consent_scope_hash: VALID_SCOPE_HASH,
      consent_duration_category: "one_time",
      withdrawal_option_shown: true,
    },
    {
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "match",
      risk_prompt_shown: true,
      user_action: "continue",
    },
    {
      scenario_type: "remote_access_warning",
      user_selected_context: "caller_requested_remote_access",
      risk_prompt_shown: true,
      user_action: "request_review",
    },
    { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause" },
    {
      scenario_type: "mock_ai_agent_finance_action",
      agent_action_type: "payment_draft",
      user_decision: "reject",
      financial_payload_recorded_by_simurgh: false,
    },
  ];

  for (const payload of validPayloads) {
    assert.deepEqual(validateBankingScenarioPayload(payload).ok, true);
  }
});

test("rejects unknown extra fields and invalid categories", () => {
  assert.deepEqual(
    validateBankingScenarioPayload({
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
      note: "extra",
    }),
    {
      ok: false,
      reason: "unknown_field",
      field: "note",
    }
  );

  assert.equal(
    validateBankingScenarioPayload({
      scenario_type: "mock_confirmation_of_payee",
      mock_cop_result_category: "definitely_match",
      risk_prompt_shown: true,
      user_action: "continue",
    }).reason,
    "invalid_category"
  );
});

test("rejects invalid scenario type and weak consent scope hashes", () => {
  assert.equal(
    validateBankingScenarioPayload({ scenario_type: "real_payment" }).reason,
    "invalid_scenario_type"
  );

  for (const consent_scope_hash of [
    "sha256:abc",
    "sha256:E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  ]) {
    assert.equal(
      validateBankingScenarioPayload({
        scenario_type: "mock_cdr_consent",
        submit_intent: true,
        consent_scope_hash,
        consent_duration_category: "one_time",
        withdrawal_option_shown: true,
      }).reason,
      "invalid_consent_scope_hash"
    );
  }
});

test("AI-agent scenario requires financial_payload_recorded_by_simurgh to be false boolean", () => {
  const base = {
    scenario_type: "mock_ai_agent_finance_action",
    agent_action_type: "payment_draft",
    user_decision: "reject",
  };

  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: false,
    }).ok,
    true
  );
  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: true,
    }).reason,
    "invalid_privacy_assertion"
  );
  assert.equal(
    validateBankingScenarioPayload({
      ...base,
      financial_payload_recorded_by_simurgh: "false",
    }).reason,
    "invalid_privacy_assertion"
  );
  assert.equal(validateBankingScenarioPayload(base).reason, "missing_required_field");
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/unit/bankingPilot/forbiddenBankingFields.test.js tests/unit/bankingPilot/bankingScenarioPolicy.test.js
```

Expected: fail because modules do not exist.

- [ ] **Step 4: Implement guard and policy**

Create `src/bankingPilot/forbiddenBankingFields.js`:

```js
export const FORBIDDEN_BANKING_FIELD_NAMES = Object.freeze([
  "password",
  "passcode",
  "pin",
  "otp",
  "mfa_code",
  "token_code",
  "card_number",
  "cvv",
  "expiry",
  "account_number",
  "bsb",
  "iban",
  "swift",
  "payee_name",
  "payee_account",
  "transaction_amount",
  "amount",
  "balance",
  "available_balance",
  "statement_line",
  "merchant_name",
  "payment_reference",
  "invoice_number",
  "raw_transaction",
  "transaction_history",
  "raw_statement",
  "bank_login",
  "customer_number",
  "netbank_id",
  "commbiz_token",
  "screen_pixels",
  "screenshot",
  "screen_recording",
  "webcam",
  "audio",
  "typed_content",
  "paste_content",
  "window_title",
  "process_name",
  "remote_app_name",
  "installed_app_name",
  "device_serial",
  "mac_address",
  "__proto__",
  "prototype",
  "constructor",
]);

const FORBIDDEN_SET = new Set(FORBIDDEN_BANKING_FIELD_NAMES);

export function containsForbiddenBankingFieldDeep(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = containsForbiddenBankingFieldDeep(item);
      if (found) return found;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_SET.has(key)) return key;
    const found = containsForbiddenBankingFieldDeep(nested);
    if (found) return found;
  }
  return null;
}
```

Create `src/bankingPilot/bankingScenarioPolicy.js` with explicit contracts and `validateBankingScenarioPayload(payload)`.

Rules:

- `consent_scope_hash` must match `/^sha256:[a-f0-9]{64}$/`.
- Unknown `scenario_type` returns `{ ok: false, reason: "invalid_scenario_type" }`.
- Unknown extra fields return `{ ok: false, reason: "unknown_field", field }`.
- AI-agent `financial_payload_recorded_by_simurgh` must be boolean `false`.
- Structural pollution keys return `{ ok: false, reason: "invalid_payload_key", field }`.
- Recursive scans enforce max depth 20.

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
npm test -- tests/unit/bankingPilot/forbiddenBankingFields.test.js tests/unit/bankingPilot/bankingScenarioPolicy.test.js
```

Expected: pass.

---

### Task 2: Risk, Audit, Narrative Sanitisation, And Reports

**Files:**

- Create: `src/bankingPilot/bankingAudit.js`
- Create: `src/bankingPilot/bankingRiskScoring.js`
- Create: `src/bankingPilot/bankingNarrativePrompt.js`
- Create: `src/bankingPilot/bankingNarrativeSanitiser.js`
- Create: `src/bankingPilot/bankingReportBuilder.js`
- Test: `tests/unit/bankingPilot/bankingRiskScoring.test.js`
- Test: `tests/unit/bankingPilot/bankingNarrativeSanitiser.test.js`
- Test: `tests/unit/bankingPilot/bankingReportBuilder.test.js`

- [ ] **Step 1: Write tests for official risk wording and no fraud claims**

Create tests that assert threshold outputs, exact recommendation strings, and absence of forbidden claim words in recommendation outputs.

- [ ] **Step 2: Write tests for narrative sanitisation**

Assert the narrative payload contains `session_id_hash`, `scenario_type`, `risk_score`, `verdict`, `risk_categories`, `privacy_assertions`, and `manual_review_required`, and does not contain any forbidden field names from an attempted raw input object.

- [ ] **Step 3: Write report tests**

Assert reports contain all required sensitive assertions as `false`, `audit.chain_valid === true`, Phase A labels, and no raw scenario payload values.

- [ ] **Step 4: Run tests to verify they fail**

Run:

```bash
npm test -- tests/unit/bankingPilot/bankingRiskScoring.test.js tests/unit/bankingPilot/bankingNarrativeSanitiser.test.js tests/unit/bankingPilot/bankingReportBuilder.test.js
```

Expected: fail because modules do not exist.

- [ ] **Step 5: Implement modules**

Use existing `src/audit/hmacChain.js` `verifyChain()` in the report builder. Keep report payloads metadata-only and include `phase: "phase_a_synthetic"` and `data_source: "synthetic_test_suite"`.

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- tests/unit/bankingPilot/bankingRiskScoring.test.js tests/unit/bankingPilot/bankingNarrativeSanitiser.test.js tests/unit/bankingPilot/bankingReportBuilder.test.js
```

Expected: pass.

---

### Task 3: Session Store, Closure Middleware, And Router

**Files:**

- Create: `src/bankingPilot/bankingConsentToken.js`
- Create: `src/bankingPilot/bankingSessionStore.js`
- Create: `src/bankingPilot/bankingCollectionClosed.js`
- Create: `src/bankingPilot/index.js`
- Modify: `server.js`
- Test: `tests/unit/bankingPilot/bankingCollectionClosed.test.js`
- Test: `tests/unit/bankingPilot/router.test.js`

- [ ] **Step 1: Write closure-before-auth test**

Test that `rejectBankingWritesIfClosed()` returns `410` without requiring an Authorization header when `SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true`.

- [ ] **Step 2: Write router behavior tests**

Use an Express test app and Node `fetch()` against a local listener. Cover consent accept, valid submit, forbidden-field rejection, unknown-field rejection, withdraw, report, audit, verify, token mismatch, and double submit.

Add explicit cases:

- Token body/path mismatch returns `403` with `{ ok: false, error: "forbidden" }`.
- One session cannot submit twice.
- A fresh session is used for each smoke scenario.
- Unauthenticated forbidden payloads are not appended to any session audit chain.
- `/audit` returns safe audit entries only, without raw submitted values or HMAC key material.
- `/verify` returns boolean verification state and metadata only.
- Mutating one audit entry causes verify to report failure in a unit fixture.

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- tests/unit/bankingPilot/bankingCollectionClosed.test.js tests/unit/bankingPilot/router.test.js
```

Expected: fail because router/store modules do not exist.

- [ ] **Step 4: Implement store and router**

Rules:

- Consent accept creates `bp_` session id, anonymous participant code, HMAC-hashed participant code, audit chain, and session token.
- Banking tokens are HMAC-signed and scoped to `banking_session_id`, `anonymous_participant_code_hash`, `phase = phase_a_synthetic`, `issued_at`, `expires_at`, `purpose = banking_pilot_session`, and `version = banking-pilot-token-v1`.
- Tokens never include real banking data, submitted scenario payloads, sensitive values, or raw rejected request bodies.
- Submit checks closure, token, session existence, withdrawn state, already-submitted state, body/path match, forbidden deep field, then scenario policy.
- Forbidden rejection appends safe audit event with `{ route, reason, field_name }`.
- Only authenticated, session-bound rejected attempts append to a session audit chain.
- Unauthenticated rejected attempts return safe errors and do not create audit records containing user-supplied values.
- Submit appends accepted metadata only.
- One session may submit exactly one scenario.
- Withdraw appends event and blocks future report exports.
- Report/audit/verify require matching token.
- Verify returns `{ audit_chain_valid: true|false }` and no sensitive payloads.
- Response schemas use `{ ok: false, error: "..." }` for rejections.
- Banking route JSON body limit is 16 KB, enforced before router processing.
- Recursive forbidden-field scanning enforces max depth 20.

- [ ] **Step 5: Mount router in `server.js`**

Import:

```js
import bankingPilotRouter from "./src/bankingPilot/index.js";
```

Mount near voting pilot:

```js
app.use("/api/banking-pilot", bankingPilotRouter);
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```bash
npm test -- tests/unit/bankingPilot/bankingCollectionClosed.test.js tests/unit/bankingPilot/router.test.js
```

Expected: pass.

---

### Task 4: Public Phase A Pages

**Files:**

- Create: `public/banking-pilot-consent.html`
- Create: `public/banking-pilot-scenario.html`
- Create: `public/banking-pilot-report.html`

- [ ] **Step 1: Create consent page**

Add a synthetic-only notice, non-claims, and button that calls `POST /api/banking-pilot/consent/accept`, stores token/session id in `sessionStorage`, and links to the scenario page.

- [ ] **Step 2: Create scenario page**

Provide controls for the five synthetic scenarios. Each submission must construct an explicit JSON object from fixed category values only, not serialise arbitrary form fields.

Use fictional UI labels only, such as `Mock Bank`, `Example Payee Check`, and `Synthetic Finance Agent`. Do not use real bank names, logos, color systems, or branding in public demo pages.

- [ ] **Step 3: Create report page**

Fetch `/api/banking-pilot/:sessionId/report`, `/audit`, and `/verify` using the bearer token from `sessionStorage`.

- [ ] **Step 4: Run static syntax/format check**

Run:

```bash
npx prettier --check public/banking-pilot-consent.html public/banking-pilot-scenario.html public/banking-pilot-report.html
```

Expected: pass after formatting.

---

### Task 5: Phase A Docs And Roadmap

**Files:**

- Create: `docs/research/banking-pilot/BANKING_PILOT_PROTOCOL.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_THREAT_MODEL.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_DATA_MANAGEMENT.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_PARTICIPANT_NOTICE.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_NON_CLAIMS.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_PHASE_A_CLOSEOUT.md`
- Create: `docs/research/banking-pilot/BANKING_PILOT_CLAIM_AUDIT.md`
- Create: `docs/research/banking-pilot/evidence/phase-a-synthetic/README.md`

- [ ] **Step 1: Write protocol**

Include study purpose, Phase A scope, synthetic-only status, scenario descriptions, data collected, data never collected, consent flow, withdrawal flow, report flow, closure flow, non-claims, and Phase B/C roadmap.

- [ ] **Step 2: Write threat model**

Cover curious operator, malicious tester, tampering client, replay attacker, Sonnet prompt-injection attempt, overclaiming researcher, and reviewer adversary. Map each to controls.

- [ ] **Step 3: Write data management and participant notice**

State Phase A synthetic data only, in-memory store, aggregate evidence retention, no individual financial data, and no human participants yet.

- [ ] **Step 4: Write non-claims**

Explicitly deny fraud detection, real banking security, payment processing, CDR compliance, CoP implementation, APRA compliance, financial advice, scam reimbursement assessment, and malware detection.

- [ ] **Step 5: Write closeout and claim audit**

Pre-fill the documents with Phase A acceptance criteria and evidence index; update final command outputs after verification.

---

### Task 6: Smoke, Security, And Privacy Scripts

**Files:**

- Create: `scripts/smoke-banking-pilot.sh`
- Create: `scripts/smoke-banking-pilot-closed.sh`
- Create: `scripts/security-audit-banking-pilot.sh`
- Create: `scripts/privacy-audit-banking-pilot.mjs`
- Modify: `scripts/check.sh`

- [ ] **Step 1: Write smoke script**

Gates:

1. Consent page loads.
2. Consent accept returns `bp_` session id and token.
3. Mock CDR scenario submits.
4. Mock CoP scenario submits.
5. Remote-access warning submits.
6. Payment pause submits.
7. AI-agent finance approval submits.
8. Forbidden field rejected.
9. Report exports all privacy assertions as `false`.
10. Audit chain verifies.
11. Withdrawn report returns 403.
12. Local Sonnet sanitisation fixture contains metadata only.

The script must create a fresh session for each valid scenario because one session may submit exactly one scenario.

- [ ] **Step 2: Write closure smoke script**

Start a dedicated server with `SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true` on a separate port. Assert consent, submit, and withdraw return `410` without auth.

- [ ] **Step 3: Write security audit script**

Attack with forbidden fields including `account_number`, nested `otp`, array-contained `card_number`, `transaction_amount`, `payee_name`, `payment_reference`, `window_title`, `process_name`, and `remote_app_name`. Assert 400 and no submitted values in responses.

Also assert:

- `__proto__`, `prototype`, and `constructor` return `400 invalid_payload_key`.
- Unknown `scenario_type: "real_payment"` returns `400 invalid_scenario_type`.
- Weak consent hashes such as `sha256:abc` are rejected.
- `financial_payload_recorded_by_simurgh` rejects `true`, `"false"`, and missing values.

- [ ] **Step 4: Write privacy audit script**

Scan generated Phase A evidence/report/audit/Sonnet fixture JSON. Permit forbidden field names in guard modules, docs, tests, and scripts. Fail on forbidden payload structures or known sensitive values in generated artifacts.

Generate and scan:

- `accepted-report-fixture.json`
- `rejected-attempt-audit-fixture.json`
- `sonnet-sanitised-payload-fixture.json`
- `closure-response-fixture.json`

Fail if generated evidence contains known attack values:

- `111111`
- `123456`
- `4111111111111111`
- `VerySecretOtp`
- `MockSensitivePayee`

Add a static public-page branding check:

- Public demo pages may use fictional labels such as `Mock Bank`, `Example Payee Check`, and `Synthetic Finance Agent`.
- Public demo pages must not include real bank names or logos.
- Docs may mention real institutions only in cited research or regulatory context.

- [ ] **Step 5: Wire scripts into `scripts/check.sh`**

Add targeted gates after the voting pilot gates so the full repo check covers Banking Shield Phase A.

---

### Task 7: Evidence Pack Generation

**Files:**

- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/npm-test.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/npm-audit.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/privacy-audit-banking-pilot.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/smoke-banking-pilot.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/security-audit-banking-pilot.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/sonnet-sanitisation-audit.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/smoke-banking-pilot-closed.txt`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/accepted-report-fixture.json`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/rejected-attempt-audit-fixture.json`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/sonnet-sanitised-payload-fixture.json`
- Generate: `docs/research/banking-pilot/evidence/phase-a-synthetic/closure-response-fixture.json`

- [ ] **Step 1: Capture unit test evidence**

Run:

```bash
npm test > docs/research/banking-pilot/evidence/phase-a-synthetic/npm-test.txt 2>&1
```

- [ ] **Step 2: Capture npm audit evidence**

Run:

```bash
npm audit --audit-level=high > docs/research/banking-pilot/evidence/phase-a-synthetic/npm-audit.txt 2>&1
```

- [ ] **Step 3: Capture smoke/security/privacy evidence**

Run each new script and redirect output to its matching evidence file.

- [ ] **Step 4: Generate fixture evidence**

Generate one accepted report fixture, one rejected-attempt audit fixture, one Sonnet sanitised payload fixture, and one closure response fixture. Re-run `node scripts/privacy-audit-banking-pilot.mjs` after fixture generation.

- [ ] **Step 5: Update closeout and claim audit**

Paste exact pass counts and command names into the Phase A closeout and claim audit docs.

---

### Task 8: Environment, Formatting, And Repo Logs

**Files:**

- Modify: `.env.example`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update `.env.example`**

Add:

```text
SIMURGH_BANKING_PILOT_PEPPER=change-me-banking-pilot-pepper
SIMURGH_BANKING_PILOT_TOKEN_SECRET=change-me-banking-pilot-token-secret
SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false
SIMURGH_BANKING_PILOT_ENABLE_NARRATIVE=false
```

- [ ] **Step 2: Format changed files**

Run:

```bash
npx prettier --write server.js src/bankingPilot tests/unit/bankingPilot tests/security/banking_pilot_security_audit.test.js tests/e2e/banking_pilot_smoke.mjs tests/e2e/banking_pilot_closed_smoke.mjs public/banking-pilot-consent.html public/banking-pilot-scenario.html public/banking-pilot-report.html docs/superpowers/specs/2026-06-11-banking-shield-phase-a-design.md docs/superpowers/plans/2026-06-11-banking-shield-phase-a.md docs/research/banking-pilot scripts/privacy-audit-banking-pilot.mjs
```

- [ ] **Step 3: Run verification**

Run:

```bash
npm test
npm audit --audit-level=high
bash scripts/smoke-banking-pilot.sh
bash scripts/security-audit-banking-pilot.sh
node scripts/privacy-audit-banking-pilot.mjs
bash scripts/smoke-banking-pilot-closed.sh
bash scripts/check.sh
```

- [ ] **Step 4: Append repo logs**

Update `AGENT.md` and `CHANGELOG.md` with date, scope, summary, changed files, verification, and follow-ups. Mention Phase A-only code and Phase B/C docs roadmap.

---

## Self-Review

Spec coverage:

- Phase A synthetic-only code is covered by Tasks 1-8.
- Phase B/C continuity is covered by Task 5 docs only.
- Closure-before-auth is covered by Tasks 3 and 6.
- Recursive forbidden-field rejection is covered by Tasks 1, 3, and 6.
- Token binding, body/depth limits, pollution-key rejection, and one-submit semantics are covered by Tasks 1, 3, and 6.
- Privacy audit correction is covered by Task 6.
- Meaningful generated fixtures, evidence pack, and repo logs are covered by Tasks 6, 7, and 8.

Placeholder scan:

- No task contains unresolved placeholder instructions.
- Phase B/C code is explicitly excluded.

Type consistency:

- Session ids use `bp_`.
- Public routes use `/api/banking-pilot`.
- Closure env var uses `SIMURGH_BANKING_PILOT_COLLECTION_CLOSED`.
- Banking tokens use `banking-pilot-token-v1`.
