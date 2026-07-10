// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("the Stage 5E reproduce runner fails closed when the unit suite fails", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "simurgh-stage5e-runner-"));
  const fakeNode = join(tempDir, "node");
  const realNode = process.execPath;

  try {
    writeFileSync(
      fakeNode,
      `#!/usr/bin/env bash\nif [[ "$*" == *"--test tests/unit/llmShield/stage5e/"* ]]; then exit 73; fi\nexec "${realNode}" "$@"\n`,
      "utf8"
    );
    chmodSync(fakeNode, 0o755);

    const result = spawnSync("bash", ["scripts/reproduce-llm-shield-stage5e.sh"], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: `${tempDir}:${process.env.PATH}` },
      encoding: "utf8",
    });

    assert.equal(result.status, 73, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /ALL PASS/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("the Stage 5E conformance pack includes every dependency used by its tests", () => {
  const builder = "scripts/build-llm-shield-stage5e-conformance-pack.sh";
  assert.ok(existsSync(builder), `${builder} must exist`);

  const tempDir = mkdtempSync(join(tmpdir(), "simurgh-stage5e-pack-"));
  const zipPath = join(tempDir, "simurgh-vda-conformance.zip");

  try {
    const build = spawnSync("bash", [builder, zipPath], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    assert.equal(build.status, 0, build.stdout + build.stderr);

    const listing = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
    assert.equal(listing.status, 0, listing.stdout + listing.stderr);
    assert.match(
      listing.stdout,
      /simurgh-vda-conformance\/tools\/simurgh-attestation\/stage4h\/exitCodes\.mjs/
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
