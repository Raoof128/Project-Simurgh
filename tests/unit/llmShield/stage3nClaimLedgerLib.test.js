// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3N_FAMILIES,
  STAGE3N_SOURCE_FILES,
  readPath,
  METRIC_CONTRACT,
  evaluatePooling,
} from "../../../tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs";

test("STAGE3N_FAMILIES is the five frozen families", () => {
  assert.deepEqual(STAGE3N_FAMILIES, [
    "agentdojo_layer2",
    "agentdojo_full",
    "adaptive_readiness",
    "fable5_reference_containment",
    "attestation_validity",
  ]);
  assert.throws(() => STAGE3N_FAMILIES.push("x"));
});

test("STAGE3N_SOURCE_FILES maps every family to a path", () => {
  for (const f of STAGE3N_FAMILIES) {
    assert.equal(typeof STAGE3N_SOURCE_FILES[f], "string");
  }
});

test("readPath reads nested dotted paths and returns undefined on miss", () => {
  const obj = { a: { b: { c: 7 } } };
  assert.equal(readPath(obj, "a.b.c"), 7);
  assert.equal(readPath(obj, "a.b.x"), undefined);
  assert.equal(readPath(obj, "a.z.c"), undefined);
});

test("METRIC_CONTRACT has one entry per family with required keys", () => {
  assert.equal(METRIC_CONTRACT.length, 5);
  for (const e of METRIC_CONTRACT) {
    for (const k of [
      "source_stage",
      "metric_family",
      "denominator_basis",
      "security_denominator",
      "utility_denominator",
      "pooling_group",
      "pooling_allowed_with",
    ]) {
      assert.ok(k in e, `missing ${k}`);
    }
  }
});

test("evaluatePooling refuses all mismatched denominators and pools none", () => {
  const r = evaluatePooling(METRIC_CONTRACT);
  assert.equal(r.cross_family_pooling_performed, 0);
  assert.equal(r.mismatched_denominator_pooling_refusal_test_passed, true);
  assert.ok(r.refusals.length >= 1);
});
