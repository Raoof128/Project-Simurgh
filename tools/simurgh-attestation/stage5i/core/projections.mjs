// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC projections (BEAST B/C). Reported derivations over R_eligible, NOT gates.
// B: coverage_depth — per-section reviewer multiplicity + the single-reviewer fragility set.
// C: section_states — covered / assigned_only (granted, no receipt) / unassigned (no grant).

export function coverageDepth(ctx) {
  const per_section = {};
  for (const s of ctx.S) per_section[s] = 0;
  for (const { receipt } of ctx.R_eligible)
    for (const s of receipt.content.evaluated_sections) per_section[s] += 1;
  const depths = Object.values(per_section);
  const min_depth = depths.length ? Math.min(...depths) : 0;
  const single_reviewer_sections = Object.keys(per_section)
    .filter((s) => per_section[s] === 1)
    .sort();
  return { per_section, min_depth, single_reviewer_sections };
}

export function sectionStates(ctx) {
  const granted = new Set();
  for (const g of ctx.bundle.access_grants)
    for (const s of g.content.granted_sections) granted.add(s);
  const evaluated = new Set();
  for (const { receipt } of ctx.R_eligible)
    for (const s of receipt.content.evaluated_sections) evaluated.add(s);
  const covered = [];
  const assigned_only = [];
  const unassigned = [];
  for (const s of ctx.S) {
    if (evaluated.has(s)) covered.push(s);
    else if (granted.has(s)) assigned_only.push(s);
    else unassigned.push(s);
  }
  return {
    covered: covered.sort(),
    assigned_only: assigned_only.sort(),
    unassigned: unassigned.sort(),
  };
}
