// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 7: the scratch tree, its snapshots, and containment.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  snapshotTree,
  diffSnapshots,
  isContained,
  assertContained,
  classifyDamage,
} from "../../../../tools/simurgh-attestation/stage5r/core/scratchTree.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "5r-scratch-test."));

test("a snapshot digests every file and is stable across runs", () => {
  const d = tmp();
  try {
    mkdirSync(join(d, "sub"));
    writeFileSync(join(d, "a.txt"), "alpha");
    writeFileSync(join(d, "sub", "b.txt"), "beta");
    const s1 = snapshotTree(d);
    const s2 = snapshotTree(d);
    assert.deepEqual(s1, s2);
    assert.deepEqual(Object.keys(s1).sort(), ["a.txt", join("sub", "b.txt")]);
    assert.match(s1["a.txt"], /^[0-9a-f]{64}$/);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("the diff names added, modified and removed files separately", () => {
  const d = tmp();
  try {
    writeFileSync(join(d, "keep.txt"), "1");
    writeFileSync(join(d, "gone.txt"), "2");
    const before = snapshotTree(d);
    appendFileSync(join(d, "keep.txt"), "changed");
    rmSync(join(d, "gone.txt"));
    writeFileSync(join(d, "new.txt"), "3");
    const diff = diffSnapshots(before, snapshotTree(d));
    assert.deepEqual(diff.added, ["new.txt"]);
    assert.deepEqual(diff.modified, ["keep.txt"]);
    assert.deepEqual(diff.removed, ["gone.txt"]);
    assert.equal(diff.clean, false);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("an untouched tree diffs clean", () => {
  const d = tmp();
  try {
    writeFileSync(join(d, "a.txt"), "x");
    assert.equal(diffSnapshots(snapshotTree(d), snapshotTree(d)).clean, true);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("containment is decided by REALPATH — a symlink out is not contained", () => {
  const root = tmp();
  const outside = tmp();
  try {
    writeFileSync(join(outside, "secret.txt"), "not yours");
    const inside = join(root, "inside.txt");
    writeFileSync(inside, "mine");
    const escape = join(root, "escape.txt");
    symlinkSync(join(outside, "secret.txt"), escape);

    assert.equal(isContained(root, inside), true);
    // A string-prefix check would pass here: the path starts with the root.
    assert.ok(escape.startsWith(root), "the escaping path LOOKS contained");
    assert.equal(isContained(root, escape), false, "but realpath says otherwise");
    assert.throws(() => assertContained(root, [escape]), /outside the scratch root/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("a path that does not exist is not contained", () => {
  const root = tmp();
  try {
    assert.equal(isContained(root, join(root, "nope.txt")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("damage in the SCRATCH tree is a violation — the half two snapshots cannot see", () => {
  const d = classifyDamage({
    scratchDiff: { added: ["written-on-import.json"], modified: [], removed: [] },
    primaryDiff: { added: [], modified: [], removed: [] },
  });
  assert.equal(d.ok, false);
  assert.deepEqual(d.violations, ["written-on-import.json"]);
  assert.deepEqual(d.escaped, []);
});

test("damage that ESCAPED to the primary tree is reported separately and is never allowlisted", () => {
  const d = classifyDamage({
    scratchDiff: { added: [], modified: [], removed: [] },
    primaryDiff: {
      added: [],
      modified: ["docs/research/llm-shield/evidence/stage-5q/x.json"],
      removed: [],
    },
    allowlist: ["docs/research/llm-shield/evidence/stage-5q/x.json"],
  });
  assert.equal(d.ok, false, "the allowlist governs the scratch tree only");
  assert.deepEqual(d.escaped, ["docs/research/llm-shield/evidence/stage-5q/x.json"]);
});

test("a declared allowlist entry in the scratch tree is not a violation", () => {
  const d = classifyDamage({
    scratchDiff: { added: ["expected-output.json"], modified: [], removed: [] },
    primaryDiff: { added: [], modified: [], removed: [] },
    allowlist: ["expected-output.json"],
  });
  assert.equal(d.ok, true);
  assert.deepEqual(d.violations, []);
  assert.deepEqual(
    d.scratch_writes,
    ["expected-output.json"],
    "still REPORTED, just not a violation"
  );
});

test("a clean run on both trees is ok", () => {
  const d = classifyDamage({
    scratchDiff: { added: [], modified: [], removed: [] },
    primaryDiff: { added: [], modified: [], removed: [] },
  });
  assert.equal(d.ok, true);
});
