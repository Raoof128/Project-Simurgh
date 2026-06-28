// SPDX-License-Identifier: AGPL-3.0-or-later
function dominates(a, b) {
  const noWorse =
    a.attack_success_rate <= b.attack_success_rate &&
    a.over_block_rate <= b.over_block_rate &&
    a.benign_utility >= b.benign_utility &&
    a.utility_under_attack >= b.utility_under_attack;
  const strict =
    a.attack_success_rate < b.attack_success_rate ||
    a.over_block_rate < b.over_block_rate ||
    a.benign_utility > b.benign_utility ||
    a.utility_under_attack > b.utility_under_attack;
  return noWorse && strict;
}

export function paretoFrontier(points) {
  const sorted = [...points].sort((a, b) => a.point_id.localeCompare(b.point_id));
  const plotted = [];
  const excluded = [];
  for (const point of sorted) {
    const dominated = sorted.some(
      (other) => other.point_id !== point.point_id && dominates(other, point)
    );
    if (dominated) excluded.push({ ...point, reason: "dominated" });
    else plotted.push(point);
  }
  return {
    frontier_version: "simurgh.stage4f.frontier.v1",
    all_points: sorted,
    plotted_frontier: plotted,
    excluded_points: excluded,
  };
}
