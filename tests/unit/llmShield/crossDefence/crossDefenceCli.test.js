// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANNED_TARGET_IDS,
  runTarget,
  buildTargetAttestation,
  buildEvidence,
} from "../../../../tools/simurgh-benchmark/simurgh-crossdefence.mjs";
import { buildMatrixCorpus } from "../../../../tools/simurgh-benchmark/crossDefenceMatrix.mjs";
import fullGateway from "../../../../tools/simurgh-benchmark/cross-defence-targets/full-gateway-target.mjs";
import { validateTargetAttestation } from "../../../../tools/simurgh-benchmark/crossDefenceLib.mjs";
import { checkSilentDrop } from "../../../../tools/simurgh-benchmark/crossDefenceCatalogue.mjs";

test("runTarget produces a coverage profile", async () => {
  const { coverage } = await runTarget(fullGateway, buildMatrixCorpus());
  assert.ok(Object.values(coverage.cells).every((c) => c.result === "contained"));
});

test("buildTargetAttestation yields a valid, non-overclaiming bundle", async () => {
  const { coverage } = await runTarget(fullGateway, buildMatrixCorpus());
  const att = buildTargetAttestation({
    target: {
      target_id: "full-gateway-target",
      display_name: "Full Gateway Target",
      provenance: "reference_replica",
      execution_trust: "project_generated",
      real_product_claimed: false,
      brand_reference_allowed: false,
    },
    corpusDigest: "sha256:CORPUS",
    coverage,
  });
  assert.equal(validateTargetAttestation(att).ok, true);
  assert.equal(att.coverage_profile.numeric_summary_exported, false);
});

test("buildEvidence covers all planned targets, no silent drop, self-proof all fire", async () => {
  const ev = await buildEvidence();
  assert.equal(checkSilentDrop(ev.catalogue, PLANNED_TARGET_IDS), null);
  for (const id of PLANNED_TARGET_IDS) assert.ok(ev.targetAttestations[id], `missing ${id}`);
  assert.ok(ev.selfProof.summary.all_expected_rejections_fired);
  assert.ok(ev.selfProof.summary.clean_baseline_passed);
});
