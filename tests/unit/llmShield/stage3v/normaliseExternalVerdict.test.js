// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { normaliseExternalVerdict } from "../../../../tools/external-defense-adapters/normaliseExternalVerdict.mjs";

test("maps safe/allow/pass to allow", () => {
  for (const r of ["safe", "allow", "pass", "ALLOW", " Safe "])
    assert.deepEqual(normaliseExternalVerdict(r), { verdict: "allow", error_code: "none" });
});
test("maps unsafe/block/deny to block", () => {
  for (const r of ["unsafe", "block", "deny"])
    assert.deepEqual(normaliseExternalVerdict(r), { verdict: "block", error_code: "none" });
});
test("maps warn/warning to warn and abstain/unknown to abstain", () => {
  assert.equal(normaliseExternalVerdict("warning").verdict, "warn");
  assert.equal(normaliseExternalVerdict("abstain").verdict, "abstain");
  assert.equal(normaliseExternalVerdict("unknown").verdict, "abstain");
});
test("garbage/null/empty maps to error+malformed_output (branch: unknown label)", () => {
  for (const r of [null, undefined, "", "wat", 42])
    assert.deepEqual(normaliseExternalVerdict(r), {
      verdict: "error",
      error_code: "malformed_output",
    });
});
test("deterministic", () => {
  assert.equal(normaliseExternalVerdict("safe").verdict, normaliseExternalVerdict("safe").verdict);
});
