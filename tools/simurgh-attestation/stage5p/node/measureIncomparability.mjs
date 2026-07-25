#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — invention E: the incomparability census.
//
// Publishes, as generator-derived exact integers, how much of the strength-vector space is
// incomparable under the product order. The point of the number: it is the measure of what a
// scalar score would DESTROY. Every incomparable pair is a pair some total order would have to
// launder into a ranking.
//
// Anti-gaming non-claim, owned here: incomparability density is NOT a security score. The census
// therefore publishes exact integers only — never a ratio, which would invite ranking.
import { AXIS_VALUES, makeStrength, compareStrength } from "../core/identityLattice.mjs";

export function measureIncomparability() {
  const all = [];
  for (const binding of AXIS_VALUES.binding)
    for (const resolution of AXIS_VALUES.resolution)
      for (const continuity of AXIS_VALUES.continuity)
        for (const role of AXIS_VALUES.role)
          all.push(makeStrength({ binding, resolution, continuity, role }));

  const by_relation = { equal: 0, strictly_below: 0, strictly_above: 0, incomparable: 0 };
  for (const a of all) for (const b of all) by_relation[compareStrength(a, b)] += 1;

  return {
    census_id: "simurgh.vsi.incomparability_census.v1",
    vector_count: all.length,
    ordered_pairs: all.length * all.length,
    by_relation,
    incomparable_ordered_pairs: by_relation.incomparable,
    incomparable_unordered_pairs: by_relation.incomparable / 2,
    non_claim: "incomparability_density_is_not_a_security_score",
  };
}

import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.stdout.write(JSON.stringify(measureIncomparability(), null, 2) + "\n");
}
