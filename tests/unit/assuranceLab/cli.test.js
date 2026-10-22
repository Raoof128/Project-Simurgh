// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../../../tools/assurance-lab/cli.mjs", import.meta.url));
const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", timeout: 30000 });

test("CLI preserves existing output and propagates replay and usage failures", () => {
  const directory = mkdtempSync(join(tmpdir(), "assurance-cli-test-"));
  const path = join(directory, "report.json");
  try {
    const first = run(["run", "--out", path]);
    assert.equal(first.status, 0, first.stderr);
    const bytes = readFileSync(path, "utf8");
    const second = run(["run", "--out", path]);
    assert.equal(second.status, 1);
    assert.match(second.stderr, /EEXIST/);
    assert.equal(readFileSync(path, "utf8"), bytes);
    const good = run(["verify", path]);
    assert.equal(good.status, 0, good.stderr);
    const bad = JSON.parse(bytes);
    bad.cases = [];
    writeFileSync(path, JSON.stringify(bad));
    const rejected = run(["verify", path]);
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /report_mismatch/);
    assert.equal(run(["run", "--unknown", path]).status, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
