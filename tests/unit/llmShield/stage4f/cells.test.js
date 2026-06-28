// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_GRID, expandGrid, gridHash } from "../../../../tools/simurgh-attestation/stage4f/grid.mjs";
import {
  buildCellManifest,
  cellId,
  compareCellSets,
} from "../../../../tools/simurgh-attestation/stage4f/cells.mjs";

test("grid expands to complete deterministic policy bundles", () => {
  const expanded = expandGrid(DEFAULT_GRID);
  assert.deepEqual(
    expanded.map((point) => point.point_id),
    ["P0", "P2", "P4"]
  );
  for (const point of expanded) {
    assert.equal(typeof point.policy_bundle.policy_mode, "string");
    assert.equal(typeof point.policy_bundle.context_provenance_strictness, "number");
    assert.equal(typeof point.policy_bundle.tool_authorization_strictness, "number");
    assert.equal(typeof point.policy_bundle.taint_propagation_aggressiveness, "number");
    assert.equal(typeof point.policy_bundle.egress_allowlist_breadth, "number");
  }
  assert.match(gridHash(expanded), /^sha256:[0-9a-f]{64}$/);
});

test("cell ids and manifests bind suite, grid, policy, pack, signature, and utility", () => {
  const id = cellId({
    point_id: "P2",
    scenario_id: "benign/stage3f-benign-001",
    suite_hash: `sha256:${"a".repeat(64)}`,
    grid_hash: `sha256:${"b".repeat(64)}`,
    policy_bundle_hash: `sha256:${"c".repeat(64)}`,
  });
  const manifest = buildCellManifest({
    cell_id: id,
    point_id: "P2",
    scenario_id: "benign/stage3f-benign-001",
    suite_hash: `sha256:${"a".repeat(64)}`,
    grid_hash: `sha256:${"b".repeat(64)}`,
    policy_bundle_hash: `sha256:${"c".repeat(64)}`,
    evidence_pack_hash: `sha256:${"d".repeat(64)}`,
    evidence_pack_sig_hash: `sha256:${"e".repeat(64)}`,
    utility_observation_hash: `sha256:${"f".repeat(64)}`,
  });
  assert.equal(manifest.manifest_version, "simurgh.stage4f.cell_manifest.v1");
  assert.equal(manifest.cell_id, id);
});

test("cell-set comparison detects missing, extra, and duplicate cells", () => {
  const result = compareCellSets(["a", "b"], ["a", "a", "c"]);
  assert.deepEqual(result.missing_cell_ids, ["b"]);
  assert.deepEqual(result.extra_cell_ids, ["c"]);
  assert.deepEqual(result.duplicate_cell_ids, ["a"]);
  assert.equal(result.ok, false);
});
