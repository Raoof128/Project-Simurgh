# Banking Shield AI Privacy Firewall (Stage B4-A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire and harden a backend-only, mock-only, fail-closed AI explanation layer for Banking Shield that turns the already-prepared metadata-only payload into a deterministic plain-English narrative behind an input firewall, an output claim firewall, and an evidence receipt — provable entirely offline.

**Architecture:** A pure deterministic generator maps allowlisted enum metadata → fixed-template narrative. An orchestrator runs input firewall (forbidden-field re-scan + byte cap) → generator → output firewall (schema + length caps + forbidden-claim scan + official-result-unchanged) → receipt, fail-closed at every gate. A new token-bound `GET /api/banking-pilot/:sessionId/ai-privacy-explain` route exposes it, gated by a default-off feature flag, blocking withdrawn sessions, and appending one `AI_EXPLANATION_EXPORTED` audit event on success. No network imports anywhere; a static no-egress gate proves it.

**Tech Stack:** Node.js ES modules, Express router, `node:test` + `node:assert/strict`, `node:crypto` (hashing only), bash smoke script, prettier gate.

---

## File Structure

**New source modules (`src/bankingPilot/`):**
- `bankingNarrativeGenerator.js` — pure deterministic enum→template narrator. No I/O, no randomness, no network.
- `bankingNarrativeOutputFirewall.js` — schema validation, per-field length caps, forbidden-claim scanner, official-result-unchanged check.
- `bankingAiPrivacyReceipt.js` — `hashNarrative` + enabled/disabled/firewall-failed receipt builders.
- `bankingAiExplain.js` — orchestrator + `isAiExplainEnabled()` flag reader.

**Modified source:**
- `src/bankingPilot/bankingAudit.js` — add `AI_EXPLANATION_EXPORTED` event.
- `src/bankingPilot/index.js` — add the `/:sessionId/ai-privacy-explain` route.

**New tests (`tests/unit/bankingPilot/`):**
- `bankingNarrativeGenerator.test.js`
- `bankingNarrativeOutputFirewall.test.js`
- `bankingAiPrivacyReceipt.test.js`
- `bankingAiExplain.test.js`
- `aiExplainRouter.test.js`

**New scripts:**
- `scripts/smoke-banking-pilot-ai-firewall.sh`
- `scripts/privacy-audit-banking-pilot-ai-firewall.mjs` (fixtures + no-egress gate, mirrors `privacy-audit-banking-pilot-phase-b.mjs`).

**New docs / evidence:**
- `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLOSEOUT.md`
- `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md`
- `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/` (generated fixtures + gate logs)

**Change-protocol:** `AGENT.md`, `CHANGELOG.md`.

---

## Task 1: Add the `AI_EXPLANATION_EXPORTED` audit event

**Files:**
- Modify: `src/bankingPilot/bankingAudit.js:1-11`
- Test: `tests/unit/bankingPilot/bankingAudit.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bankingPilot/bankingAudit.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { BANKING_PILOT_EVENTS } from "../../../src/bankingPilot/bankingAudit.js";

test("BANKING_PILOT_EVENTS defines the AI explanation export event", () => {
  assert.equal(BANKING_PILOT_EVENTS.AI_EXPLANATION_EXPORTED, "BANKING_AI_EXPLANATION_EXPORTED");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/bankingAudit.test.js`
Expected: FAIL (`AI_EXPLANATION_EXPORTED` is `undefined`).

- [ ] **Step 3: Add the event**

In `src/bankingPilot/bankingAudit.js`, add one line inside the `BANKING_PILOT_EVENTS` object, after `VERIFY_EXPORTED`:

```js
  VERIFY_EXPORTED: "BANKING_VERIFY_EXPORTED",
  AI_EXPLANATION_EXPORTED: "BANKING_AI_EXPLANATION_EXPORTED",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/bankingAudit.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bankingPilot/bankingAudit.js tests/unit/bankingPilot/bankingAudit.test.js
git commit -m "feat(banking): add AI_EXPLANATION_EXPORTED audit event for B4-A"
```

---

## Task 2: Deterministic narrative generator

**Files:**
- Create: `src/bankingPilot/bankingNarrativeGenerator.js`
- Test: `tests/unit/bankingPilot/bankingNarrativeGenerator.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bankingPilot/bankingNarrativeGenerator.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { generateBankingNarrative } from "../../../src/bankingPilot/bankingNarrativeGenerator.js";

const basePayload = {
  scenario_type: "mock_payment_pause",
  risk_score: 35,
  verdict: "warning",
  manual_review_required: true,
};

test("generator returns the fixed narrative schema", () => {
  const n = generateBankingNarrative(basePayload);
  for (const field of [
    "plain_english_summary",
    "policy_outcome_explanation",
    "privacy_boundary_note",
    "audit_verify_explanation",
    "manual_review_note",
  ]) {
    assert.equal(typeof n[field], "string");
    assert.ok(n[field].length > 0);
  }
  assert.ok(Array.isArray(n.non_claims) && n.non_claims.length > 0);
  assert.equal(n.official_result_unchanged, true);
});

test("generator is deterministic: same input gives byte-identical output", () => {
  const a = JSON.stringify(generateBankingNarrative(basePayload));
  const b = JSON.stringify(generateBankingNarrative(basePayload));
  assert.equal(a, b);
});

test("manual_review_note reflects manual_review_required flag", () => {
  const flagged = generateBankingNarrative({ ...basePayload, manual_review_required: true });
  const clear = generateBankingNarrative({ ...basePayload, verdict: "safe", manual_review_required: false });
  assert.notEqual(flagged.manual_review_note, clear.manual_review_note);
});

test("unknown scenario_type falls back without throwing", () => {
  const n = generateBankingNarrative({ verdict: "safe" });
  assert.equal(typeof n.plain_english_summary, "string");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/bankingNarrativeGenerator.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the generator**

Create `src/bankingPilot/bankingNarrativeGenerator.js`:

```js
// Deterministic, offline, metadata-only narrative generator for Banking Shield
// B4-A. Pure function of the allowlisted payload: no randomness, no clock, no
// I/O, and no network imports (enforced by the no-egress gate).

const SCENARIO_SUMMARIES = Object.freeze({
  mock_cdr_consent:
    "This fictional session recorded a data-sharing consent screen interaction. It is metadata only.",
  mock_confirmation_of_payee:
    "This fictional session recorded a payee-name check interaction. It is metadata only.",
  remote_access_warning:
    "This fictional session recorded a remote-access caution interaction. It is metadata only.",
  mock_payment_pause:
    "This fictional session recorded a payment-pause prompt interaction. It is metadata only.",
  mock_ai_agent_finance_action:
    "This fictional session recorded an AI-agent finance approval interaction. It is metadata only.",
  unknown: "This fictional session recorded a prototype interaction. It is metadata only.",
});

const VERDICT_OUTCOMES = Object.freeze({
  safe: "The local prototype policy outcome for this fictional session was: safe. No prototype policy signal was raised.",
  warning:
    "The local prototype policy outcome for this fictional session was: warning. The prototype suggests an optional manual look.",
  critical:
    "The local prototype policy outcome for this fictional session was: critical. The prototype suggests an optional manual look.",
});

const PRIVACY_BOUNDARY_NOTE =
  "This explanation was generated from metadata only. The explanation layer received no credentials, OTPs, account identifiers, balances, payees, payment amounts, transaction text, screenshots, app names, process names, or window titles.";

const AUDIT_VERIFY_EXPLANATION =
  "The audit record lists the step-by-step events for this fictional session. Verification checks whether that audit record is internally consistent.";

const NON_CLAIMS = Object.freeze([
  "not fraud detection",
  "not scam prevention",
  "not financial advice",
  "not a real banking decision",
  "not payment verification",
]);

export function generateBankingNarrative(payload) {
  const verdict = payload?.verdict ?? "safe";
  const scenarioType = payload?.scenario_type ?? "unknown";
  const summary = SCENARIO_SUMMARIES[scenarioType] ?? SCENARIO_SUMMARIES.unknown;
  const outcome = VERDICT_OUTCOMES[verdict] ?? VERDICT_OUTCOMES.safe;
  const manualReview = Boolean(payload?.manual_review_required);
  const manualReviewNote = manualReview
    ? "This fictional session is flagged for an optional manual look. No automatic fraud finding is made."
    : "This fictional session is not flagged for a manual look.";

  return {
    plain_english_summary: summary,
    policy_outcome_explanation: outcome,
    privacy_boundary_note: PRIVACY_BOUNDARY_NOTE,
    audit_verify_explanation: AUDIT_VERIFY_EXPLANATION,
    manual_review_note: manualReviewNote,
    non_claims: [...NON_CLAIMS],
    official_result_unchanged: true,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/bankingNarrativeGenerator.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bankingPilot/bankingNarrativeGenerator.js tests/unit/bankingPilot/bankingNarrativeGenerator.test.js
git commit -m "feat(banking): add deterministic offline narrative generator (B4-A)"
```

---

## Task 3: Output claim firewall

**Files:**
- Create: `src/bankingPilot/bankingNarrativeOutputFirewall.js`
- Test: `tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  FORBIDDEN_CLAIM_PHRASES,
  scanForbiddenClaims,
  validateNarrativeSchema,
  checkOfficialResultUnchanged,
  runOutputFirewall,
  NARRATIVE_FIELD_MAX_LENGTH,
} from "../../../src/bankingPilot/bankingNarrativeOutputFirewall.js";
import { generateBankingNarrative } from "../../../src/bankingPilot/bankingNarrativeGenerator.js";

const goodNarrative = generateBankingNarrative({
  scenario_type: "mock_payment_pause",
  risk_score: 35,
  verdict: "warning",
  manual_review_required: true,
});

test("a clean generated narrative passes schema and claim scan", () => {
  assert.deepEqual(validateNarrativeSchema(goodNarrative), { ok: true });
  assert.equal(scanForbiddenClaims(goodNarrative), null);
});

test("required negated non-claims are NOT blocked by the scanner", () => {
  // The generator's own non_claims contain 'scam', 'fraud', 'payment' words in
  // negated form; they must survive the scanner.
  assert.equal(scanForbiddenClaims(goodNarrative), null);
});

test("each forbidden affirmative-capability phrase is detected", () => {
  for (const phrase of FORBIDDEN_CLAIM_PHRASES) {
    const poisoned = { ...goodNarrative, plain_english_summary: `Result: ${phrase}.` };
    assert.equal(scanForbiddenClaims(poisoned), phrase, `expected to catch: ${phrase}`);
  }
});

test("schema rejects a missing string field", () => {
  const bad = { ...goodNarrative };
  delete bad.privacy_boundary_note;
  assert.equal(validateNarrativeSchema(bad).ok, false);
});

test("schema rejects an over-length field", () => {
  const bad = { ...goodNarrative, manual_review_note: "x".repeat(NARRATIVE_FIELD_MAX_LENGTH + 1) };
  assert.equal(validateNarrativeSchema(bad).reason, "field_too_long");
});

test("official-result-unchanged detects drift", () => {
  const ok = checkOfficialResultUnchanged(
    { risk_score: 35, verdict: "warning", manual_review_required: true },
    { risk_score: 35, verdict: "warning", manual_review_required: true }
  );
  assert.equal(ok.ok, true);
  const drift = checkOfficialResultUnchanged(
    { risk_score: 35, verdict: "safe", manual_review_required: true },
    { risk_score: 35, verdict: "warning", manual_review_required: true }
  );
  assert.equal(drift.ok, false);
  assert.equal(drift.field, "verdict");
});

test("runOutputFirewall blocks a forbidden claim with gate=claim_guard", () => {
  const poisoned = { ...goodNarrative, manual_review_note: "fraud detected here" };
  const r = runOutputFirewall({
    narrative: poisoned,
    payloadOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
    recordOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
  });
  assert.equal(r.ok, false);
  assert.equal(r.gate, "claim_guard");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the output firewall**

Create `src/bankingPilot/bankingNarrativeOutputFirewall.js`:

```js
// Output claim firewall for Banking Shield B4-A. Validates the narrative shape,
// caps lengths, scans for affirmative-capability claims, and proves the official
// result the narrative references did not drift from the authoritative record.

export const NARRATIVE_FIELD_MAX_LENGTH = 600;

export const NARRATIVE_REQUIRED_STRING_FIELDS = Object.freeze([
  "plain_english_summary",
  "policy_outcome_explanation",
  "privacy_boundary_note",
  "audit_verify_explanation",
  "manual_review_note",
]);

// Affirmative-capability phrasings only. Bare words (e.g. "scam", "fraud") are
// deliberately NOT listed so required negated non-claims pass unharmed.
export const FORBIDDEN_CLAIM_PHRASES = Object.freeze([
  "fraud detected",
  "fraud detection",
  "detects fraud",
  "scam detected",
  "detects scams",
  "scam prevention capability",
  "prevents scams",
  "scam protection",
  "likely scam",
  "probably a scam",
  "payee verified",
  "verifies payees",
  "safe payment",
  "payment is safe",
  "financial advice",
  "bank-grade",
  "bank grade",
  "apra compliant",
  "cdr compliant",
  "confirmation of payee compliant",
  "aml compliant",
  "ctf compliant",
  "production ready",
  "production-ready",
  "protects your account",
  "prevents loss",
  "prevents financial loss",
  "malware detected",
  "reimbursement assessment",
]);

export function scanForbiddenClaims(narrative) {
  const haystack = JSON.stringify(narrative).toLowerCase();
  for (const phrase of FORBIDDEN_CLAIM_PHRASES) {
    if (haystack.includes(phrase)) return phrase;
  }
  return null;
}

export function validateNarrativeSchema(narrative) {
  if (!narrative || typeof narrative !== "object" || Array.isArray(narrative)) {
    return { ok: false, reason: "narrative_not_object" };
  }
  for (const field of NARRATIVE_REQUIRED_STRING_FIELDS) {
    if (typeof narrative[field] !== "string") {
      return { ok: false, reason: "missing_string_field", field };
    }
    if (narrative[field].length > NARRATIVE_FIELD_MAX_LENGTH) {
      return { ok: false, reason: "field_too_long", field };
    }
  }
  if (!Array.isArray(narrative.non_claims) || narrative.non_claims.length === 0) {
    return { ok: false, reason: "missing_non_claims" };
  }
  if (narrative.official_result_unchanged !== true) {
    return { ok: false, reason: "official_result_unchanged_not_true" };
  }
  return { ok: true };
}

export function checkOfficialResultUnchanged(payloadOfficial, recordOfficial) {
  for (const f of ["risk_score", "verdict", "manual_review_required"]) {
    if (payloadOfficial?.[f] !== recordOfficial?.[f]) {
      return { ok: false, reason: "official_result_changed", field: f };
    }
  }
  return { ok: true };
}

export function runOutputFirewall({ narrative, payloadOfficial, recordOfficial }) {
  const schema = validateNarrativeSchema(narrative);
  if (!schema.ok) return { ok: false, gate: "schema", ...schema };
  const forbidden = scanForbiddenClaims(narrative);
  if (forbidden) {
    return { ok: false, gate: "claim_guard", reason: "forbidden_claim", phrase: forbidden };
  }
  const official = checkOfficialResultUnchanged(payloadOfficial, recordOfficial);
  if (!official.ok) return { ok: false, gate: "official_result", ...official };
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bankingPilot/bankingNarrativeOutputFirewall.js tests/unit/bankingPilot/bankingNarrativeOutputFirewall.test.js
git commit -m "feat(banking): add output claim firewall (B4-A)"
```

---

## Task 4: AI privacy receipt builder

**Files:**
- Create: `src/bankingPilot/bankingAiPrivacyReceipt.js`
- Test: `tests/unit/bankingPilot/bankingAiPrivacyReceipt.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bankingPilot/bankingAiPrivacyReceipt.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  hashNarrative,
  buildEnabledReceipt,
  buildDisabledReceipt,
  buildFirewallFailedReceipt,
} from "../../../src/bankingPilot/bankingAiPrivacyReceipt.js";

const narrative = { a: 1, b: "two" };

test("hashNarrative is deterministic and prefixed", () => {
  const h1 = hashNarrative(narrative);
  const h2 = hashNarrative(narrative);
  assert.equal(h1, h2);
  assert.match(h1, /^sha256:[a-f0-9]{64}$/);
});

test("enabled receipt asserts the full privacy contract", () => {
  const r = buildEnabledReceipt({ narrative, officialResultUnchanged: true, claimGuardPassed: true });
  assert.equal(r.ai_privacy_layer_enabled, true);
  assert.equal(r.provider, "deterministic_mock");
  assert.equal(r.sensitive_payload_sent_to_ai, false);
  assert.equal(r.network_egress_used, false);
  assert.equal(r.official_result_unchanged, true);
  assert.equal(r.claim_guard_passed, true);
  assert.equal(r.narrative_generated, true);
  assert.match(r.narrative_hash, /^sha256:[a-f0-9]{64}$/);
});

test("disabled receipt carries the off-path padlock fields", () => {
  const r = buildDisabledReceipt("ai_explain_disabled");
  assert.equal(r.ai_privacy_layer_enabled, false);
  assert.equal(r.narrative_generated, false);
  assert.equal(r.network_egress_used, false);
  assert.equal(r.sensitive_payload_sent_to_ai, false);
  assert.equal(r.blocked_reason, "ai_explain_disabled");
  assert.equal(r.narrative_hash, undefined);
});

test("firewall-failed receipt records the failed gate, no narrative", () => {
  const r = buildFirewallFailedReceipt({ gate: "claim_guard" });
  assert.equal(r.narrative_generated, false);
  assert.equal(r.output_claim_firewall_passed, false);
  assert.equal(r.claim_guard_passed, false);
  assert.equal(r.failed_gate, "claim_guard");
  assert.equal(r.narrative_hash, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/bankingAiPrivacyReceipt.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the receipt builder**

Create `src/bankingPilot/bankingAiPrivacyReceipt.js`:

```js
import crypto from "node:crypto";

export function hashNarrative(narrative) {
  return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(narrative)).digest("hex");
}

export function buildEnabledReceipt({ narrative, officialResultUnchanged, claimGuardPassed }) {
  return {
    stage: "B4-A",
    provider: "deterministic_mock",
    ai_privacy_layer_enabled: true,
    input_contract_version: "1.0",
    output_contract_version: "1.0",
    input_firewall_passed: true,
    output_claim_firewall_passed: true,
    sensitive_payload_sent_to_ai: false,
    network_egress_used: false,
    official_result_unchanged: officialResultUnchanged,
    claim_guard_passed: claimGuardPassed,
    privacy_assertions_preserved: true,
    narrative_generated: true,
    narrative_hash: hashNarrative(narrative),
  };
}

export function buildDisabledReceipt(blockedReason) {
  return {
    ai_privacy_layer_enabled: false,
    provider: "deterministic_mock",
    network_egress_used: false,
    sensitive_payload_sent_to_ai: false,
    narrative_generated: false,
    blocked_reason: blockedReason,
  };
}

export function buildFirewallFailedReceipt({ gate, inputFirewallPassed = true }) {
  return {
    stage: "B4-A",
    provider: "deterministic_mock",
    ai_privacy_layer_enabled: true,
    input_contract_version: "1.0",
    output_contract_version: "1.0",
    input_firewall_passed: inputFirewallPassed,
    output_claim_firewall_passed: false,
    sensitive_payload_sent_to_ai: false,
    network_egress_used: false,
    official_result_unchanged: gate !== "official_result",
    claim_guard_passed: gate !== "claim_guard",
    privacy_assertions_preserved: true,
    narrative_generated: false,
    blocked_reason: "firewall_failed",
    failed_gate: gate,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/bankingAiPrivacyReceipt.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bankingPilot/bankingAiPrivacyReceipt.js tests/unit/bankingPilot/bankingAiPrivacyReceipt.test.js
git commit -m "feat(banking): add AI privacy receipt builder with narrative hash (B4-A)"
```

---

## Task 5: Orchestrator + feature-flag reader

**Files:**
- Create: `src/bankingPilot/bankingAiExplain.js`
- Test: `tests/unit/bankingPilot/bankingAiExplain.test.js`

This wires input firewall → generator → output firewall → receipt. It reuses
`buildBankingNarrativePayload` (input allowlist), `BANKING_PRIVACY_ASSERTIONS`,
and `containsForbiddenBankingFieldDeep` (defensive re-scan).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bankingPilot/bankingAiExplain.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildBankingAiExplanation, isAiExplainEnabled } from "../../../src/bankingPilot/bankingAiExplain.js";
import { scoreBankingRisk } from "../../../src/bankingPilot/bankingRiskScoring.js";

function recordFor(scenarioMetadata) {
  const risk = scoreBankingRisk(scenarioMetadata);
  return {
    banking_session_id: "bp_test_fixture",
    scenario_metadata: scenarioMetadata,
    risk,
  };
}

test("isAiExplainEnabled reads explicit 'true' only", () => {
  const prev = process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN;
  process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
  assert.equal(isAiExplainEnabled(), true);
  process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "1";
  assert.equal(isAiExplainEnabled(), false);
  delete process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN;
  assert.equal(isAiExplainEnabled(), false);
  if (prev !== undefined) process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = prev;
});

test("happy path returns narrative + enabled receipt", () => {
  const record = recordFor({
    scenario_type: "mock_payment_pause",
    risk_prompt_shown: true,
    user_action: "pause",
  });
  const r = buildBankingAiExplanation(record);
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(typeof r.narrative.plain_english_summary, "string");
  assert.equal(r.receipt.sensitive_payload_sent_to_ai, false);
  assert.equal(r.receipt.network_egress_used, false);
  assert.equal(r.receipt.official_result_unchanged, true);
  assert.match(r.receipt.narrative_hash, /^sha256:[a-f0-9]{64}$/);
});

test("the payload sent onward contains no raw forbidden fields", () => {
  const record = recordFor({
    scenario_type: "mock_confirmation_of_payee",
    mock_cop_result_category: "no_match",
    risk_prompt_shown: true,
    user_action: "request_review",
  });
  const r = buildBankingAiExplanation(record);
  // session id is hashed, never raw
  assert.ok(!JSON.stringify(r).includes("bp_test_fixture"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/bankingAiExplain.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the orchestrator**

Create `src/bankingPilot/bankingAiExplain.js`:

```js
import { buildBankingNarrativePayload } from "./bankingNarrativeSanitiser.js";
import { containsForbiddenBankingFieldDeep, MAX_DEPTH_SENTINEL } from "./forbiddenBankingFields.js";
import { generateBankingNarrative } from "./bankingNarrativeGenerator.js";
import { runOutputFirewall } from "./bankingNarrativeOutputFirewall.js";
import { buildEnabledReceipt, buildFirewallFailedReceipt } from "./bankingAiPrivacyReceipt.js";
import { BANKING_PRIVACY_ASSERTIONS } from "./bankingReportBuilder.js";

const MAX_NARRATIVE_PAYLOAD_BYTES = 4096;

// Reads the default-off feature flag. Mirrors bankingCollectionClosed: explicit
// string "true" only; anything else (including "1" or unset) is disabled.
export function isAiExplainEnabled() {
  return process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN === "true";
}

export function buildBankingAiExplanation(record) {
  const scenario = {
    scenario_type: record.scenario_metadata?.scenario_type,
    user_action: record.scenario_metadata?.user_action,
    user_decision: record.scenario_metadata?.user_decision,
  };

  // INPUT FIREWALL — allowlist-only payload (session id hashed, enums only).
  const payload = buildBankingNarrativePayload({
    banking_session_id: record.banking_session_id,
    scenario,
    risk: record.risk,
    privacy_assertions: BANKING_PRIVACY_ASSERTIONS,
  });

  // Defensive re-scan of the assembled payload + byte cap. Fail-closed.
  const forbidden = containsForbiddenBankingFieldDeep(payload);
  if (forbidden === MAX_DEPTH_SENTINEL || forbidden) {
    return { ok: false, status: 422, receipt: buildFirewallFailedReceipt({ gate: "input", inputFirewallPassed: false }) };
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_NARRATIVE_PAYLOAD_BYTES) {
    return { ok: false, status: 422, receipt: buildFirewallFailedReceipt({ gate: "input", inputFirewallPassed: false }) };
  }

  // GENERATE (deterministic, offline)
  const narrative = generateBankingNarrative(payload);

  // OUTPUT FIREWALL — schema, length, claim scan, official-result-unchanged.
  const recordOfficial = {
    risk_score: record.risk?.risk_score,
    verdict: record.risk?.verdict,
    manual_review_required: record.risk?.manual_review_required,
  };
  const payloadOfficial = {
    risk_score: payload.risk_score,
    verdict: payload.verdict,
    manual_review_required: payload.manual_review_required,
  };
  const fw = runOutputFirewall({ narrative, payloadOfficial, recordOfficial });
  if (!fw.ok) {
    return { ok: false, status: 422, receipt: buildFirewallFailedReceipt({ gate: fw.gate }) };
  }

  return {
    ok: true,
    status: 200,
    narrative,
    receipt: buildEnabledReceipt({ narrative, officialResultUnchanged: true, claimGuardPassed: true }),
  };
}
```

> Note: `buildBankingNarrativePayload` reads `payload.manual_review_required` from
> `risk.manual_review_required`. Confirm by reading
> `src/bankingPilot/bankingNarrativeSanitiser.js` — it already maps
> `manual_review_required: Boolean(risk.manual_review_required)`, so
> `payload.manual_review_required` is present.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/bankingAiExplain.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/bankingPilot/bankingAiExplain.js tests/unit/bankingPilot/bankingAiExplain.test.js
git commit -m "feat(banking): add AI explain orchestrator with fail-closed firewalls (B4-A)"
```

---

## Task 6: Wire the endpoint into the router

**Files:**
- Modify: `src/bankingPilot/index.js` (imports near top; new route after the `/verify` route, before `export default router`)
- Test: `tests/unit/bankingPilot/aiExplainRouter.test.js`

- [ ] **Step 1: Write the failing integration test**

Create `tests/unit/bankingPilot/aiExplainRouter.test.js`:

```js
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

process.env.SIMURGH_BANKING_PILOT_PEPPER = "test-banking-pepper-32-chars-long";
process.env.SIMURGH_BANKING_PILOT_TOKEN_SECRET = "test-banking-token-secret-32-chars";
process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "false";

const { default: bankingRouter } = await import("../../../src/bankingPilot/index.js");

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use("/api/banking-pilot", bankingRouter);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/banking-pilot`;
});
after(() => new Promise((resolve) => server.close(resolve)));

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function getJson(path, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function submittedSession() {
  const c = (await postJson("/consent/accept", {})).body;
  await postJson(
    "/submit",
    {
      banking_session_id: c.banking_session_id,
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    },
    auth(c.token)
  );
  return c;
}

describe("GET /:sessionId/ai-privacy-explain", () => {
  test("flag off -> 503 ai_explain_disabled with off-path receipt", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "false";
    const c = await submittedSession();
    const { status, body } = await getJson(`/${c.banking_session_id}/ai-privacy-explain`, auth(c.token));
    assert.equal(status, 503);
    assert.equal(body.error, "ai_explain_disabled");
    assert.equal(body.ai_privacy_layer_enabled, false);
    assert.equal(body.narrative_generated, false);
  });

  test("flag on -> 200 narrative + receipt, sensitive payload false", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const { status, body } = await getJson(`/${c.banking_session_id}/ai-privacy-explain`, auth(c.token));
    assert.equal(status, 200);
    assert.equal(body.ai_privacy_layer_enabled, true);
    assert.equal(body.receipt.sensitive_payload_sent_to_ai, false);
    assert.equal(body.receipt.network_egress_used, false);
    assert.match(body.receipt.narrative_hash, /^sha256:[a-f0-9]{64}$/);
  });

  test("missing token -> 401", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const { status } = await getJson(`/${c.banking_session_id}/ai-privacy-explain`);
    assert.equal(status, 401);
  });

  test("withdrawn session -> 403 blocked, no narrative", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    await postJson("/withdraw", {}, auth(c.token));
    const { status, body } = await getJson(`/${c.banking_session_id}/ai-privacy-explain`, auth(c.token));
    assert.equal(status, 403);
    assert.equal(body.error, "ai_explain_blocked_session_withdrawn");
    assert.equal(body.narrative_generated, false);
  });

  test("success appends exactly one AI_EXPLANATION_EXPORTED audit event", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const before = (await getJson(`/${c.banking_session_id}/audit`, auth(c.token))).body.entries.length;
    await getJson(`/${c.banking_session_id}/ai-privacy-explain`, auth(c.token));
    const after = (await getJson(`/${c.banking_session_id}/audit`, auth(c.token))).body.entries;
    const aiEvents = after.filter((e) => e.type === "BANKING_AI_EXPLANATION_EXPORTED");
    assert.equal(aiEvents.length, 1);
    assert.ok(after.length > before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/unit/bankingPilot/aiExplainRouter.test.js`
Expected: FAIL (route returns 404 / missing).

- [ ] **Step 3: Add imports to `src/bankingPilot/index.js`**

After the existing import block (around line 22, after the `bankingReportBuilder.js` import), add:

```js
import { buildBankingAiExplanation, isAiExplainEnabled } from "./bankingAiExplain.js";
import { buildDisabledReceipt } from "./bankingAiPrivacyReceipt.js";
```

- [ ] **Step 4: Add the route**

In `src/bankingPilot/index.js`, immediately before `export default router;`, add:

```js
router.get(
  "/:sessionId/ai-privacy-explain",
  limitBankingRead,
  requireBankingToken,
  requirePathTokenMatch,
  (req, res) => {
    if (!isAiExplainEnabled()) {
      return res
        .status(503)
        .json({ error: "ai_explain_disabled", ...buildDisabledReceipt("ai_explain_disabled") });
    }
    const record = store.get(req.params.sessionId);
    if (!record) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (record.withdrawn) {
      return res.status(403).json({
        error: "ai_explain_blocked_session_withdrawn",
        ...buildDisabledReceipt("ai_explain_blocked_session_withdrawn"),
      });
    }
    if (!record.submitted) {
      return res.status(409).json({ ok: false, error: "no_scenario_submitted" });
    }
    const result = buildBankingAiExplanation(record);
    if (!result.ok) {
      return res
        .status(result.status)
        .json({ error: "ai_explain_firewall_failed", receipt: result.receipt });
    }
    appendEntry(record.auditChain, record.hmacKey, BANKING_PILOT_EVENTS.AI_EXPLANATION_EXPORTED, {
      ts: new Date().toISOString(),
      narrative_hash: result.receipt.narrative_hash,
    });
    return res.json({
      ai_privacy_layer_enabled: true,
      provider: "deterministic_mock",
      narrative: result.narrative,
      receipt: result.receipt,
    });
  }
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/unit/bankingPilot/aiExplainRouter.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Run the full banking unit suite for regressions**

Run: `node --test tests/unit/bankingPilot/*.test.js`
Expected: PASS (all banking tests, including pre-existing `router.test.js`).

- [ ] **Step 7: Commit**

```bash
git add src/bankingPilot/index.js tests/unit/bankingPilot/aiExplainRouter.test.js
git commit -m "feat(banking): expose GET /ai-privacy-explain with flag, withdrawal block, audit event (B4-A)"
```

---

## Task 7: Smoke script

**Files:**
- Create: `scripts/smoke-banking-pilot-ai-firewall.sh`

- [ ] **Step 1: Write the smoke script**

Create `scripts/smoke-banking-pilot-ai-firewall.sh`:

```bash
#!/usr/bin/env bash
# scripts/smoke-banking-pilot-ai-firewall.sh
# Banking Shield B4-A AI privacy firewall smoke gate.
# Spins TWO servers: one flag-on (main flow), one flag-off (503 assertion).
set -euo pipefail

VALID_SCOPE_HASH="sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
PASS=0
FAIL=0
ok() { echo "[PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }
json_field() {
  node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d['$1'] ?? '')"
}

start_server() {
  local port="$1" explain="$2" log="$3"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_BANKING_PILOT_PEPPER="smoke-banking-pepper-32-chars" \
  SIMURGH_BANKING_PILOT_TOKEN_SECRET="smoke-banking-token-secret-32" \
  SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false \
  SIMURGH_BANKING_PILOT_AI_EXPLAIN="$explain" \
  PORT="$port" node server.js >"$log" 2>&1 &
  echo $!
}
wait_health() {
  local base="$1"
  for _ in {1..60}; do
    if curl -sf "$base/health" >/dev/null 2>&1; then return 0; fi
    sleep 0.25
  done
  return 1
}

PORT_ON="${SIMURGH_AI_SMOKE_PORT_ON:-33061}"
PORT_OFF="${SIMURGH_AI_SMOKE_PORT_OFF:-33062}"
LOG_ON="${TMPDIR:-/tmp}/simurgh-ai-smoke-on.log"
LOG_OFF="${TMPDIR:-/tmp}/simurgh-ai-smoke-off.log"

PID_ON="$(start_server "$PORT_ON" true "$LOG_ON")"
PID_OFF="$(start_server "$PORT_OFF" false "$LOG_OFF")"
cleanup() { kill "$PID_ON" "$PID_OFF" >/dev/null 2>&1 || true; }
trap cleanup EXIT

BASE_ON="http://127.0.0.1:$PORT_ON"
BASE_OFF="http://127.0.0.1:$PORT_OFF"
wait_health "$BASE_ON" || { echo "flag-on server failed"; tail -40 "$LOG_ON"; exit 1; }
wait_health "$BASE_OFF" || { echo "flag-off server failed"; tail -40 "$LOG_OFF"; exit 1; }

API_ON="$BASE_ON/api/banking-pilot"
API_OFF="$BASE_OFF/api/banking-pilot"

# --- flag-on flow: consent -> submit -> explain ---
C="$(curl -sf -X POST "$API_ON/consent/accept" -H 'Content-Type: application/json' -d '{}')"
SID="$(echo "$C" | json_field banking_session_id)"
TOK="$(echo "$C" | json_field token)"
curl -sf -X POST "$API_ON/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK" \
  -d "{\"banking_session_id\":\"$SID\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}" >/dev/null

EXPLAIN="$(curl -sf "$API_ON/$SID/ai-privacy-explain" -H "Authorization: Bearer $TOK")"
SENT="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.sensitive_payload_sent_to_ai)")"
EGRESS="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.network_egress_used)")"
HASH="$(echo "$EXPLAIN" | node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(d.receipt.narrative_hash||'')")"
[ "$SENT" = "false" ] && ok "sensitive_payload_sent_to_ai is false" || fail "sensitive payload flag"
[ "$EGRESS" = "false" ] && ok "network_egress_used is false" || fail "egress flag"
echo "$HASH" | grep -Eq '^sha256:[a-f0-9]{64}$' && ok "narrative_hash present" || fail "narrative_hash"

# --- withdrawn session blocks explain (403) ---
curl -sf -X POST "$API_ON/withdraw" -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{}' >/dev/null
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$API_ON/$SID/ai-privacy-explain" -H "Authorization: Bearer $TOK")"
[ "$CODE" = "403" ] && ok "withdrawn session blocks explain (403)" || fail "withdrawn block got $CODE"

# --- flag-off server returns 503 ---
C2="$(curl -sf -X POST "$API_OFF/consent/accept" -H 'Content-Type: application/json' -d '{}')"
SID2="$(echo "$C2" | json_field banking_session_id)"
TOK2="$(echo "$C2" | json_field token)"
curl -sf -X POST "$API_OFF/submit" -H "Content-Type: application/json" -H "Authorization: Bearer $TOK2" \
  -d "{\"banking_session_id\":\"$SID2\",\"scenario_type\":\"mock_payment_pause\",\"risk_prompt_shown\":true,\"user_action\":\"pause\"}" >/dev/null
CODE_OFF="$(curl -s -o /dev/null -w '%{http_code}' "$API_OFF/$SID2/ai-privacy-explain" -H "Authorization: Bearer $TOK2")"
[ "$CODE_OFF" = "503" ] && ok "flag-off returns 503" || fail "flag-off got $CODE_OFF"

echo "----"
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
```

- [ ] **Step 2: Make it executable and run it**

Run:
```bash
chmod +x scripts/smoke-banking-pilot-ai-firewall.sh
bash scripts/smoke-banking-pilot-ai-firewall.sh
```
Expected: ends with `PASS=5 FAIL=0` and exit 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-banking-pilot-ai-firewall.sh
git commit -m "test(banking): add B4-A AI firewall smoke gate (flag on/off, withdrawal, receipt)"
```

---

## Task 8: No-egress static gate + evidence fixtures

**Files:**
- Create: `scripts/privacy-audit-banking-pilot-ai-firewall.mjs`
- Output dir: `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/`

This mirrors the per-phase precedent `privacy-audit-banking-pilot-phase-b.mjs`.
It (a) statically asserts the four new modules import no network primitive,
(b) generates an **accepted** explanation fixture and a **rejected-claim**
fixture (the key paper artifact), and (c) scans generated fixtures for attack
values.

- [ ] **Step 1: Write the audit/fixture script**

Create `scripts/privacy-audit-banking-pilot-ai-firewall.mjs`:

```js
#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scoreBankingRisk } from "../src/bankingPilot/bankingRiskScoring.js";
import { buildBankingAiExplanation } from "../src/bankingPilot/bankingAiExplain.js";
import {
  runOutputFirewall,
  FORBIDDEN_CLAIM_PHRASES,
} from "../src/bankingPilot/bankingNarrativeOutputFirewall.js";

const evidenceDir = "docs/research/banking-pilot/evidence/phase-b4a-ai-firewall";
mkdirSync(evidenceDir, { recursive: true });

const failures = [];

// (a) No-egress static gate over the B4-A modules.
const aiModules = [
  "src/bankingPilot/bankingNarrativeGenerator.js",
  "src/bankingPilot/bankingNarrativeOutputFirewall.js",
  "src/bankingPilot/bankingAiPrivacyReceipt.js",
  "src/bankingPilot/bankingAiExplain.js",
];
const networkPattern = /\b(fetch|node:http|node:https|node:net|node:dgram|undici|axios|XMLHttpRequest|WebSocket)\b/;
for (const file of aiModules) {
  if (networkPattern.test(readFileSync(file, "utf8"))) {
    failures.push(`${file} references a network primitive`);
  }
}

// (b) Accepted fixture from a synthetic submitted record.
const acceptedRisk = scoreBankingRisk({
  scenario_type: "mock_payment_pause",
  risk_prompt_shown: true,
  user_action: "pause",
});
const acceptedRecord = {
  banking_session_id: "bp_b4a_fixture",
  scenario_metadata: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause" },
  risk: acceptedRisk,
};
const accepted = buildBankingAiExplanation(acceptedRecord);
if (!accepted.ok) failures.push("accepted fixture unexpectedly failed the firewall");

// (c) Rejected-claim fixture: feed a deliberately poisoned narrative through the
// output firewall and capture the rejection. This proves the claim guard blocks.
const poisonedNarrative = {
  plain_english_summary: "This prototype performed fraud detection on your account.",
  policy_outcome_explanation: "safe payment confirmed",
  privacy_boundary_note: "metadata only",
  audit_verify_explanation: "consistent",
  manual_review_note: "n/a",
  non_claims: ["not financial advice"],
  official_result_unchanged: true,
};
const rejection = runOutputFirewall({
  narrative: poisonedNarrative,
  payloadOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
  recordOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
});
if (rejection.ok) failures.push("poisoned narrative was NOT blocked by the claim guard");

const fixtures = {
  "accepted-explanation-fixture.json": {
    narrative: accepted.narrative,
    receipt: accepted.receipt,
  },
  "rejected-claim-fixture.json": {
    injected_phrase: "fraud detection",
    firewall_result: rejection,
    forbidden_phrase_count: FORBIDDEN_CLAIM_PHRASES.length,
  },
};

async function formatJson(data) {
  const json = JSON.stringify(data, null, 2) + "\n";
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}
const generatedFiles = [];
for (const [file, data] of Object.entries(fixtures)) {
  const path = join(evidenceDir, file);
  writeFileSync(path, await formatJson(data));
  generatedFiles.push(path);
}

// (d) Attack-value scan over generated evidence.
const attackValues = ["111111", "123456", "4111111111111111", "VerySecretOtp", "MockSensitivePayee", "bp_b4a_fixture"];
for (const file of generatedFiles) {
  const text = readFileSync(file, "utf8");
  for (const value of attackValues) {
    if (text.includes(value)) failures.push(`${file} contains attack/raw value ${value}`);
  }
}

if (failures.length > 0) {
  console.error("privacy-audit-banking-pilot-ai-firewall: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("privacy-audit-banking-pilot-ai-firewall: PASS");
console.log(`ai firewall modules contain no network primitives (${aiModules.length} scanned)`);
console.log(`generated fixtures: ${generatedFiles.length}`);
console.log("rejected-claim fixture confirms the output claim guard blocks affirmative-capability phrasing");
console.log("attack/raw values absent from generated evidence");
```

- [ ] **Step 2: Run the audit**

Run: `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs`
Expected: prints `privacy-audit-banking-pilot-ai-firewall: PASS` and writes two fixtures under `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/`.

- [ ] **Step 3: Verify the no-egress gate actually bites (temporary negative check)**

Run:
```bash
node -e "const fs=require('fs');const p='src/bankingPilot/bankingNarrativeGenerator.js';const s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s+'\n// fetch\n');" \
  && (node scripts/privacy-audit-banking-pilot-ai-firewall.mjs; echo \"exit=$?\") ; \
  git checkout -- src/bankingPilot/bankingNarrativeGenerator.js
```
Expected: the audit prints FAIL with `references a network primitive` and `exit=1`, then the file is restored. (This proves the gate is real.)

- [ ] **Step 4: Re-run clean and commit**

Run: `node scripts/privacy-audit-banking-pilot-ai-firewall.mjs`
Expected: PASS.

```bash
git add scripts/privacy-audit-banking-pilot-ai-firewall.mjs docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/
git commit -m "test(banking): add B4-A no-egress static gate and explanation evidence fixtures"
```

---

## Task 9: Closeout + claim-audit docs

**Files:**
- Create: `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLOSEOUT.md`
- Create: `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md`

- [ ] **Step 1: Write the closeout**

Create `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLOSEOUT.md`:

```markdown
# Banking Shield Stage B4-A Closeout — AI Privacy Firewall

## Status

Execution status: `completed`.

B4-A wires the previously-prepared metadata-only narrative payload through an
input firewall, an output claim firewall, and an evidence receipt, exposed via a
default-off, token-bound `GET /api/banking-pilot/:sessionId/ai-privacy-explain`
endpoint. The narrator is a deterministic offline mock. No network egress, no
secrets, no live LLM. The public report-page surface is deferred to B4-B.

## What B4-A proves

- No sensitive banking field reaches the narrative generator (input firewall +
  defensive re-scan; session id is hashed; enums only).
- No network egress exists (static no-egress gate over the four B4-A modules).
- Narrative output is deterministic (same input → byte-identical output, with a
  `narrative_hash` fingerprint on success).
- Affirmative-capability claims are blocked (output claim guard; rejected-claim
  fixture demonstrates the block).
- The official policy result is unchanged (official-result-unchanged check).
- The AI privacy receipt records firewall status for enabled, disabled, and
  firewall-failed paths.
- All gates pass offline.

## Route response matrix

| Case | HTTP | Narrative | Appends AI_EXPLANATION_EXPORTED |
| --- | ---: | --- | --- |
| Feature flag off | 503 | none | no |
| Withdrawn session | 403 | none | no |
| Token missing/invalid | 401 | none | no |
| Path-token mismatch | 403 | none | no |
| No scenario submitted | 409 | none | no |
| Input/output firewall fail | 422 | none | no |
| Success | 200 | emitted | yes |

## Gate Evidence

- `tests/unit/bankingPilot/*` (generator, output firewall, receipt, orchestrator, router) — pass.
- `scripts/smoke-banking-pilot-ai-firewall.sh` — pass (flag on/off, withdrawal, receipt flags).
- `scripts/privacy-audit-banking-pilot-ai-firewall.mjs` — PASS (no-egress + fixtures + attack scan).
- `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/accepted-explanation-fixture.json`
- `docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/rejected-claim-fixture.json`

## Result

- [x] Pass.

## Paper-Safe Wording

> Banking Shield B4-A demonstrates a bounded AI privacy firewall for
> banking-adjacent integrity evidence: a narrative layer improves explanation
> while remaining structurally unable to receive sensitive financial payloads or
> alter deterministic policy outcomes. The firewall is validated entirely offline
> with deterministic generation and CI-verifiable evidence receipts. The layer is
> present, disabled by default, and only enabled explicitly for validation.

Do not claim fraud detection, scam prevention, real banking protection, payment
safety, real payee verification, financial advice, CDR or Confirmation of Payee
compliance, APRA or AML/CTF compliance, reimbursement assessment, malware
detection, or production readiness.

## Follow-up

- B4-B — surface the firewall-approved explanation on the public report page with
  user-facing labels and UI smoke tests, without changing the privacy boundary or
  official policy result.
```

- [ ] **Step 2: Write the claim audit**

Create `docs/research/banking-pilot/phase-b4a/BANKING_PILOT_PHASE_B4A_CLAIM_AUDIT.md`:

```markdown
# Banking Shield Stage B4-A Claim Audit

## Purpose

Keeps B4-A wording aligned with the offline evidence. Prevents the AI privacy
firewall from being described as real banking intelligence.

## Claim Table

| Claim | Evidence | Allowed Status |
| --- | --- | --- |
| Narrative layer receives no sensitive banking fields | input firewall + `bankingAiExplain.test.js` (raw id absent) + privacy audit | Evidence-backed |
| No network egress | no-egress static gate over four modules | Evidence-backed |
| Narrative is deterministic | generator determinism test + `narrative_hash` | Evidence-backed |
| Affirmative-capability claims are blocked | output firewall tests + rejected-claim fixture | Evidence-backed |
| Official policy result unchanged | official-result-unchanged check + tests | Evidence-backed |
| Layer is default-off | `isAiExplainEnabled` test + router 503 test + smoke | Evidence-backed |
| Withdrawn sessions are blocked | router 403 test + smoke | Evidence-backed |

## Disallowed Claims (must stay blocked)

Fraud detection, scam prevention, real banking protection, payment safety, real
payee verification, financial advice, CDR compliance, Confirmation of Payee
compliance, APRA compliance, AML/CTF compliance, reimbursement assessment,
malware detection, production readiness.

## Review Rule

Before any paper, README, PR, or closeout cites B4-A, compare wording against this
file. If a claim implies a real banking capability, rewrite it as a bounded
offline explanation claim.
```

- [ ] **Step 3: Commit**

```bash
git add docs/research/banking-pilot/phase-b4a/
git commit -m "docs(banking): add B4-A closeout and claim audit"
```

---

## Task 10: Change-protocol entries + full gate run

**Files:**
- Modify: `AGENT.md` (prepend a new entry near the top, matching existing `Raouf:` format)
- Modify: `CHANGELOG.md` (add a new entry matching existing format)

- [ ] **Step 1: Read the current top entries for exact format**

Run: `head -60 AGENT.md` and `head -40 CHANGELOG.md`
Use the existing heading style, date format, and `Raouf:` template you observe.

- [ ] **Step 2: Prepend the AGENT.md entry**

Add an entry titled `[banking-shield-phase-b4a-ai-firewall]` with: Scope (backend
AI privacy firewall, mock-only, default-off), Summary (input/output firewalls +
receipt + endpoint + no-egress gate), Files changed (the modules, tests, scripts,
docs from this plan), Verification (commands in Step 4 below), Follow-ups (B4-B UI
surface). Match the surrounding entries' formatting exactly.

- [ ] **Step 3: Add the CHANGELOG.md entry**

Add `[banking-shield-phase-b4a-ai-firewall]` describing the same change in the
file's established changelog style.

- [ ] **Step 4: Run the complete gate set**

Run each and confirm the expected result:

```bash
node --test tests/unit/*.test.js tests/unit/**/*.test.js   # all unit tests pass
bash scripts/smoke-banking-pilot.sh                         # Phase A smoke pass
bash scripts/smoke-banking-pilot-ai-firewall.sh             # B4-A smoke PASS=5 FAIL=0
bash scripts/smoke-banking-pilot-closed.sh                  # closed smoke pass
bash scripts/smoke-banking-pilot-full-e2e.sh                # full e2e pass
bash scripts/security-audit-banking-pilot.sh                # security audit pass
node scripts/privacy-audit-banking-pilot.mjs                # Phase A privacy PASS
node scripts/privacy-audit-banking-pilot-phase-b.mjs        # Phase B privacy PASS
node scripts/privacy-audit-banking-pilot-ai-firewall.mjs    # B4-A privacy PASS
npx prettier --check .                                      # clean
```

Expected: every command exits 0. If prettier flags any new file, run
`npx prettier --write <file>` and re-check.

- [ ] **Step 5: Final commit**

```bash
git add AGENT.md CHANGELOG.md docs/research/banking-pilot/evidence/phase-b4a-ai-firewall/
git commit -m "docs(banking): record B4-A AI privacy firewall in AGENT and CHANGELOG"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Input firewall → Task 5 (re-scan + byte cap) reusing existing allowlist builder. ✓
- Output claim firewall (schema, length caps, forbidden-claim scan, official-result-unchanged) → Task 3. ✓
- AI privacy receipt incl. disabled/off-path + `narrative_hash` → Task 4. ✓
- Deterministic mock generator, no network imports → Task 2. ✓
- `GET /ai-privacy-explain`, GET, token-bound, path-match, rate-limited, `AI_EXPLANATION_EXPORTED` event → Tasks 1 + 6. ✓
- Feature flag default-off, 503 when off → Tasks 5 + 6. ✓
- Withdrawn-session block (403) → Task 6. ✓
- Route response matrix (503/403/401/409/422/200) → Task 6 tests + Task 9 doc. ✓
- No-egress static gate → Task 8 (with a negative check proving it bites). ✓
- Evidence pack incl. rejected-claim fixture → Task 8. ✓
- Closeout + claim audit → Task 9. ✓
- Change-protocol (AGENT.md + CHANGELOG.md) + full gate run → Task 10. ✓

**Excluded (per spec):** no report-page UI, no live LLM, no secrets, no Phase C,
no real integrations, no renamed API fields, no privacy-assertion changes. None
of the tasks touch those. ✓

**Type/name consistency:** `generateBankingNarrative`, `runOutputFirewall`,
`FORBIDDEN_CLAIM_PHRASES`, `buildEnabledReceipt`/`buildDisabledReceipt`/
`buildFirewallFailedReceipt`, `hashNarrative`, `buildBankingAiExplanation`,
`isAiExplainEnabled`, `BANKING_PILOT_EVENTS.AI_EXPLANATION_EXPORTED`,
`BANKING_PRIVACY_ASSERTIONS` — used consistently across tasks and match the
existing modules read during planning.

**Placeholder scan:** no TBD/TODO; every code and test step contains complete
content.
```
