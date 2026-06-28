// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runRecordedCommand } from "../../../../tools/simurgh-attestation/stage4d-to-4f/commandResults.mjs";

test("runRecordedCommand records status and log hash without raw logs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "simurgh-command-results-"));
  const result = await runRecordedCommand({
    label: "sample",
    command: process.execPath,
    args: ["-e", "console.log('stable output')"],
    logDir: dir,
    env: { PATH: process.env.PATH },
  });
  assert.equal(result.label, "sample");
  assert.equal(result.exit_code, 0);
  assert.equal(result.expected_green, true);
  assert.match(result.log_hash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(result, "stdout"), false);
  assert.equal(Object.hasOwn(result, "stderr"), false);
  assert.match(await readFile(join(dir, "sample.log"), "utf8"), /stable output/);
});
