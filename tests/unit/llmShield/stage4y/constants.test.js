// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — constants (plan Task 2). Schemas, region model, non-claims,
// limitations, rails, socket ledger.
import test from "node:test";
import assert from "node:assert/strict";
import {
  VDR_DOCUMENT_SCHEMA,
  VDR_MAP_SCHEMA,
  VDR_AUDIT_SCHEMA,
  VDR_ATTESTATION_SCHEMA,
  VDR_REGION_CLASSES,
  VDR_CLASS_PRECEDENCE,
  VDR_REDACTION_MARKERS,
  VDR_NON_CLAIMS,
  VDR_KNOWN_LIMITATIONS,
  VDR_RAILS,
  VDR_PAID_SLOT,
  VDR_MINTED_SLOTS,
  VDR_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage4y/constants.mjs";

test("schema ids are frozen strings", () => {
  assert.equal(VDR_DOCUMENT_SCHEMA, "simurgh.vdr.document.v1");
  assert.equal(VDR_MAP_SCHEMA, "simurgh.vdr.map.v1");
  assert.equal(VDR_AUDIT_SCHEMA, "simurgh.vdr.audit.v1");
  assert.equal(VDR_ATTESTATION_SCHEMA, "simurgh.vdr.attestation.v1");
});

test("region classes + precedence (redacted > v1 > v2only > unflagged)", () => {
  assert.deepEqual(
    [...VDR_REGION_CLASSES],
    ["caught_v1", "caught_v2_only", "redacted", "unflagged"]
  );
  // precedence ranks: redacted highest (0), unflagged lowest (3)
  assert.ok(VDR_CLASS_PRECEDENCE.redacted < VDR_CLASS_PRECEDENCE.caught_v1);
  assert.ok(VDR_CLASS_PRECEDENCE.caught_v1 < VDR_CLASS_PRECEDENCE.caught_v2_only);
  assert.ok(VDR_CLASS_PRECEDENCE.caught_v2_only < VDR_CLASS_PRECEDENCE.unflagged);
});

test("redaction markers include the U+2588 run and the literal token", () => {
  assert.ok(VDR_REDACTION_MARKERS.some((m) => m.id === "full_block_run"));
  assert.ok(VDR_REDACTION_MARKERS.some((m) => m.id === "redacted_literal"));
});

test("non-claims: length 11, first is truth-non-judgment, last is marker conservatism", () => {
  assert.equal(VDR_NON_CLAIMS.length, 11);
  assert.equal(VDR_NON_CLAIMS[0], "not_a_judgment_of_document_truth_quality_or_compliance");
  assert.equal(
    VDR_NON_CLAIMS[10],
    "not_a_claim_that_conservative_marker_detection_covers_prose_mentions"
  );
});

test("known limitations: length 8, extractor + marker items pinned", () => {
  assert.equal(VDR_KNOWN_LIMITATIONS.length, 8);
  assert.equal(
    VDR_KNOWN_LIMITATIONS[6],
    "span_extractor_is_stage4y_code_gate_agreement_machine_checked_not_assumed"
  );
  assert.equal(
    VDR_KNOWN_LIMITATIONS[7],
    "literal_marker_detection_is_conservative_prose_must_escape_or_declare"
  );
});

test("rails length 5", () => {
  assert.equal(VDR_RAILS.length, 5);
});

test("socket ledger: pays the 4X debt, mints only the pilot, PAID slot absent from reserved", () => {
  assert.equal(VDR_PAID_SLOT, "residue_over_submitted_narrative_deferred");
  assert.deepEqual([...VDR_MINTED_SLOTS], ["submitted_document_pilot_deferred"]);
  for (const s of [
    "irreducible_semantic_residue_deferred",
    "multilingual_ruleset_deferred",
    "narrative_version_diff_deferred",
    "transparency_report_profile_deferred",
    "cross_gate_residue_benchmark_deferred",
  ])
    assert.ok(VDR_RESERVED_SLOTS.includes(s), `reserved: ${s}`);
  // the paid slot is never left sitting in reserved (ledger discipline)
  assert.ok(!VDR_RESERVED_SLOTS.includes("residue_over_submitted_narrative_deferred"));
});
