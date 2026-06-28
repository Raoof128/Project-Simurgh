// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildStage4fDemo } from "../../../../tools/simurgh-attestation/stage4f/stage4fDemo.mjs";

test("stage4f canary emits clean verified frontier and red arms", async () => {
  const tmp = await mkdtemp(join(tmpdir(), "stage4f-demo-test-"));
  try {
    const result = await buildStage4fDemo({
      suiteId: "suite_canary_v1",
      outDir: tmp,
      privateKeyPath: "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem",
      fixtureRoot: "docs/research/llm-shield/evidence/stage-3f/fixtures",
    });
    assert.equal(result.clean["verify-frontier-results.json"].ok, true);
    assert.equal(result.clean["cell-set-manifest.json"].missing_cell_ids.length, 0);
    assert.equal(result.clean["cell-set-manifest.json"].extra_cell_ids.length, 0);
    assert.equal(result.clean["cell-set-manifest.json"].duplicate_cell_ids.length, 0);
    assert.equal(result.redArms["arm-b-lying-decision/verify-frontier-results.json"].ok, false);
    assert.equal(
      result.redArms["arm-b-lying-decision/verify-frontier-results.json"].first_failure.reason,
      "replayed_decision_mismatch"
    );
    assert.equal(
      result.redArms["arm-c-dropped-scenario/verify-frontier-results.json"].first_failure.reason,
      "missing_cell"
    );
    assert.equal(result.redArms["arm-d-byte-tamper/verify-frontier-results.json"].ok, false);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
