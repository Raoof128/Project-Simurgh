// SPDX-License-Identifier: AGPL-3.0-or-later
//
// FINDING 5S-F012 — a fixture builder that truncates before it fills.
//
// Stage 4J failed intermittently, roughly one full-suite run in six:
//
//   SyntaxError: Unexpected end of JSON input
//     at readJson (verify-stage4j-pcta.mjs:16)
//     at loadDfiSubstrate (…:36)  ->  `${base}-base-pack.json`
//
// It never reproduced when the 4J test ran alone, and the cause was recorded as unknown.
//
// THE MECHANISM. `loadDfiSubstrate` reads the SHARED committed substrate under
// `tests/fixtures/llmShield/stage4h/`. `tests/e2e/llmShield/stage4hFullSmoke.test.js` runs the 4H
// builder, which REWRITES those same files. `node --test` runs test FILES in parallel processes,
// so 4H rewrote the substrate while 4J was reading it. `writeFile` truncates and then fills;
// between those moments the file exists and is empty.
//
// Reproduced before the repair by looping the builder against repeated 4J runs — 1 failure in 43,
// with the exact reported error — and the property itself measured directly: writing a 400 KB file
// 400 times with `writeFile` while a reader spun produced 90 truncated reads; the same load through
// write-then-rename produced 0 in 1389.
//
// THE REPAIR is atomicity, not retries and not serialising the tests. `rename` within a directory
// is atomic on POSIX, so a reader sees the whole old file or the whole new one. That fixes every
// reader of these fixtures, including ones nobody has written yet.

import assert from "node:assert/strict";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import test from "node:test";

const BUILDER = "tools/simurgh-attestation/stage4h/build-stage4h-digest-fixtures.mjs";

test("[5s-f012] the 4H builder writes atomically — no bare writeFile to a fixture path", () => {
  const src = readFileSync(BUILDER, "utf8");

  // Exactly one bare `writeFile` may remain: the one INSIDE atomicWrite that creates the temp file.
  const bare = [...src.matchAll(/await writeFile\(/g)].length;
  assert.equal(
    bare,
    1,
    `${bare} bare writeFile calls; only atomicWrite's own temp write may remain`
  );

  assert.match(src, /async function atomicWrite\(/, "the builder has no atomicWrite helper");
  assert.match(src, /await rename\(tmp, path\)/, "atomicWrite does not rename into place");

  // The temp name must be unique per process, or two concurrent builders collide on it.
  assert.match(src, /process\.pid/, "the temp name is not process-unique");
});

test("[5s-f012] a truncate-then-fill write IS observable half-written", async () => {
  // The defect, demonstrated rather than asserted. If this ever stops reproducing, the test below
  // proves nothing and this one says so first.
  const dir = await mkdtemp(join(tmpdir(), "f012-plain-"));
  const target = join(dir, "pack.json");
  const payload = JSON.stringify({ blob: "x".repeat(200_000) });
  try {
    await writeFile(target, payload);
    let truncated = 0;
    let done = false;
    const writer = (async () => {
      for (let i = 0; i < 120; i++) await writeFile(target, payload);
      done = true;
    })();
    while (!done) {
      try {
        JSON.parse(await readFile(target, "utf8"));
      } catch {
        truncated++;
      }
    }
    await writer;
    assert.ok(truncated > 0, "a non-atomic write was never observed half-written on this platform");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("[5s-f012] write-then-rename is NEVER observable half-written", async () => {
  const dir = await mkdtemp(join(tmpdir(), "f012-atomic-"));
  const target = join(dir, "pack.json");
  const payload = JSON.stringify({ blob: "x".repeat(200_000) });
  try {
    await writeFile(target, payload);
    let truncated = 0;
    let reads = 0;
    let done = false;
    const writer = (async () => {
      for (let i = 0; i < 120; i++) {
        const tmp = `${target}.tmp-${process.pid}-${i}`;
        await writeFile(tmp, payload);
        await rename(tmp, target);
      }
      done = true;
    })();
    while (!done) {
      reads++;
      try {
        JSON.parse(await readFile(target, "utf8"));
      } catch {
        truncated++;
      }
    }
    await writer;
    assert.equal(truncated, 0, `${truncated} truncated reads in ${reads} under atomic writes`);
    assert.ok(reads > 100, `only ${reads} reads — too few to have exercised the window`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
