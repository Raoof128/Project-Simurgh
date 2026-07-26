// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 4 — the gate census. Fixtures, not the live workflows, so the test does not
// break every time the repo's CI changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyStep,
  driftFor,
  gateCensus,
  ENUMERATION_STYLES,
  assertsCompleteness,
} from "../../../../tools/simurgh-attestation/stage5q/core/censusGate.mjs";

test("three styles, not two — a guess wearing an enum is not a classification", () => {
  assert.deepEqual(
    [...ENUMERATION_STYLES],
    ["self_extending", "manually_enumerated", "unclassifiable"]
  );
});

test("a step that DISCOVERS its inputs is self_extending", () => {
  const s = classifyStep({
    gate_id: "g1",
    run: "find tests/e2e -name '*.test.js' | xargs node --test",
  });
  assert.equal(s.enumeration_style, "self_extending");
});

test("a step that NAMES artifacts is manually_enumerated, and the names are returned", () => {
  const s = classifyStep({ gate_id: "g2", run: "lean proofs/a/X.lean\nlean proofs/b/Y.lean" });
  assert.equal(s.enumeration_style, "manually_enumerated");
  assert.deepEqual(s.enumerated_items, ["proofs/a/X.lean", "proofs/b/Y.lean"]);
});

test("a find BESIDE a hand-written list is still manually_enumerated", () => {
  // This is the trap: a discovery token does not launder an adjacent list into self-extension.
  const s = classifyStep({ gate_id: "g3", run: "find . -name x\nlean proofs/a/X.lean" });
  assert.equal(s.enumeration_style, "manually_enumerated");
});

test("a step we cannot classify is UNCLASSIFIABLE, never defaulted", () => {
  // Calling this manually_enumerated because no `find` appeared would be a guess, and guessing is
  // how a latent vacuous-green gets a clean bill of health.
  const s = classifyStep({ gate_id: "g4", run: "npm run some:script" });
  assert.equal(s.enumeration_style, "unclassifiable");
  assert.match(s.reason, /human must classify/);
});

test("drift returns the OMITTED NAMES, not a boolean", () => {
  const d = driftFor({
    enumerated_items: ["proofs/a/X.lean"],
    universe_items: ["proofs/a/X.lean", "proofs/b/Y.lean", "proofs/c/Z.lean"],
  });
  assert.equal(d.drifted, true);
  assert.deepEqual(d.difference, ["proofs/b/Y.lean", "proofs/c/Z.lean"]);
  assert.equal(d.enumerated_count, 1);
  assert.equal(d.universe_count, 3);
});

test("no drift when the list covers the universe", () => {
  const d = driftFor({
    enumerated_items: ["a.lean", "b.lean"],
    universe_items: ["a.lean", "b.lean"],
  });
  assert.equal(d.drifted, false);
  assert.deepEqual(d.difference, []);
});

test("a manually-enumerated gate WITHOUT a universe_query is a problem", () => {
  // Its drift cannot be checked, so its completeness cannot be claimed (gauntlet P1-12).
  const c = gateCensus({ steps: [{ gate_id: "g", run: "lean proofs/a/X.lean" }] });
  assert.equal(c.ok, false);
  assert.match(c.problems[0].reason, /universe_query/);
});

test("with a universe_query it is acceptable", () => {
  const c = gateCensus({
    steps: [
      { gate_id: "g", run: "lean proofs/a/X.lean", universe_query: "find proofs -name '*.lean'" },
    ],
  });
  assert.equal(c.ok, true);
  assert.equal(c.counts.manually_enumerated, 1);
});

test("an IN-SCOPE step we cannot classify blocks the census", () => {
  // It runs a test (so it asserts completeness over some set) but names nothing and discovers
  // nothing, so what set it covers is unknown. That is a blocker, not a shrug.
  const c = gateCensus({ steps: [{ gate_id: "g", run: "npm run test:something" }] });
  assert.equal(c.ok, false);
  assert.equal(c.counts.unclassifiable, 1);
});

test("F001's SHAPE, reproduced as a fixture", () => {
  // The real defect: a workflow naming 27 proofs while 32 exist on disk. Encoded as a fixture so
  // the mechanism is tested without reading the live workflow, which Q0 must not depend on.
  const listed = Array.from({ length: 27 }, (_, i) => `proofs/s${i}/P${i}.lean`);
  const onDisk = [...listed, ...Array.from({ length: 5 }, (_, i) => `proofs/x${i}/Q${i}.lean`)];
  const step = classifyStep({
    gate_id: "lean-check",
    run: listed.map((p) => `lean ${p}`).join("\n"),
    universe_query: "find proofs -name '*.lean'",
  });
  assert.equal(step.enumeration_style, "manually_enumerated");
  const d = driftFor({ enumerated_items: step.enumerated_items, universe_items: onDisk });
  assert.equal(d.drifted, true);
  assert.equal(d.difference.length, 5, "exactly the five omitted proofs surface");
});

test("setup steps are OUT OF SCOPE, not unclassifiable (found by the live run)", () => {
  // The first live census made 13 install steps into precommit_blockers. `npm ci` asserts nothing
  // about a set; forcing it through a completeness enum would train everyone to wave
  // `unclassifiable` through, which is worse than not classifying it at all.
  const c = gateCensus({
    steps: [
      { gate_id: "setup", run: "npm ci" },
      { gate_id: "rust", run: "cargo clippy --all-targets" },
      { gate_id: "real", run: "find tests/e2e -name '*.test.js' | xargs node --test" },
    ],
  });
  assert.equal(c.counts.not_a_completeness_gate, 2);
  assert.equal(c.counts.self_extending, 1);
  assert.equal(c.ok, true, "setup steps must not block the census");
});

test("assertsCompleteness distinguishes verifying from installing", () => {
  assert.equal(assertsCompleteness("lean proofs/a/X.lean"), true);
  assert.equal(assertsCompleteness("npm run test:stage5q"), true);
  assert.equal(assertsCompleteness("npm ci"), false);
  assert.equal(assertsCompleteness("apt-get install -y xvfb"), false);
});
