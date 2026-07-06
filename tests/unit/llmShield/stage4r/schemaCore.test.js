// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { SCHEMAS } from "../../../../tools/simurgh-attestation/stage4r/constants.mjs";
import {
  validateMaskMessage,
  validateDleqProof,
  validateTranscript,
  validateMatchRecord,
  validateCeremonyCapture,
  validateInvitation,
  validateAttestation,
  assertNoSealedMaterial,
} from "../../../../tools/simurgh-attestation/stage4r/core/schemaCore.mjs";

const D = (c) => "sha256:" + Buffer.from(String(c)).toString("hex").padEnd(64, "0").slice(0, 64);
const HEX = "a".repeat(64);

const goodDleq = (role) => ({
  schema: SCHEMAS.DLEQ_PROOF,
  relation_kind: "mask",
  epoch: D("e"),
  run_id: "run",
  pair_id: D("p"),
  role,
  R1: HEX,
  R2: HEX,
  s: HEX,
});

const goodTranscript = () => ({
  schema: SCHEMAS.MATCH_TRANSCRIPT,
  epoch: D("e"),
  run_id: "run",
  pair_id: D("p"),
  slot_index: 0,
  masks: { a: HEX, b: HEX },
  commitments: { a: D("ca"), b: D("cb") },
  openings: { a: { token: D("ta"), token_nonce: "00" }, b: { token: D("tb"), token_nonce: "01" } },
  z: { a: HEX, b: HEX },
  dleq: { a: [goodDleq("a"), goodDleq("a")], b: [goodDleq("b"), goodDleq("b")] },
  phase_order: { a: ["mask", "commit", "open", "sign"], b: ["mask", "commit", "open", "sign"] },
  match: true,
  signatures: { a: "sigA", b: "sigB" },
});

const goodRecord = () => ({
  schema: SCHEMAS.MATCH_RECORD,
  match: true,
  epoch: D("e"),
  pair_id_hash: D("h"),
  pair_match_commitment: D("m"),
  transcript_digest: D("t"),
  vfr_receipt_digest: D("v"),
  respondent_notice_hash: D("r"),
  contest_pointer_hash: D("c"),
  matched_against_operator_commitment: D("o"),
  contest_route_available: true,
  signatures: { a: "sigA", b: "sigB" },
});

test("valid records pass their validators", () => {
  assert.ok(validateDleqProof(goodDleq("a")).ok);
  assert.ok(validateTranscript(goodTranscript()).ok);
  assert.ok(validateMatchRecord(goodRecord()).ok);
  assert.ok(
    validateMaskMessage({
      schema: SCHEMAS.MASK_MESSAGE,
      epoch: D("e"),
      run_id: "run",
      pair_id: D("p"),
      role: "a",
      slot_index: 0,
      mask_point: HEX,
      operator_signature: "sig",
    }).ok
  );
});

test("exact-key enforcement: extra or missing key is raw 90", () => {
  const extra = { ...goodRecord(), sneaky: 1 };
  const r = validateMatchRecord(extra);
  assert.equal(r.raw, 90);
  assert.equal(r.ok, false);
  const { match, ...missing } = goodRecord();
  assert.equal(validateMatchRecord(missing).ok, false);
});

test("phase-order violation is pccc_phase_order_invalid", () => {
  const t = goodTranscript();
  t.phase_order.a = ["commit", "mask", "open", "sign"];
  assert.deepEqual(validateTranscript(t), {
    ok: false,
    raw: 90,
    reason: "pccc_phase_order_invalid",
  });
});

test("missing commitment is pccc_token_commitment_missing", () => {
  const t = goodTranscript();
  t.commitments.a = "not-a-digest";
  assert.deepEqual(validateTranscript(t), {
    ok: false,
    raw: 90,
    reason: "pccc_token_commitment_missing",
  });
});

test("bad opening is pccc_token_commitment_opening_invalid", () => {
  const t = goodTranscript();
  t.openings.b = { token: "not-a-digest", token_nonce: "02" };
  assert.deepEqual(validateTranscript(t), {
    ok: false,
    raw: 90,
    reason: "pccc_token_commitment_opening_invalid",
  });
});

test("assertNoSealedMaterial rejects any sealed key in a public record", () => {
  for (const key of ["mask_point", "token", "token_nonce", "z", "dleq"]) {
    const poisoned = { ...goodRecord(), signatures: { a: "s", b: "s", [key]: "leak" } };
    const r = assertNoSealedMaterial(poisoned);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 90);
    assert.match(r.reason, /sealed_material_in_public_record/);
  }
  assert.ok(assertNoSealedMaterial(goodRecord()).ok);
});

test("ceremony capture and invitation validators enforce shape", () => {
  assert.ok(
    validateCeremonyCapture({
      schema: SCHEMAS.CEREMONY_CAPTURE,
      epoch: D("e"),
      slot_cardinality_commitment: 3,
      slot_ledger: [],
      window_match_census: { epoch: D("e"), matches: 0, non_matches: 0, refusals: 0 },
      refusals: [],
      process_metadata: {},
      vfr_crossing: {},
    }).ok
  );
  assert.ok(
    validateInvitation({
      schema: SCHEMAS.OPERATOR_INVITATION,
      epoch_policy: "current",
      schema_versions: [SCHEMAS.MATCH_RECORD],
      verifier_digest: D("v"),
      invitee_key_digest_slot: "TBD",
      signature: "sig",
    }).ok
  );
  assert.ok(
    validateAttestation({
      schema: SCHEMAS.ATTESTATION,
      non_claims: [],
      known_limitations: [],
      rails: [],
      window_match_census: {},
    }).ok
  );
});
