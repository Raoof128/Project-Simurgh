// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  MODEL_SLOTS_SCHEMA,
  ALLOWED_WORDING,
  parseModelSlots,
  evalOperator,
  verifySlots,
} from "../../../../tools/simurgh-narrative/claimChecker.mjs";
import { buildEvidenceDigest } from "../../../../tools/simurgh-narrative/evidenceDigest.mjs";

const digest = buildEvidenceDigest({
  sessionHash: "sha256:s",
  sourceInputs: [],
  audit_chain_valid: true,
  daemon_proof_counts: { valid: 12, missing: 1, replayed: 0 },
  gateway: { fallback_used: true, fallback_bypass_successes: 0, output_firewall_blocks: 0 },
  vca: { attestation_verified: true, claim_conflicts: 0 },
  privacy: {
    raw_pixels_captured: false,
    raw_window_titles_captured: false,
    typed_content_captured: false,
  },
});
const slot = (o) => ({
  slot_id: "s",
  evidence_ref: "gateway.fallback_used",
  operator: "==",
  expected_value: true,
  severity: "manual_review_recommended",
  wording: "fallback_observed",
  ...o,
});
const wrap = (slots) => JSON.stringify({ type: MODEL_SLOTS_SCHEMA, source: {}, slots });

test("parseModelSlots: strict single-object wall", () => {
  assert.equal(parseModelSlots(wrap([slot()])).ok, true);
  assert.equal(
    parseModelSlots("```json\n" + wrap([slot()]) + "\n```").violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots("Sure, here is the JSON:\n" + wrap([slot()])).violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots(JSON.stringify([{ type: MODEL_SLOTS_SCHEMA }])).violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots(wrap([slot()]) + "\n" + wrap([slot()])).violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots(JSON.stringify({ type: "x", slots: [] })).violation,
    "narrative_schema_violation"
  );
  assert.equal(
    parseModelSlots(JSON.stringify({ type: MODEL_SLOTS_SCHEMA, slots: "no" })).violation,
    "narrative_schema_violation"
  );
  assert.equal(parseModelSlots("{not json}").violation, "narrative_schema_violation");
  assert.equal(parseModelSlots(42).violation, "narrative_schema_violation");
});

test("evalOperator covers all operators + unknown", () => {
  assert.equal(evalOperator("==", true, true), true);
  assert.equal(evalOperator("!=", 1, 2), true);
  assert.equal(evalOperator(">", 3, 2), true);
  assert.equal(evalOperator(">=", 2, 2), true);
  assert.equal(evalOperator("<", 1, 2), true);
  assert.equal(evalOperator("<=", 2, 2), true);
  assert.equal(evalOperator("~=", 1, 1), false);
});

test("verifySlots: a supported slot passes", () => {
  const r = verifySlots([slot()], digest);
  assert.equal(r.verified.length, 1);
  assert.equal(r.rejected.length, 0);
});

test("verifySlots: missing ref / bad operator / bad wording / forbidden / bad severity → unsupported_slot", () => {
  assert.equal(
    verifySlots([slot({ evidence_ref: "gateway.nope" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ operator: "~=" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ wording: "made_up" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ wording: "cheated" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
  assert.equal(
    verifySlots([slot({ severity: "misconduct_confirmed" })], digest).rejected[0].reason,
    "unsupported_slot"
  );
});

test("verifySlots: ref resolves but relation false → narrative_claim_conflict", () => {
  const r = verifySlots([slot({ expected_value: false })], digest);
  assert.equal(r.rejected[0].reason, "narrative_claim_conflict");
  assert.equal(r.conflict_attempts, 1);
  assert.equal(r.verified.length, 0);
});

test("ALLOWED_WORDING is the manual-review vocabulary (frozen object, no forbidden terms)", () => {
  assert.ok(ALLOWED_WORDING.has("manual_review_recommended"));
  assert.ok(ALLOWED_WORDING.has("chain_valid"));
  assert.equal(ALLOWED_WORDING.has("cheated"), false);
  assert.equal(Object.isFrozen(ALLOWED_WORDING), true);
});
