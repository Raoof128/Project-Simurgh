// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — constants + three-payment ledger (plan Task 2).
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VNC_CLAIM_TABLE_SCHEMA,
  VNC_LEDGER_SCHEMA,
  VNC_REFLECTION_MANIFEST_SCHEMA,
  VNC_PILOT_ADAPTATION_SCHEMA,
  VNC_ATTESTATION_SCHEMA,
  VNC_VERDICTS,
  VNC_POLARITIES,
  VNC_SCOPE_RULE,
  VNC_ELIGIBLE_SPAN_TYPE,
  VNC_SPAN_TYPES,
  VNC_NON_CLAIMS,
  VNC_KNOWN_LIMITATIONS,
  VNC_RAILS,
  VNC_PAID_SLOTS,
  VNC_MINTED_SLOTS,
  VNC_PAID_SLOT_SCOPES,
  VNC_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5a/constants.mjs";
import { SPAN_TYPES } from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

test("VNC schema strings are the five v1 artifacts", () => {
  assert.equal(VNC_CLAIM_TABLE_SCHEMA, "simurgh.vnc.claim_table.v1");
  assert.equal(VNC_LEDGER_SCHEMA, "simurgh.vnc.ledger.v1");
  assert.equal(VNC_REFLECTION_MANIFEST_SCHEMA, "simurgh.vnc.reflection_manifest.v1");
  assert.equal(VNC_PILOT_ADAPTATION_SCHEMA, "simurgh.vnc.pilot_adaptation.v1");
  assert.equal(VNC_ATTESTATION_SCHEMA, "simurgh.vnc.attestation.v1");
});

test("verdict/polarity/scope enums are frozen and exact", () => {
  assert.deepEqual([...VNC_VERDICTS], ["corroborated", "contradicted", "unreadable"]);
  assert.deepEqual([...VNC_POLARITIES], ["asserts_unflagged", "asserts_flagged"]);
  assert.equal(VNC_SCOPE_RULE, "all_cells");
  assert.equal(VNC_ELIGIBLE_SPAN_TYPE, "unverified_prose");
  assert.ok(Object.isFrozen(VNC_VERDICTS) && Object.isFrozen(VNC_POLARITIES));
});

test("VNC_SPAN_TYPES is re-exported identical to 4W SPAN_TYPES (single source)", () => {
  assert.deepEqual([...VNC_SPAN_TYPES], [...SPAN_TYPES]);
  assert.ok(VNC_SPAN_TYPES.includes(VNC_ELIGIBLE_SPAN_TYPE));
});

test("signed prose lists are frozen, non-empty, and the right length", () => {
  assert.equal(VNC_NON_CLAIMS.length, 11);
  assert.equal(VNC_KNOWN_LIMITATIONS.length, 9);
  assert.equal(VNC_RAILS.length, 5);
  for (const arr of [VNC_NON_CLAIMS, VNC_KNOWN_LIMITATIONS, VNC_RAILS]) {
    assert.ok(Object.isFrozen(arr));
    for (const s of arr) assert.ok(typeof s === "string" && s.length > 0);
  }
});

test("ledger: pays THREE, mints ONE, reserved is SIX (net debt -2, arithmetic)", () => {
  assert.deepEqual(
    [...VNC_PAID_SLOTS],
    [
      "workspace_narrative_conflict_deferred",
      "lab_readout_pilot_deferred",
      "reflection_corpus_provenance_deferred",
    ]
  );
  assert.deepEqual([...VNC_MINTED_SLOTS], ["frontier_readout_conflict_deferred"]);
  assert.equal(VNC_RESERVED_SLOTS.length, 6);
  // Every paid slot is REMOVED from reserved (a paid socket is never left reserved).
  for (const paid of VNC_PAID_SLOTS) assert.ok(!VNC_RESERVED_SLOTS.includes(paid), `${paid} paid`);
  // The minted slot IS reserved (a minted socket is an IOU).
  for (const m of VNC_MINTED_SLOTS) assert.ok(VNC_RESERVED_SLOTS.includes(m), `${m} reserved`);
});

test("MF1: paid-slot SCOPE is a machine fact, one scope per paid slot, no orphans", () => {
  const scopeKeys = Object.keys(VNC_PAID_SLOT_SCOPES).sort();
  assert.deepEqual(scopeKeys, [...VNC_PAID_SLOTS].sort());
  const allowed = new Set(["full", "artifact_scope", "mechanism_and_open_corpus_scope"]);
  for (const slot of VNC_PAID_SLOTS) assert.ok(allowed.has(VNC_PAID_SLOT_SCOPES[slot]), slot);
  assert.equal(VNC_PAID_SLOT_SCOPES.workspace_narrative_conflict_deferred, "full");
  assert.equal(VNC_PAID_SLOT_SCOPES.lab_readout_pilot_deferred, "artifact_scope");
  assert.equal(
    VNC_PAID_SLOT_SCOPES.reflection_corpus_provenance_deferred,
    "mechanism_and_open_corpus_scope"
  );
  assert.ok(Object.isFrozen(VNC_PAID_SLOT_SCOPES));
});
