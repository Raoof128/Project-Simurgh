import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateCurrentSet } from "../../../scripts/lib/currentReproduceSet.mjs";
const bytes = Buffer.from(JSON.stringify({ scripts: ["reproduce-a.sh"] }));
const manifest = {
  schema: "simurgh.prior-reproduce-set.v2",
  baseline_sha256: createHash("sha256").update(bytes).digest("hex"),
  scripts: ["reproduce-a.sh", "reproduce-b.sh"],
};
test("current manifest accepts exact extension of digest-bound historical set", () => {
  assert.deepEqual(validateCurrentSet(manifest, bytes, manifest.scripts), manifest.scripts);
});
for (const [label, change, found, baseline] of [
  ["unknown addition", {}, [...manifest.scripts, "reproduce-c.sh"], bytes],
  ["removal", {}, ["reproduce-a.sh"], bytes],
  ["same-size substitution", {}, ["reproduce-a.sh", "reproduce-c.sh"], bytes],
  ["empty", { scripts: [] }, [], bytes],
  ["duplicate", { scripts: [...manifest.scripts, "reproduce-b.sh"] }, manifest.scripts, bytes],
  ["historical rewrite", {}, manifest.scripts, Buffer.from("{}")],
  ["historical omission", { scripts: ["reproduce-b.sh"] }, ["reproduce-b.sh"], bytes],
  ["wrong version", { schema: "unknown" }, manifest.scripts, bytes],
  [
    "path traversal",
    { scripts: ["reproduce-a.sh", "../reproduce-b.sh"] },
    ["reproduce-a.sh", "../reproduce-b.sh"],
    bytes,
  ],
]) {
  test(`current manifest rejects ${label}`, () => {
    assert.throws(() => validateCurrentSet({ ...manifest, ...change }, baseline, found));
  });
}
