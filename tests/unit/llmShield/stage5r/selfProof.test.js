// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Tasks 15 and 16: the mutant census, and the anchors it depends on.
//
// The runner seeds each mutant by textual substitution. If an anchor rots, the substitution silently
// no-ops and the self-proof reports a green run that proved nothing — the same class of defect the
// self-proof exists to catch, one level up. So the anchors are checked here, against the real files,
// every time the suite runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  MUTANTS,
  GATE_SEEDS,
  applySeed,
} from "../../../../tools/simurgh-attestation/stage5r/core/mutants.mjs";
import { isCaught } from "../../../../tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

test("there are EIGHT mutants — N5 split in two, and N7 added when the detector was repaired", () => {
  assert.equal(MUTANTS.length, 8);
  const ids = MUTANTS.map((m) => m.id);
  assert.deepEqual(ids, ["N1", "N2", "N3", "N4", "N5a", "N5b", "N6", "N7"]);
  assert.equal(new Set(ids).size, ids.length);
});

test("N5a and N5b are different defects in different files", () => {
  const a = MUTANTS.find((m) => m.id === "N5a");
  const b = MUTANTS.find((m) => m.id === "N5b");
  assert.match(a.intent, /NO-OP/);
  assert.match(b.intent, /admitted anyway/);
  assert.notEqual(
    a.file,
    b.file,
    "a no-op suppressor and a checker that ignores it are not the same bug"
  );
});

test("N7 seeds the defect this stage ACTUALLY SHIPPED, not one that was easy to imagine", () => {
  const n7 = MUTANTS.find((m) => m.id === "N7");
  assert.match(n7.intent, /LABEL/);
  assert.match(n7.file, /signals\.mjs$/);
});

test("N6 is the blade's own mutant", () => {
  const n6 = MUTANTS.find((m) => m.id === "N6");
  assert.match(n6.intent, /class-wide/);
  assert.match(n6.expected_catch, /BLADE/);
});

test("EVERY mutant anchor occurs exactly once in the real file", () => {
  // Anchor rot is how a self-proof goes quietly vacuous.
  for (const m of MUTANTS) {
    const text = read(m.file);
    const n = text.split(m.find).length - 1;
    assert.equal(n, 1, `${m.id}: anchor occurs ${n} times in ${m.file}`);
  }
});

test("EVERY gate seed anchor resolves too, and G8/G9 are deliberately absent", () => {
  for (const s of GATE_SEEDS) {
    if (s.append !== undefined) {
      assert.ok(read(s.file).length > 0, `${s.gate}: target file is empty`);
      continue;
    }
    const n = read(s.file).split(s.find).length - 1;
    assert.equal(n, 1, `${s.gate}: anchor occurs ${n} times in ${s.file}`);
  }
  const gates = GATE_SEEDS.map((s) => s.gate);
  assert.deepEqual(gates, ["G0", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G10"]);
  assert.ok(!gates.includes("G8"), "G8 is built by Task 26");
  assert.ok(!gates.includes("G9"), "G9 is built by Task 23");
});

test("every seed names a command under tests/, so the runner's shape guard admits it", () => {
  const SAFE = /^node --test tests\/[A-Za-z0-9/._*-]+$/;
  for (const s of GATE_SEEDS) assert.match(s.command, SAFE, s.gate);
  for (const m of MUTANTS) assert.match(`node --test ${m.caught_by}`, SAFE, m.id);
});

test("a seed whose anchor has vanished FAILS LOUDLY rather than no-opping", () => {
  assert.throws(
    () => applySeed("unrelated text", { id: "N1", find: "gone", replace: "x" }),
    /silently no-opped/
  );
});

test("an AMBIGUOUS anchor is refused — a seed must land in exactly one place", () => {
  assert.throws(() => applySeed("a a", { id: "N1", find: "a", replace: "b" }), /occurs 2 times/);
});

test("applySeed actually changes the text it is given", () => {
  assert.equal(
    applySeed("keep true keep", { id: "x", find: "true", replace: "false" }),
    "keep false keep"
  );
  assert.equal(applySeed("body", { id: "x", append: "\n" }), "body\n");
});

test("a mutant is CAUGHT only by the full green→red→green shape", () => {
  // The line gate G6 seeds. A runner that reported caught unconditionally would look identical to a
  // working self-proof, and every receipt in the file would be a lie.
  assert.equal(isCaught({ baselineOk: true, mutatedOk: false, restoredOk: true }), true);
  assert.equal(
    isCaught({ baselineOk: false, mutatedOk: false, restoredOk: true }),
    false,
    "never green to begin with"
  );
  assert.equal(
    isCaught({ baselineOk: true, mutatedOk: true, restoredOk: true }),
    false,
    "the mutation was not caught"
  );
  assert.equal(
    isCaught({ baselineOk: true, mutatedOk: false, restoredOk: false }),
    false,
    "did not come back green"
  );
});
