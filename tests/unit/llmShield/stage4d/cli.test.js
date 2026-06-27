// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { main as buildStage4dPack } from "../../../../tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs";
import {
  main as verifyStage4dPack,
  writeEnvironmentFailure,
} from "../../../../tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs";

const execFileAsync = promisify(execFile);

test("stage4d build and verify CLIs run as importable functions", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "stage4d-cli-test-"));
  try {
    const runRecord = join(tmp, "run-record.json");
    const pack = join(tmp, "evidence-pack.json");
    const sig = join(tmp, "evidence-pack.sig");
    const results = join(tmp, "verify-results.json");
    await execFileAsync(
      "python",
      [
        "-m",
        "stage4d.run_fixture",
        "--fixture",
        join(
          process.cwd(),
          "tools/agentdojo-simurgh-adapter/stage4d/fixtures/browser_inject_01.json"
        ),
        "--out",
        runRecord,
      ],
      { cwd: "tools/agentdojo-simurgh-adapter" }
    );
    const exitCode = await buildStage4dPack({
      argv: ["--run-record", runRecord, "--out", pack, "--sig", sig],
      env: {
        SIMURGH_4D_PRIVATE_KEY_PATH:
          "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem",
      },
    });
    assert.equal(exitCode, 0);
    assert.equal(
      await verifyStage4dPack({
        argv: [pack, "--sig", sig, "--pubkey", join(tmp, "signer.pub"), "--results", results],
      }),
      0
    );
    const verified = JSON.parse(await readFile(results, "utf8"));
    assert.equal(verified.ok, true);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("stage4d CLIs expose stable setup failures", async () => {
  await assert.rejects(
    () => buildStage4dPack({ argv: [] }),
    /usage: build-stage4d-pack --run-record <json> --out <pack> --sig <sig>/
  );
  await assert.rejects(
    () => verifyStage4dPack({ argv: [] }),
    /usage: verify-stage4d-pack <pack> --sig <sig> --pubkey <pubkey>/
  );

  const tmp = await mkdtemp(join(tmpdir(), "stage4d-cli-failure-test-"));
  try {
    const results = join(tmp, "verify-results.json");
    const exitCode = await writeEnvironmentFailure({
      argv: [join(tmp, "missing-pack.json"), "--results", results],
      error: new Error("synthetic setup failure"),
    });
    assert.equal(exitCode, 2);
    const failure = JSON.parse(await readFile(results, "utf8"));
    assert.equal(failure.first_failure.reason, "environment_setup_error");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
