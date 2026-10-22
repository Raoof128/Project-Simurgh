// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { validatePriorSet } from "../../scripts/lib/priorReproduceSet.mjs";

const self = "reproduce-llm-shield-stage5s.sh";
const raw = JSON.stringify({ scripts: ["reproduce-old.sh"], excluded_by_name: [self] });
const manifest = {
  schema: "simurgh.prior-reproduce-maintenance.v1",
  historical_sha256: createHash("sha256").update(raw).digest("hex"),
  additions: [{ script: "reproduce-strict.sh", reason: "declared successor" }],
};
const files = [self, "reproduce-old.sh", "reproduce-strict.sh"];

test("maintenance executes historical and successor identities together", () => {
  assert.deepEqual(validatePriorSet(raw, manifest, files), files.slice(1));
});
for (const [name, changed] of [
  ["unexpected addition", [...files, "reproduce-surprise.sh"]],
  ["missing historical script", files.filter((x) => x !== "reproduce-old.sh")],
  ["missing successor", files.filter((x) => x !== "reproduce-strict.sh")],
  ["equal-count replacement", [self, "reproduce-old.sh", "reproduce-surprise.sh"]],
]) {
  test(`maintenance refuses ${name}`, () => {
    assert.throws(() => validatePriorSet(raw, manifest, changed), /drift/);
  });
}
test("maintenance refuses changed historical bytes", () => {
  assert.throws(() => validatePriorSet(raw + "\n", manifest, files), /historical/);
});
test("maintenance refuses duplicate, self and path-escaping additions", () => {
  for (const script of ["reproduce-old.sh", self, "../reproduce-escape.sh"]) {
    const changed = { ...manifest, additions: [{ script, reason: "test" }] };
    assert.throws(() => validatePriorSet(raw, changed, files));
  }
  assert.throws(() => validatePriorSet(raw, { ...manifest, schema: "unknown" }, files));
});
test("maintenance refuses empty historical set", () => {
  const empty = JSON.stringify({ scripts: [], excluded_by_name: [self] });
  assert.throws(
    () =>
      validatePriorSet(
        empty,
        {
          ...manifest,
          historical_sha256: createHash("sha256").update(empty).digest("hex"),
        },
        files
      ),
    /empty/
  );
});
