import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contestTuples,
  contestedSectionSetDigest,
  buildBinding,
  verifyBinding,
} from "../../../../tools/simurgh-attestation/stage4v/core/bindingCore.mjs";
import { buildGreenBundle } from "../../../../tools/simurgh-attestation/stage4t/node/greenCapsule.mjs";

const green = buildGreenBundle();
const tuples = [
  { regime: "art73_high_risk_draft", section_id: "users_affected" },
  { regime: "gpai_art55", section_id: "chain_of_events" },
];
const cc = (over = {}) => ({
  binding: buildBinding(green.bundle, green.pubKeyPem, tuples),
  contests: tuples.map((t) => ({
    ...t,
    verb: "dispute_as_judgment",
    judgment_text_digest: "sha256:" + "0".repeat(64),
  })),
  ...over,
});

test("set digest is order-insensitive and collision-safe", () => {
  assert.equal(contestedSectionSetDigest(tuples), contestedSectionSetDigest([...tuples].reverse()));
  const A = [{ regime: "a/b", section_id: "c" }];
  const B = [{ regime: "a", section_id: "b/c" }];
  assert.notEqual(contestedSectionSetDigest(A), contestedSectionSetDigest(B));
});
test("faithful binding verifies", () => {
  assert.equal(verifyBinding(cc(), green.bundle, green.pubKeyPem), null);
});
test("any tuple field mismatch -> 153", () => {
  const bad = cc();
  bad.binding = { ...bad.binding, capsule_root: "sha256:" + "0".repeat(64) };
  assert.equal(verifyBinding(bad, green.bundle, green.pubKeyPem).raw, 153);
});
test("set digest vs contests mismatch -> 154; duplicate section -> 154", () => {
  const drop = cc();
  drop.contests = drop.contests.slice(0, 1);
  assert.equal(verifyBinding(drop, green.bundle, green.pubKeyPem).raw, 154);
  const dup = cc();
  dup.contests = [...dup.contests, dup.contests[0]];
  dup.binding = buildBinding(green.bundle, green.pubKeyPem, contestTuples(dup));
  assert.equal(verifyBinding(dup, green.bundle, green.pubKeyPem).raw, 154);
});
