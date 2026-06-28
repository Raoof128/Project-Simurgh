// SPDX-License-Identifier: AGPL-3.0-or-later
import { canonicalHash } from "./canonical.mjs";
import { STAGE4F_VERSIONS } from "./constants.mjs";

export function cellId({ point_id, scenario_id, suite_hash, grid_hash, policy_bundle_hash }) {
  return canonicalHash({ point_id, scenario_id, suite_hash, grid_hash, policy_bundle_hash });
}

export function buildCellManifest(input) {
  return {
    manifest_version: STAGE4F_VERSIONS.cellManifest,
    cell_id: input.cell_id,
    point_id: input.point_id,
    scenario_id: input.scenario_id,
    suite_hash: input.suite_hash,
    grid_hash: input.grid_hash,
    policy_bundle_hash: input.policy_bundle_hash,
    evidence_pack_hash: input.evidence_pack_hash,
    evidence_pack_sig_hash: input.evidence_pack_sig_hash,
    utility_observation_hash: input.utility_observation_hash,
  };
}

export function compareCellSets(expected, sealed) {
  const expectedSet = new Set(expected);
  const sealedSet = new Set(sealed);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of sealed) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  const missing = [...expectedSet].filter((id) => !sealedSet.has(id)).sort();
  const extra = [...sealedSet].filter((id) => !expectedSet.has(id)).sort();
  const duplicate = [...duplicates].sort();
  return {
    ok: missing.length === 0 && extra.length === 0 && duplicate.length === 0,
    expected_cell_ids: [...expected].sort(),
    sealed_cell_ids: [...sealed].sort(),
    missing_cell_ids: missing,
    extra_cell_ids: extra,
    duplicate_cell_ids: duplicate,
  };
}

export function buildCellSetManifest({
  suite_hash,
  grid_hash,
  expected_cell_ids,
  sealed_cell_ids,
}) {
  return {
    manifest_version: "simurgh.stage4f.cell_set_manifest.v1",
    suite_hash,
    grid_hash,
    ...compareCellSets(expected_cell_ids, sealed_cell_ids),
  };
}
