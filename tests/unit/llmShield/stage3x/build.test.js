import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndexFile } from "../../../../tools/simurgh-attestation/build-3x-timeline.mjs";

test("index file has 12 rungs and the locked schema", () => {
  const idx = buildIndexFile();
  assert.equal(idx.schema, "simurgh.vca.public_timeline.v1");
  assert.equal(idx.rungs.length, 12);
});
test("index file is deterministic", () => {
  assert.deepEqual(buildIndexFile(), buildIndexFile());
});
