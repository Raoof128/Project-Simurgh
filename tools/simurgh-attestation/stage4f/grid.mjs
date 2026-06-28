// SPDX-License-Identifier: AGPL-3.0-or-later
import { canonicalHash } from "./canonical.mjs";
import { STAGE4F_VERSIONS } from "./constants.mjs";

export const DEFAULT_GRID = Object.freeze({
  grid_version: STAGE4F_VERSIONS.grid,
  points: [
    {
      point_id: "P0",
      policy_mode: "permissive",
      context_provenance_strictness: 0,
      tool_authorization_strictness: 0,
      taint_propagation_aggressiveness: 0,
      egress_allowlist_breadth: 3,
    },
    {
      point_id: "P2",
      policy_mode: "balanced",
      context_provenance_strictness: 2,
      tool_authorization_strictness: 2,
      taint_propagation_aggressiveness: 2,
      egress_allowlist_breadth: 2,
    },
    {
      point_id: "P4",
      policy_mode: "strict",
      context_provenance_strictness: 4,
      tool_authorization_strictness: 4,
      taint_propagation_aggressiveness: 4,
      egress_allowlist_breadth: 1,
    },
  ],
});

export function expandGrid(grid = DEFAULT_GRID) {
  return grid.points
    .map((point) => ({
      point_id: point.point_id,
      policy_bundle: {
        policy_version: "policy.v1",
        policy_mode: point.policy_mode,
        context_provenance_strictness: point.context_provenance_strictness,
        tool_authorization_strictness: point.tool_authorization_strictness,
        taint_propagation_aggressiveness: point.taint_propagation_aggressiveness,
        egress_allowlist_breadth: point.egress_allowlist_breadth,
      },
    }))
    .sort((a, b) => a.point_id.localeCompare(b.point_id));
}

export function gridDocument(grid = DEFAULT_GRID) {
  return {
    grid_version: grid.grid_version,
    points: expandGrid(grid),
  };
}

export function gridHash(expandedGrid) {
  return canonicalHash({ grid_version: DEFAULT_GRID.grid_version, points: expandedGrid });
}
