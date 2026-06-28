// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildStage4fDemo } from "../../../../tools/simurgh-attestation/stage4f/stage4fDemo.mjs";
import { verifyFrontier } from "../../../../tools/simurgh-attestation/stage4f/verifyFrontier.mjs";

test("verify-frontier trusts external suite, grid, and pubkey", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "stage4f-verify-test-"));
  try {
    await buildStage4fDemo({
      suiteId: "suite_canary_v1",
      outDir: tmp,
      privateKeyPath: "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem",
      fixtureRoot: "docs/research/llm-shield/evidence/stage-3f/fixtures",
    });
    const result = await verifyFrontier({
      evidenceDir: join(tmp, "clean"),
      suitePath: join(tmp, "clean", "suite-manifest.json"),
      gridPath: join(tmp, "clean", "grid.json"),
      pubkeyPath: join(tmp, "clean", "signer.pub"),
    });
    assert.equal(result.ok, true);
    assert.equal(result.exit_code, 0);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
