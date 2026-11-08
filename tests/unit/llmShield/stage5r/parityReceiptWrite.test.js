// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Annex A1: the parity driver writes the committed receipt only when asked to.
//
// The committed receipt is the release-surface member behind `parity_output_root`, and it names the
// browser binary of the host that produced it. A reproduce run that rewrote it on any other host
// changed a signed member's bytes: the Quality Gate on main failed with a `parity_output_root`
// mismatch and a dirty tree (run 41167174560; audit E-5). On the authoring host the rewrite produced
// identical bytes, which is why it passed there, so this test checks the mtime as well as the bytes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const DRIVER = "tools/simurgh-attestation/stage5r/node/runCrossRuntimeParity.mjs";
const RECEIPT = join(
  ROOT,
  "docs/research/llm-shield/evidence/stage-5r/parity/cross-runtime-parity.json"
);

test("a bare parity run leaves the committed receipt untouched", () => {
  const bytes = readFileSync(RECEIPT);
  const { mtimeMs } = statSync(RECEIPT);
  const run = spawnSync(process.execPath, [join(ROOT, DRIVER)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 300000,
  });
  assert.equal(run.status, 0, `the parity driver failed:\n${run.stdout}\n${run.stderr}`);
  assert.equal(statSync(RECEIPT).mtimeMs, mtimeMs, "the driver wrote the committed receipt");
  assert.ok(readFileSync(RECEIPT).equals(bytes), "the committed receipt's bytes changed");
});

test("no reproduce path asks the parity driver to write", () => {
  for (const file of [
    "scripts/reproduce-llm-shield-stage5r.sh",
    ".github/workflows/stage-5r-checks.yml",
  ]) {
    const calls = readFileSync(join(ROOT, file), "utf8")
      .split("\n")
      .filter((line) => line.includes(DRIVER));
    assert.ok(calls.length > 0, `${file} no longer runs the parity driver`);
    for (const line of calls) assert.doesNotMatch(line, /--write\b/, `${file}: ${line.trim()}`);
  }
});
