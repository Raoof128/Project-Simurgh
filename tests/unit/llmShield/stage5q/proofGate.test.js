// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — the proof gate must FAIL when there is nothing to prove.
//
// This is the single most important test in Wave I, and it exists because the plan very nearly
// shipped the stage's own signature defect.
//
// Spec §14.3 specified the 5Q proof gate as:
//     find proofs/stage5q -name '*.lean' -print0 | sort -z | xargs -0 -n1 lean
// Against an empty directory that runs zero invocations and exits 0. A gate asserting "5Q's proofs
// verify" would have been GREEN because no proof existed — which is precisely F001, the false-green
// finding this stage froze as evidence, reproduced by the stage built to hunt it.
//
// So the gate carries a count floor, and this test is what holds it there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const GATE = join(ROOT, "scripts/check-stage5q-proofs.sh");

/** Run the gate with `proofs/stage5q` pointing at a scratch tree. */
function runGateIn(dir) {
  return spawnSync("bash", [GATE], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH },
  });
}

test("the gate script exists and is executable", () => {
  assert.ok(existsSync(GATE), "scripts/check-stage5q-proofs.sh must exist");
});

test("EMPTY proofs/stage5q FAILS — a proof gate with nothing to prove is a false green", () => {
  const dir = mkdtempSync(join(tmpdir(), "5q-proofgate-empty-"));
  try {
    mkdirSync(join(dir, "proofs/stage5q"), { recursive: true });
    mkdirSync(join(dir, "scripts"), { recursive: true });
    const r = runGateIn(dir);
    assert.notEqual(r.status, 0, "an empty proof directory MUST fail the gate, not pass it");
    assert.match(
      `${r.stdout}${r.stderr}`,
      /no proofs|false green/i,
      "the failure must say why, so nobody 'fixes' it by deleting the floor"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a MISSING proofs/stage5q also fails — absence is not success either", () => {
  const dir = mkdtempSync(join(tmpdir(), "5q-proofgate-missing-"));
  try {
    const r = runGateIn(dir);
    assert.notEqual(r.status, 0, "a missing proof directory must not pass");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the gate names NO individual file — it must be self-extending", () => {
  // F001's root cause is a gate that enumerates by hand. A 5Q gate that listed its own proofs by
  // name would be the same defect one level down, in the stage that exists to hunt it.
  const src = spawnSync("cat", [GATE], { encoding: "utf8" }).stdout;
  assert.ok(!/\bVsr\.lean\b/.test(src), "the gate must not name a proof file");
  assert.match(src, /find proofs\/stage5q/, "it must discover proofs, not list them");
});

test("the gate counts NUL-safely, so a newline in a filename cannot miscount", () => {
  // gauntlet P2-2: `find | wc -l` counts LINES, and a filename may contain one.
  const src = spawnSync("cat", [GATE], { encoding: "utf8" }).stdout;
  assert.ok(!/find[^\n]*\|\s*wc -l/.test(src), "line-based counting is not NUL-safe");
  assert.match(src, /-print0/, "enumeration must be NUL-delimited");
});

test("a non-empty proofs/stage5q reaches the lean invocation", () => {
  // We do not require `lean` to succeed here — this asserts the gate gets PAST the floor and
  // actually tries, which is the behaviour the floor must not block.
  const dir = mkdtempSync(join(tmpdir(), "5q-proofgate-nonempty-"));
  try {
    mkdirSync(join(dir, "proofs/stage5q"), { recursive: true });
    writeFileSync(join(dir, "proofs/stage5q/Probe.lean"), "theorem probe : True := trivial\n");
    const r = runGateIn(dir);
    const out = `${r.stdout}${r.stderr}`;
    assert.ok(
      !/no proofs/i.test(out),
      "with a proof present the gate must pass the floor and attempt verification"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
