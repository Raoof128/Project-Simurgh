// SPDX-License-Identifier: AGPL-3.0-or-later
export const FRONTIER_DOMAIN = "SIMURGH_FRONTIER_V1";

export const FAILURE_REASONS = Object.freeze({
  suite_hash_mismatch: "suite_hash_mismatch",
  grid_hash_mismatch: "grid_hash_mismatch",
  missing_cell: "missing_cell",
  extra_cell: "extra_cell",
  duplicate_cell: "duplicate_cell",
  cell_binding_mismatch: "cell_binding_mismatch",
  policy_bundle_hash_mismatch: "policy_bundle_hash_mismatch",
  pack_verify_failed: "pack_verify_failed",
  metric_digest_mismatch: "metric_digest_mismatch",
  frontier_hash_mismatch: "frontier_hash_mismatch",
  frontier_signature_invalid: "frontier_signature_invalid",
  fixture_hash_mismatch: "fixture_hash_mismatch",
  fixture_path_escape: "fixture_path_escape",
  missing_fixture: "missing_fixture",
  unexpected_exclusion_reason: "unexpected_exclusion_reason",
  network_required_error: "network_required_error",
  privacy_leak_detected: "privacy_leak_detected",
  golden_mismatch: "golden_mismatch",
});

export const STAGE4F_VERSIONS = Object.freeze({
  cellManifest: "simurgh.stage4f.cell_manifest.v1",
  grid: "simurgh.stage4f.grid.v1",
  suiteManifest: "simurgh.stage4f.suite_manifest.v1",
  verifyFrontier: "simurgh.stage4f.verify_frontier.v1",
});
