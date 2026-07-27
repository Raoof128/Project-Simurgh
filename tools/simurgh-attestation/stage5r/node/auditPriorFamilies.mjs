// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 21: write the prior-family audit.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/auditPriorFamilies.mjs [--output <path>]
//
// 5Q's pack results are read as prior art and never imported: §2.4 forbids importing a stage5{a..q}
// module in the primary worktree, and this reads JSON the predecessor signed.
//
// The REVALIDATION audit — can newly built 5R triads reproduce or refute the six prior conclusions —
// is the question whose answer is not known in advance. It costs eighteen further controls and is out
// of scope for this release, named here so its absence is a decision rather than an omission.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { auditFamily } from "../core/priorAudit.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PACKS = "docs/research/llm-shield/evidence/stage-5q/packs/all-pack-results.json";
const CLOSURE = "docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json";
export const AUDIT_PATH = "docs/research/llm-shield/evidence/stage-5r/audit/prior-families.json";

/** The six families §7.3 names, in §7.3's order. */
export const EXPECTED_FAMILIES = Object.freeze([
  "frozen-constant",
  "argument-aliasing",
  "prototype-pollution",
  "determinism",
  "pathological-operand",
  "fail-open",
]);

/**
 * Build the audit artefact from the inherited evidence.
 *
 * @param {string} root
 * @returns {string} exact bytes, newline-terminated
 */
export function buildAudit(root) {
  const packs = JSON.parse(readFileSync(join(root, PACKS), "utf8"));
  const closure = JSON.parse(readFileSync(join(root, CLOSURE), "utf8"));
  const roleOf = new Map(closure.members.map((m) => [m.function_id, m.security_role]));
  const closureIds = new Set(closure.members.map((m) => m.function_id));

  const found = packs.families.map((f) => f.family_id);
  if (JSON.stringify(found) !== JSON.stringify([...EXPECTED_FAMILIES])) {
    throw new Error(
      `prior audit: the inherited artefact names ${found.join(", ")}, not §7.3's six in order`
    );
  }
  // Named rather than assumed: this artefact carries no restoration receipt, and the audit says so
  // per family rather than quietly scoring the condition as failed.
  const artefactHasRestorationReceipt = Object.keys(packs).some((k) =>
    /worktree|restoration|restored/i.test(k)
  );

  const families = packs.families.map((family) =>
    auditFamily({
      family,
      discharges: packs.discharges,
      roleOf,
      closureIds,
      artefactHasRestorationReceipt,
    })
  );

  const artefact = {
    schema: "simurgh.vpf.prior-family-audit.v1",
    note:
      "Task 21 / spec §7.3. Six signed 5Q families, judged against 5R's §4.1 contract, which did " +
      "not exist when they were built. The answer was knowable in advance — the mandatory triad is " +
      "absent — so NO SCORE MOVES ON THIS AUDIT: attaching a score to a predetermined result is the " +
      "outcome-shopping this stage exists to catch. What is computed rather than asserted is which " +
      "conditions hold: premise recomputation and closure binding are properties of the signed data, " +
      "and both are derived from it here.",
    judged_against: "5R §4.1, the seven admissibility conditions",
    they_were_admitted_under: "5Q Law 4, one mutation receipt per attack class",
    nothing_is_withdrawn:
      "5Q's 1 438 discharged cells stand. L5 forbids rewriting a frozen record and this audit " +
      "rewrites none. It records what a later contract would say about an earlier artefact.",
    revalidation_is_out_of_scope:
      "Whether newly built 5R triads REPRODUCE or REFUTE the six prior conclusions is the question " +
      "with an uncertain answer. It costs eighteen further controls and is deferred, named so its " +
      "absence is a decision rather than an omission.",
    family_count: families.length,
    inadmissible_under_5r: families.filter((f) => !f.admissible_under_5r).length,
    families,
  };
  return `${canonicalJson(artefact)}\n`;
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? join(REPO, AUDIT_PATH) : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  const bytes = buildAudit(REPO);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes, "utf8");
  const artefact = JSON.parse(bytes);
  const lines = [`wrote ${output}`, ""];
  for (const f of artefact.families) {
    lines.push(
      `  ${f.audited_family_id.padEnd(21)} ${f.attack_class.padEnd(4)} ` +
        `${f.admissible_under_5r ? "admissible" : "INADMISSIBLE"}  ` +
        `${f.discharges_examined} discharges, ${f.roles_spanned.length} role(s)`
    );
    lines.push(`      fails: ${f.failing_conditions.join(", ")}`);
  }
  lines.push(
    "",
    `  ${artefact.inadmissible_under_5r} of ${artefact.family_count} inadmissible under §4.1`
  );
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
