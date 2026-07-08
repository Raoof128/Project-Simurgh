// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA constants (plan Task 2). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VWA_DECLARATION_SCHEMA,
  VWA_CAPTURE_SCHEMA,
  VWA_MAP_SCHEMA,
  VWA_AUDIT_SCHEMA,
  VWA_ATTESTATION_SCHEMA,
  VWA_SPAN_TYPES,
  VWA_NON_CLAIMS,
  VWA_KNOWN_LIMITATIONS,
  VWA_RAILS,
  VWA_PAID_SLOT,
  VWA_MINTED_SLOTS,
  VWA_RESERVED_SLOTS,
  VWA_NANO,
} from "../../../../tools/simurgh-attestation/stage4z/constants.mjs";
import { SPAN_TYPES } from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("schema strings are the v1 VWA namespace", () => {
  assert.equal(VWA_DECLARATION_SCHEMA, "simurgh.vwa.declaration.v1");
  assert.equal(VWA_CAPTURE_SCHEMA, "simurgh.vwa.capture.v1");
  assert.equal(VWA_MAP_SCHEMA, "simurgh.vwa.map.v1");
  assert.equal(VWA_AUDIT_SCHEMA, "simurgh.vwa.audit.v1");
  assert.equal(VWA_ATTESTATION_SCHEMA, "simurgh.vwa.attestation.v1");
});

test("VWA_SPAN_TYPES is the SAME 4W SPAN_TYPES (single source of truth)", () => {
  assert.deepEqual([...VWA_SPAN_TYPES], [...SPAN_TYPES]);
});

test("VWA_NANO is the 1e9 scale as BigInt", () => {
  assert.equal(VWA_NANO, 1000000000n);
});

test("non-claims / limitations / rails are frozen and populated", () => {
  assert.equal(VWA_NON_CLAIMS.length, 11);
  assert.equal(VWA_KNOWN_LIMITATIONS.length, 9);
  assert.equal(VWA_RAILS.length, 5);
  for (const arr of [VWA_NON_CLAIMS, VWA_KNOWN_LIMITATIONS, VWA_RAILS])
    assert.ok(Object.isFrozen(arr) && arr.every((s) => typeof s === "string" && s.length));
});

test("socket ledger: pays the transparency IOU, mints exactly three", () => {
  assert.equal(VWA_PAID_SLOT, "transparency_report_profile_deferred");
  assert.deepEqual(
    [...VWA_MINTED_SLOTS],
    [
      "workspace_narrative_conflict_deferred",
      "lab_readout_pilot_deferred",
      "reflection_corpus_provenance_deferred",
    ]
  );
});

test("paid slot is ABSENT from reserved; minted are present", () => {
  assert.ok(!VWA_RESERVED_SLOTS.includes(VWA_PAID_SLOT), "paid slot must not be reserved");
  for (const s of VWA_MINTED_SLOTS) assert.ok(VWA_RESERVED_SLOTS.includes(s), `${s} reserved`);
  assert.ok(Object.isFrozen(VWA_RESERVED_SLOTS));
});
