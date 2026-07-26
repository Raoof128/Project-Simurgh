// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 1.5 — Annex A1: closure root R8.
//
// §2.1's roots covered 28 e2e files and omitted 243 stage-5 UNIT test files. That omission was not
// defensible as "tests gate the closure rather than belong to it", because §2.4 types gate
// definitions as closure members and root R5 admits .github/workflows for exactly that reason.
// Excluding 243 files of the same kind while including the workflows was inconsistent.
//
// R8 must be in the root set from the FIRST census (second gauntlet B2/P0-3). Sitting at Task 7.5 —
// after the census, graph and role file were built — meant all three would have been authored over
// the wrong universe and then enlarged immediately before commitment.
//
// This task adds R8 to the root table and the fixture tree. The R8 CENSUS tests live in Task 2 and
// the R8 ROLE tests in Task 6, because a task may not modify files that later tasks create.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname, relative, sep } from "node:path";
import { CLOSURE_ROOTS } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FIXTURE = join(ROOT, "tools/simurgh-attestation/stage5q/fixtures/r8-tree");

const walk = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(relative(FIXTURE, full).split(sep).join("/"));
  }
  return acc;
};

/** The R8 root, as a matcher over repo-relative paths. */
const r8 = () => CLOSURE_ROOTS.find((r) => r.id === "R8");

/** Does a repo-relative path fall under R8's pattern? */
const underR8 = (p) => /^tests\/unit\/llmShield\/stage5[a-p]\//.test(p);

test("R8 is present in the root table", () => {
  const root = r8();
  assert.ok(root, "Annex A1 adds R8; without it the census builds the wrong universe");
  assert.match(root.pattern, /^tests\/unit\/llmShield\/stage5\{a\.\.p\}/);
});

test("R8 comes AFTER R1-R7 and does not disturb them", () => {
  const ids = CLOSURE_ROOTS.map((r) => r.id);
  assert.deepEqual(ids.slice(0, 7), ["R1", "R2", "R3", "R4", "R5", "R6", "R7"]);
  assert.equal(ids[7], "R8");
});

test("the fixture tree exists and contains the shapes the census must distinguish", () => {
  assert.ok(existsSync(FIXTURE), "Task 1.5 creates the fixture tree the later census tests use");
  const files = walk(FIXTURE);
  assert.ok(files.length >= 5, `expected the full shape set, found ${files.length}`);
  for (const expected of [
    "tools/simurgh-attestation/stage5a/core/claimCore.mjs", // R1
    "tests/unit/llmShield/stage5a/claimCore.test.js", // R8, a gate
    "tests/unit/llmShield/stage5a/fixtureBuilder.test.js", // R8, an emitter
    "tests/unit/llmShield/stage4h/exitWrapper.test.js", // NOT R8 (A1.3)
    "tests/e2e/llmShield/stage5a/k7AllFunctions.test.js", // R2, not R8
  ]) {
    assert.ok(files.includes(expected), `fixture missing: ${expected}`);
  }
});

test("R8 ADMITS stage-5 unit tests", () => {
  assert.ok(underR8("tests/unit/llmShield/stage5a/claimCore.test.js"));
  assert.ok(underR8("tests/unit/llmShield/stage5p/rawCodeCensus.test.js"));
});

test("R8 EXCLUDES stage-4 unit tests — A1.3 scope discipline", () => {
  // stage4* stays `imported_dependency` under the §2.1 R7 boundary. Widening R8 to all unit tests
  // would quietly pull in four stages this campaign does not claim to attack.
  assert.ok(!underR8("tests/unit/llmShield/stage4h/exitWrapper.test.js"));
  assert.ok(!underR8("tests/unit/llmShield/stage4z/foo.test.js"));
});

test("R8 EXCLUDES e2e tests — those are R2, and double-admission would double-count", () => {
  assert.ok(!underR8("tests/e2e/llmShield/stage5a/k7AllFunctions.test.js"));
});

test("R8 EXCLUDES 5Q's own tests — the harness is covered by K7, not by the closure it attacks", () => {
  assert.ok(!underR8("tests/unit/llmShield/stage5q/constants.test.js"));
});

test("the LIVE repo has materially more R8 members than R2 members", () => {
  // The number that justified the annex: 243 unit files against 28 e2e files. Asserted as an
  // inequality, not a literal, so the test does not break every time a stage adds a test.
  const unit = walkRepo(join(ROOT, "tests/unit/llmShield"), /^stage5[a-p]$/);
  const e2e = walkRepo(join(ROOT, "tests/e2e/llmShield"), /^stage5[a-p]$/);
  assert.ok(unit > 100, `expected the R8 population to be large, found ${unit}`);
  assert.ok(unit > e2e * 3, `R8 (${unit}) should dwarf R2 (${e2e}) — that gap is why A1 exists`);
});

function walkRepo(base, stageDir) {
  if (!existsSync(base)) return 0;
  let n = 0;
  for (const name of readdirSync(base)) {
    if (!stageDir.test(name)) continue;
    const dir = join(base, name);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) if (f.endsWith(".test.js")) n += 1;
  }
  return n;
}
