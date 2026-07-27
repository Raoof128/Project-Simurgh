// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — every node CLI is imported here, and that is the whole point.
//
// Two defects in one session got past 4 483 unit tests because nothing imported a CLI's module: a
// runner that called the universe builder with no arguments, and a `const` declared twice in a
// verifier. Both are visible the instant the file is loaded. The unit suite exercised the cores
// those CLIs call and never the CLIs themselves, so the drivers — the code an operator actually
// runs — were the least-tested part of the stage.
//
// Importing is safe precisely because §9.1 requires a main guard from the first commit: ten of 5Q's
// drivers executed on import until K7-A found them, and a census cannot enumerate a module that
// exits during enumeration. So this file also checks the guard is there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const NODE_DIR = join(ROOT, "tools/simurgh-attestation/stage5r/node");
const drivers = readdirSync(NODE_DIR)
  .filter((n) => n.endsWith(".mjs"))
  .sort();

test("there are node drivers to check at all", () => {
  assert.ok(drivers.length >= 10, `only ${drivers.length} drivers found`);
});

for (const driver of drivers) {
  test(`${driver} loads, and does not run on import`, async () => {
    const source = readFileSync(join(NODE_DIR, driver), "utf8");
    assert.match(
      source,
      /if \(process\.argv\[1\] && fileURLToPath\(import\.meta\.url\) === process\.argv\[1\]\)/,
      `${driver} has no main guard — importing it would execute it`
    );
    const mod = await import(join(NODE_DIR, driver));
    assert.equal(typeof mod, "object");
  });
}
