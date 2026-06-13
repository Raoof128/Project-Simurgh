// SPDX-License-Identifier: AGPL-3.0-or-later
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

test("negated phrases with one article/determiner are NOT blocked", () => {
  for (const wording of [
    "This is not a fraud detection tool.",
    "This prototype offers no scam protection.",
    "It is not an aml compliant product.",
    "This works without any payee verified guarantee.",
    "It never detects fraud.",
  ]) {
    const narrative = { ...goodNarrative, plain_english_summary: wording };
    assert.equal(scanForbiddenClaims(narrative), null, `expected negated pass: ${wording}`);
  }
});

test("affirmative phrases behind a bare article are still blocked", () => {
  for (const [wording, phrase] of [
    ["This performs a fraud detection sweep.", "fraud detection"],
    ["We provide the scam protection you need.", "scam protection"],
    ["It is not really a fraud detection tool.", "fraud detection"],
  ]) {
    const narrative = { ...goodNarrative, plain_english_summary: wording };
    assert.equal(scanForbiddenClaims(narrative), phrase, `expected to catch: ${wording}`);
  }
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
  const bad = {
    ...goodNarrative,
    manual_review_note: "x".repeat(NARRATIVE_FIELD_MAX_LENGTH + 1),
  };
  assert.equal(validateNarrativeSchema(bad).reason, "field_too_long");
});

test("schema rejects extra top-level narrative fields", () => {
  const bad = { ...goodNarrative, extra_claim_channel: "metadata-only" };
  assert.deepEqual(validateNarrativeSchema(bad), {
    ok: false,
    reason: "unexpected_field",
    field: "extra_claim_channel",
  });
});

test("schema rejects malformed non-claim entries", () => {
  const badType = { ...goodNarrative, non_claims: ["not fraud detection", 123] };
  assert.deepEqual(validateNarrativeSchema(badType), {
    ok: false,
    reason: "invalid_non_claim",
    field: "non_claims",
  });

  const badLength = {
    ...goodNarrative,
    non_claims: ["x".repeat(NARRATIVE_FIELD_MAX_LENGTH + 1)],
  };
  assert.deepEqual(validateNarrativeSchema(badLength), {
    ok: false,
    reason: "field_too_long",
    field: "non_claims",
  });
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
