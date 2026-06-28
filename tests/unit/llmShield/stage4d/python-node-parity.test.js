// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("full Python stage4d fixture builds and verifies in Node", () => {
  const root = process.cwd();
  const dir = mkdtempSync(join(tmpdir(), "stage4d-parity-"));
  const runRecord = join(dir, "run-record.json");
  const pack = join(dir, "evidence-pack.json");
  const sig = join(dir, "evidence-pack.sig");
  const results = join(dir, "verify-results.json");
  const env = {
    ...process.env,
    SIMURGH_4D_PRIVATE_KEY_PATH: join(
      root,
      "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
    ),
  };
  execFileSync(
    "python3",
    [
      "-m",
      "stage4d.run_fixture",
      "--fixture",
      "stage4d/fixtures/browser_inject_01.json",
      "--out",
      runRecord,
    ],
    { cwd: join(root, "tools/agentdojo-simurgh-adapter"), env, stdio: "pipe" }
  );
  execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs",
      "--run-record",
      runRecord,
      "--out",
      pack,
      "--sig",
      sig,
    ],
    { cwd: root, env, stdio: "pipe" }
  );
  execFileSync(
    "node",
    [
      "tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs",
      pack,
      "--sig",
      sig,
      "--pubkey",
      join(dir, "signer.pub"),
      "--results",
      results,
    ],
    { cwd: root, env: { ...env, SIMURGH_VERIFY_NETWORK_DISABLED: "1" }, stdio: "pipe" }
  );
  assert.equal(JSON.parse(readFileSync(results, "utf8")).ok, true);
});
