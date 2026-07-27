// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 4: emit the family universe from §5.4's frozen rule.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildFamilyUniverse.mjs [--output <path>]
//
// The spec freezes the RULE and this emits the MEMBERSHIP — immutable rule in the document, mutable
// state in a generated ledger. Deterministic: no timestamp, no path, no runtime detail.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildUniverse, reachableArchetypes, A8_IS_AN_EXTENSION } from "../core/archetypes.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const EVIDENCE = join(REPO, "docs/research/llm-shield/evidence/stage-5q");
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/universe/family-universe.json"
);

/** @param {string[]} argv @returns {{output: string}} */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? DEFAULT_OUT : argv[i + 1] };
}

/** @returns {object} the universe artefact */
export function build() {
  const load = (p) => JSON.parse(readFileSync(join(EVIDENCE, p), "utf8"));
  const u = buildUniverse({
    closure: load("closure/function-closure.json"),
    matrix: load("closure/obligation-matrix.json"),
  });
  return {
    schema: "simurgh.vpf.family-universe.v1",
    note:
      "Spec §5.4 freezes the rule; this file is the membership it produces. The pairs " +
      "(attack_class, target_security_role) generating at least one obligated cell in the inherited " +
      "obligation matrix, restricted to the eleven under-supported classes.",
    a8_is_an_extension_to_the_ruling: A8_IS_AN_EXTENSION,
    pair_count: u.pairs.length,
    control_count_at_full_scope: u.pairs.length * 3,
    spanned_cells: u.pairs.reduce((a, p) => a + p.inherited_5q_obligation_cells, 0),
    reachable_roles: u.roles,
    reachable_archetypes: reachableArchetypes(u.pairs),
    unreachable_roles: u.unreachable_roles,
    pairs: u.pairs,
  };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  let artifact;
  try {
    artifact = build();
  } catch (err) {
    process.stderr.write(`UNIVERSE BUILD FAILED: ${err.message}\n`);
    return 2;
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(artifact)}\n`, "utf8");
  const unreachable = artifact.unreachable_roles.map((u) => u.role).join(", ") || "none";
  process.stdout.write(
    [
      `wrote ${output}`,
      `  ${artifact.pair_count} pairs · ${artifact.control_count_at_full_scope} controls at full scope`,
      `  ${artifact.spanned_cells} inherited cells over ${artifact.reachable_roles.length} roles`,
      `  archetypes reachable: ${artifact.reachable_archetypes.join(", ")}`,
      `  roles carrying an archetype but UNREACHABLE here: ${unreachable}`,
      "",
    ].join("\n")
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
