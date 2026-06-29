// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildStage4gDemo } from "../../../../tools/simurgh-attestation/stage4g/demoCampaign.mjs";

test("Stage 4G demo writes clean, red-arm, boundary, and report artifacts", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "simurgh-stage4g-demo-"));
  const result = await buildStage4gDemo({ outDir });
  assert.equal(result.clean.ok, true);
  assert.equal(result.red_arms.missing_attempt.first_failure.reason, "missing_attempt");
  assert.equal(result.red_arms.class_relabel.first_failure.reason, "class_mismatch");
  assert.equal(result.red_arms.privacy_leak.first_failure.reason, "privacy_leak_detected");
  assert.equal(result.boundary.class_iv_recorded.verdict, "escaped");
  const readme = await readFile(join(outDir, "README.md"), "utf8");
  assert.match(readme, /within the canonical precommitted campaign for this build configuration/);
  const report = JSON.parse(await readFile(join(outDir, "reports", "stage4g-report.json"), "utf8"));
  assert.equal(report.campaign_verified, true);
  assert.equal(report.security_escapes > 0, true);
});
