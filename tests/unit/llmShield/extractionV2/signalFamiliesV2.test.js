// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_MAP_V2,
  FAMILY_ORDER_V2,
  STRONG_FAMILIES,
  CONTEXTUAL_FAMILIES,
  familyMapDigestV2,
  signalToFamilyV2,
  splitFamilies,
} from "../../../../tools/simurgh-extraction/signalFamiliesV2.mjs";

test("family map + member arrays are deep-frozen", () => {
  assert.equal(Object.isFrozen(FAMILY_MAP_V2), true);
  assert.equal(Object.isFrozen(FAMILY_MAP_V2.structural), true);
  assert.equal(Object.isFrozen(FAMILY_ORDER_V2), true);
  assert.equal(Object.isFrozen(STRONG_FAMILIES), true);
  assert.equal(Object.isFrozen(CONTEXTUAL_FAMILIES), true);
});

test("volume is the only contextual family", () => {
  assert.deepEqual([...CONTEXTUAL_FAMILIES], ["volume"]);
  assert.deepEqual(
    [...STRONG_FAMILIES],
    ["structural", "behavioural", "targeting", "coordination"]
  );
});

test("signalToFamilyV2 maps members and returns null for unknown", () => {
  assert.equal(signalToFamilyV2("repetition_cluster"), "structural");
  assert.equal(signalToFamilyV2("volume_burst"), "volume");
  assert.equal(signalToFamilyV2("nope"), null);
});

test("splitFamilies separates strong vs contextual, sorted, deduped", () => {
  const r = splitFamilies([
    "volume_burst",
    "cot_elicitation",
    "repetition_cluster",
    "template_prefix_cluster",
  ]);
  assert.deepEqual(r.strong, ["structural", "behavioural"]); // structural counted ONCE
  assert.deepEqual(r.contextual, ["volume"]);
});

test("splitFamilies ignores unknown signals", () => {
  assert.deepEqual(splitFamilies(["nope"]), { strong: [], contextual: [] });
});

test("familyMapDigestV2 single-prefixed + stable", () => {
  assert.match(familyMapDigestV2(), /^sha256:[0-9a-f]{64}$/);
  assert.equal(familyMapDigestV2(), familyMapDigestV2());
});
