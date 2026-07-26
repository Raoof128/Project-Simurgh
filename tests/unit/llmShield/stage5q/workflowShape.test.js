// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 1.3 — the CI workflow's shape is frozen before L2.
//
// .github/workflows/** is closure root R5. Creating this workflow after Task 8 would grow the
// committed universe after it froze — the exact L2 violation this stage exists to detect. So it is
// created first, and these tests hold its shape stable so that "enabling" a job later changes no
// bytes.
//
// The other property under test is self-extension. F001's root cause is a gate that enumerates by
// hand; a 5Q gate that listed its own proofs or tests by name would be the same defect one level
// down, inside the stage that froze F001 as evidence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const WF = join(ROOT, ".github/workflows/stage-5q-checks.yml");
const src = () => readFileSync(WF, "utf8");

test("the workflow exists before L2", () => {
  assert.ok(existsSync(WF), "must exist before Task 8 commits the closure");
});

test("it is SELF-EXTENDING: it names no individual proof, test or module", () => {
  const s = src();
  // It may reference directories and scripts; it must not reference a specific artifact.
  assert.ok(!/\bVsr\.lean\b/.test(s), "names a proof file");
  assert.ok(!/[A-Za-z0-9]+\.test\.js\b/.test(s), "names a test file");
  assert.ok(!/\bconstants\.mjs\b/.test(s), "names a module file");
  // and it must delegate discovery to the scripts
  assert.match(s, /npm run test:stage5q/);
  assert.match(s, /npm run stage5q:proofs/);
});

test("it does NOT touch the F001 workflow", () => {
  // §14.2 forbids repairing stage-4-lean-proofs.yml during Q0. Even referencing it from here would
  // blur which gate is under test and which is frozen evidence.
  assert.ok(!/stage-4-lean-proofs/.test(src()), "must not reference F001's live premise");
});

test("every not-yet-built job is EXISTENCE-GUARDED, not absent", () => {
  // This is what makes pre-L2 creation sound rather than merely convenient: the file's shape never
  // changes when a later task lands, so its source_digest at Task 8 equals its digest at Task 21.
  const s = src();
  for (const marker of [
    "no-op until Task 1.2",
    "no-op until Task 2",
    "no-op until Task 3",
    "no-op until Task 4",
    "no-op until Task 12",
    "no-op until Task 18.1",
    "no-op until Task 21",
  ]) {
    assert.ok(s.includes(marker), `missing guarded job: ${marker}`);
  }
});

test("the proof step uses the count floor, not the bare spec form", () => {
  const s = src();
  assert.match(s, /grep -zc/, "count must be NUL-safe");
  assert.ok(
    !/find proofs\/stage5q -name '\*\.lean' -print0 \| sort -z \| xargs -0 -n1 lean/.test(s),
    "the bare §14.3 form exits 0 on an empty directory — it must go through the gate script"
  );
});

test("no untrusted GitHub context is interpolated into a run: block", () => {
  const s = src();
  const runBlocks = s.split(/\n\s+run: \|/).slice(1);
  for (const block of runBlocks) {
    const body = block.split(/\n\s+- name:/)[0];
    assert.ok(
      !/\$\{\{\s*github\.event\./.test(body),
      "github.event.* must reach a shell through env:, never by interpolation"
    );
  }
  // and where a context value IS needed, it arrives as an environment variable
  assert.match(s, /env:\s*\n\s+BASE_SHA:/);
});

test("SHAPE DIGEST — recorded so Task 8 and Task 21 can be compared", () => {
  // Not pinned to a literal here: pinning it in this file would make every legitimate edit during
  // Tasks 1.3-8 a test failure. Task 8 records the digest into the closure; Task 21 re-checks it.
  // What this test asserts is that the digest is COMPUTABLE and stable within a run.
  const a = createHash("sha256").update(readFileSync(WF)).digest("hex");
  const b = createHash("sha256").update(readFileSync(WF)).digest("hex");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});
