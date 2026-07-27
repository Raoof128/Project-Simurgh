// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 17: the instrument lock, and the three ways it must fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  buildLock,
  verifyLock,
  LOCKED_PATHS,
  NOT_LOCKED,
} from "../../../../tools/simurgh-attestation/stage5r/core/instrumentLock.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const files = () =>
  Object.fromEntries(LOCKED_PATHS.map((p) => [p, readFileSync(join(ROOT, p), "utf8")]));
const runtime = {
  node_version: "26.0.0",
  node_executable_realpath: "/x",
  platform: "p",
  arch: "a",
};

test("every locked path exists, and the census is a sorted set", () => {
  for (const p of LOCKED_PATHS) assert.ok(existsSync(join(ROOT, p)), p);
  assert.deepEqual([...LOCKED_PATHS], [...LOCKED_PATHS].sort());
  assert.equal(new Set(LOCKED_PATHS).size, LOCKED_PATHS.length);
});

test("the lock's SCOPE is campaign-affecting bytes, and the exclusions are named with reasons", () => {
  // "Every deterministic module" was the earlier scope and it goes stale on the next task.
  assert.ok(NOT_LOCKED.length >= 5);
  for (const n of NOT_LOCKED) assert.ok(n.path && n.reason, JSON.stringify(n));
  const locked = new Set(
    LOCKED_PATHS.map((p) => p.replace("tools/simurgh-attestation/stage5r/", ""))
  );
  for (const n of NOT_LOCKED) assert.ok(!locked.has(n.path), `${n.path} cannot be both`);
});

test("a lock over the real tree verifies", () => {
  const lock = buildLock({ files: files(), runtime });
  assert.equal(lock.entry_count, LOCKED_PATHS.length);
  assert.deepEqual(verifyLock({ lock, files: files() }), {
    ok: true,
    drifted: [],
    added: [],
    removed: [],
  });
});

test("NEGATIVE 1 — one byte changed in a locked file is drift, named", () => {
  const lock = buildLock({ files: files(), runtime });
  const f = files();
  const victim = LOCKED_PATHS[0];
  f[victim] = `${f[victim]}\n`;
  const r = verifyLock({ lock, files: f });
  assert.equal(r.ok, false);
  assert.deepEqual(r.drifted, [victim]);
});

test("NEGATIVE 2 — an eligible file ADDED after the lock is caught", () => {
  // The census is a set, not a prefix. A new suppression transform appearing between the proof and
  // the run is exactly this case.
  const f = files();
  const late = LOCKED_PATHS.at(-1);
  const partial = { ...f };
  delete partial[late];
  const lock = buildLock({ files: { ...partial, [late]: f[late] }, runtime });
  lock.entries = lock.entries.filter((e) => e.path !== late); // a lock taken before the file existed
  const r = verifyLock({ lock, files: f });
  assert.equal(r.ok, false);
  assert.deepEqual(r.added, [late]);
});

test("NEGATIVE 3 — a locked file DELETED is caught, and not mistaken for drift", () => {
  const lock = buildLock({ files: files(), runtime });
  const f = files();
  const victim = LOCKED_PATHS[1];
  delete f[victim];
  const r = verifyLock({ lock, files: f });
  assert.equal(r.ok, false);
  assert.deepEqual(r.removed, [victim]);
  assert.deepEqual(r.drifted, []);
});

test("building a lock over a census with a missing path fails closed", () => {
  const f = files();
  delete f[LOCKED_PATHS[0]];
  assert.throws(() => buildLock({ files: f, runtime }), /do not exist/);
});

test("the lock records the runtime identity, since a verdict can depend on it", () => {
  const lock = buildLock({ files: files(), runtime });
  assert.deepEqual(lock.runtime, runtime);
});
