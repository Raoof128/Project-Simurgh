// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 6: the attribution model, copied from 5Q rather than renamed inside it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  attribute,
  disturbance,
  ATTRIBUTIONS,
} from "../../../../tools/simurgh-attestation/stage5r/core/transition.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("the five values are 5Q's, with only the regression label restaged", () => {
  assert.deepEqual(ATTRIBUTIONS, [
    "green",
    "regressed_by_5r",
    "pre_existing",
    "not_compared",
    "not_comparable",
  ]);
});

test("5Q's own module is NOT edited — its member keeps the name it was signed with", () => {
  // The point of copying instead of renaming. If this file ever stops containing regressed_by_q0,
  // someone renamed a predecessor's member in place and G8 is about to fail for a better reason.
  const q = readFileSync(
    join(ROOT, "tools/simurgh-attestation/stage5q/core/transition.mjs"),
    "utf8"
  );
  assert.match(q, /regressed_by_q0/);
  assert.ok(!q.includes("regressed_by_5r"), "5Q's module must not mention 5R at all");
});

test("a passing command is green regardless of the baseline", () => {
  const a = attribute({ results: [{ command: "x", ok: true }], baselineResults: null });
  assert.deepEqual(a.green, ["x"]);
  assert.equal(a.results[0].attribution, "green");
});

test("absent a baseline run, a failure is not_compared — never green", () => {
  const a = attribute({ results: [{ command: "x", ok: false }], baselineResults: null });
  assert.deepEqual(a.not_compared, ["x"]);
  assert.equal(a.green.length, 0);
});

test("a command missing from the baseline is not_compared, not pre_existing", () => {
  const a = attribute({
    results: [{ command: "new", ok: false }],
    baselineResults: [{ command: "other", ok: true }],
  });
  assert.deepEqual(a.not_compared, ["new"]);
});

test("a tree-relative command is not_comparable even when a baseline exists", () => {
  // It names a different pair of commits in each worktree, so the two runs answer different
  // questions. 5Q labelled one `pre_existing` and had to correct it.
  const a = attribute({
    results: [{ command: "git diff --range HEAD~1..HEAD", ok: false, tree_relative: true }],
    baselineResults: [{ command: "git diff --range HEAD~1..HEAD", ok: true }],
  });
  assert.deepEqual(a.not_comparable, ["git diff --range HEAD~1..HEAD"]);
  assert.equal(a.regressed_by_5r.length, 0);
});

test("failed before and after is pre_existing; passed before and failing now is regressed_by_5r", () => {
  const a = attribute({
    results: [
      { command: "was-broken", ok: false },
      { command: "was-fine", ok: false },
    ],
    baselineResults: [
      { command: "was-broken", ok: false },
      { command: "was-fine", ok: true },
    ],
  });
  assert.deepEqual(a.pre_existing, ["was-broken"]);
  assert.deepEqual(a.regressed_by_5r, ["was-fine"]);
});

test("disturbance counts only regressions, and reports the unverified separately", () => {
  const a = attribute({
    results: [
      { command: "a", ok: false },
      { command: "b", ok: false, tree_relative: true },
    ],
    baselineResults: [{ command: "a", ok: false }],
  });
  const d = disturbance(a);
  assert.equal(d.disturbed, false);
  assert.equal(d.unverified, 1, "the tree-relative command is unverified, not passed");
});

test("every result carries exactly one attribution from the frozen set", () => {
  const a = attribute({
    results: [
      { command: "a", ok: true },
      { command: "b", ok: false },
      { command: "c", ok: false, tree_relative: true },
    ],
    baselineResults: [{ command: "b", ok: true }],
  });
  for (const r of a.results) assert.ok(ATTRIBUTIONS.includes(r.attribution), r.attribution);
  assert.equal(a.results.length, 3);
});

test("results must be an array — a scalar fails closed", () => {
  assert.throws(() => attribute({ results: null, baselineResults: null }), TypeError);
});
