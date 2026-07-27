// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 5: emit the precommitted first tranche.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildTranche.mjs [--output <path>]
//
// RULING 4: T1 is IMMUTABLE for this release. It is fixed here, before any family is built, because
// "the tranche may grow" is a cherry-picking route — keep adding families until the headline improves.
// A family attempted and failed is published as attempted_inadmissible; the only forbidden state is
// attempted-and-absent.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import {
  buildUniverse,
  buildTranche,
  reachableArchetypes,
  THINNEST_FIRST,
} from "../core/archetypes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const EVIDENCE = join(REPO, "docs/research/llm-shield/evidence/stage-5q");
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/universe/tranche-t1.json"
);

/** @param {string[]} argv @returns {{output: string}} */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? DEFAULT_OUT : argv[i + 1] };
}

/** @returns {object} the tranche artefact */
export function build() {
  const load = (p) => JSON.parse(readFileSync(join(EVIDENCE, p), "utf8"));
  const { pairs } = buildUniverse({
    closure: load("closure/function-closure.json"),
    matrix: load("closure/obligation-matrix.json"),
  });
  const t = buildTranche(pairs);
  return {
    schema: "simurgh.vpf.tranche.v1",
    tranche_id: "T1",
    immutable_for_this_release: true,
    note:
      "Plan §4. The floor of spec §11.5: one family per role archetype an under-supported class " +
      "obligates. Fixed before any family exists. It may not be swapped; a family attempted and " +
      "failed is published as attempted_inadmissible.",
    selection_rule:
      "Attack where the predecessor's evidence is thinnest first: the reachable roles no mutant " +
      "ever touched lead, then one pair per remaining archetype taking the class carrying the " +
      "largest obligation in that role.",
    roles_with_no_mutation_evidence: THINNEST_FIRST,
    family_count: t.families.length,
    control_count: t.families.length * 3,
    spanned_cells: t.spanned_cells,
    spanned_cells_are_not_the_delta:
      "Ruling 1: a family discharges the cells its probe actually reached, never the size of its pair.",
    universe_pair_count: pairs.length,
    archetypes_covered: t.archetypes,
    archetypes_reachable: reachableArchetypes(pairs),
    families: t.families,
  };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  let artifact;
  try {
    artifact = build();
  } catch (err) {
    process.stderr.write(`TRANCHE BUILD FAILED: ${err.message}\n`);
    return 2;
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(artifact)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${output}`,
      `  T1: ${artifact.family_count} families · ${artifact.control_count} controls`,
      `  spans ${artifact.spanned_cells} of 15301 under-supported cells (the SPAN, not the delta)`,
      `  archetypes ${artifact.archetypes_covered.join(", ")} — the full reachable set`,
      "",
    ].join("\n")
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
