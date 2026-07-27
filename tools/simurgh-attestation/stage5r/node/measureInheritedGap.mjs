// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 3 (gate G0): recompute the spec's published measurements and check the document.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/measureInheritedGap.mjs [--output <path>]
//
// With no --output the artefact is written to its committed location. With --output it is written
// where told, which is how the build-twice ceremony compares two independent builds before comparing
// either against the committed copy.
//
// Exit codes: 0 recomputed and the spec agrees; 1 a claim disagrees or is missing; 2 evidence or spec
// unreadable.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { measure, checkSpecClaims } from "../core/measurements.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const EVIDENCE = join(REPO, "docs/research/llm-shield/evidence/stage-5q");
const SPEC = join(
  REPO,
  "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md"
);
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/measurements/inherited-gap.json"
);

/**
 * @param {string[]} argv
 * @returns {{output: string}}
 */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? DEFAULT_OUT : argv[i + 1] };
}

/**
 * Build the artefact. Deterministic by construction: it holds no timestamp, no path and no runtime
 * detail, because a "measurement" that changes when the clock does is not a measurement.
 *
 * @returns {{artifact: object, claims: object}}
 */
export function build() {
  const load = (p) => JSON.parse(readFileSync(join(EVIDENCE, p), "utf8"));
  const m = measure({
    closure: load("closure/function-closure.json"),
    matrix: load("closure/obligation-matrix.json"),
    receipts: load("mutation/receipts.json"),
  });
  const claims = checkSpecClaims(readFileSync(SPEC, "utf8"), m);
  return {
    artifact: {
      schema: "simurgh.vpf.inherited-gap.v1",
      note:
        "Gate G0. Every figure the 5R spec publishes about the inherited mutation evidence, " +
        "recomputed from the committed 5Q closure, obligation matrix and mutation receipts. " +
        "Percentages are integer round-half-up in tenths of a percent.",
      measurements: m,
      spec_claim_check: { ok: claims.ok, results: claims.results },
    },
    claims,
  };
}

/**
 * @param {string[]} argv
 * @returns {number} exit code
 */
export function main(argv) {
  const { output } = parseArgs(argv);
  let built;
  try {
    built = build();
  } catch (err) {
    process.stderr.write(`MEASUREMENT FAILED: ${err.message}\n`);
    return 2;
  }
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(built.artifact)}\n`, "utf8");

  const m = built.artifact.measurements;
  const lines = [
    `wrote ${output}`,
    "",
    `  member_count                 ${m.member_count} over ${m.populated_roles} populated roles`,
    `  obligated cells              ${m.obligated_cells} = ${m.under_supported_cells} under-supported + ${m.attacked_cells} attacked`,
    `  mutation-tested area         ${m.mutation_tested_cells} of ${m.discharged_class_cells} = ${(m.mutation_tested_tenths / 10).toFixed(1)}%`,
    `  receipts on omitted cells    ${m.receipts_on_omitted}`,
    `  roles reached (any mutant)   ${m.roles_reached_any.length}: ${m.roles_reached_any.join(", ")}`,
    `  roles reached (discharged)   ${m.roles_reached_discharged.length}: ${m.roles_reached_discharged.join(", ")}`,
    `  unreached roles              ${Object.keys(m.unreached_roles).length} roles, ${m.unreached_members} members, ${m.unreached_obligations_discharged} of ${m.unreached_obligations} obligations discharged elsewhere`,
    `  family universe              ${m.family_universe_pairs} pairs over ${m.family_universe_roles.length} roles`,
    "",
  ];
  if (!built.claims.ok) {
    process.stdout.write(`${lines.join("\n")}\n`);
    process.stderr.write(`G0 FAILED — the spec disagrees with the evidence:\n`);
    for (const f of built.claims.failures) process.stderr.write(`  [${f.id}] ${f.reason}\n`);
    return 1;
  }
  lines.push(`  G0: ${built.claims.results.length} labelled claims checked, all agree`);
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
