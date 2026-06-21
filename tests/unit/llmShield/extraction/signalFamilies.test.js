// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_MAP,
  FAMILY_ORDER,
  familyMapDigest,
  signalToFamily,
  distinctFamilies,
} from "../../../../tools/simurgh-extraction/signalFamilies.mjs";

test("FAMILY_MAP and its member arrays are deep-frozen", () => {
  assert.equal(Object.isFrozen(FAMILY_MAP), true);
  assert.equal(Object.isFrozen(FAMILY_MAP.structural), true);
  assert.equal(Object.isFrozen(FAMILY_ORDER), true);
});

test("signalToFamily maps members and returns null for unknown", () => {
  assert.equal(signalToFamily("repetition_cluster"), "structural");
  assert.equal(signalToFamily("cot_elicitation"), "behavioural");
  assert.equal(signalToFamily("hydra_cluster"), "coordination");
  assert.equal(signalToFamily("nope"), null);
});

test("distinctFamilies counts FAMILIES not booleans and sorts by FAMILY_ORDER", () => {
  // both fired signals are structural → ONE family
  assert.deepEqual(distinctFamilies(["template_prefix_cluster", "repetition_cluster"]), ["structural"]);
  // two families, returned in FAMILY_ORDER regardless of input order
  assert.deepEqual(distinctFamilies(["cot_elicitation", "repetition_cluster"]), ["structural", "behavioural"]);
});

test("distinctFamilies ignores unknown signals", () => {
  assert.deepEqual(distinctFamilies(["nope"]), []);
});

test("familyMapDigest is sha256-prefixed and stable", () => {
  assert.match(familyMapDigest(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(familyMapDigest(), familyMapDigest());
});
