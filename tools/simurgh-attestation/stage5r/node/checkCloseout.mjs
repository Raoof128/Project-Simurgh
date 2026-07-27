// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 27: machine-check the closeout PROSE against the ledgers.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/checkCloseout.mjs [--file <path>]
//
// Task 23 builds the disclosure and Task 26 proves G9 can fire. Neither checked that the closeout
// COPIED IT CORRECTLY — and a transcription error in the one document most people read is the
// cheapest way for a stage to end up claiming something its evidence does not say.
//
// It runs against the closeout AND against the release body, because the release body is public 5R
// prose and letting it bypass the document gates would leave an escape hatch in the last metre.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const CLOSEOUT = "docs/research/llm-shield/STAGE_5R_CLOSEOUT.md";

/** Numbers are compared with the spec's separators normalised: `15 301` and `15301` are one token. */
const normalise = (text) => String(text).replace(/(\d)[  ,](?=\d)/g, "$1");

/**
 * Check a document against the built ledgers.
 *
 * @param {{text: string, delta: object, findings: object}} input
 * @returns {{ok: boolean, problems: string[], checks: number}}
 */
export function checkDocument({ text, delta, findings }) {
  const doc = normalise(text);
  const problems = [];
  let checks = 0;
  const must = (label, needle) => {
    checks += 1;
    if (!doc.includes(normalise(needle))) problems.push(`${label}: missing "${needle}"`);
  };

  const d = delta.four_term_disclosure;
  const census = delta.family_result_census.by_terminal_state;

  // All four family terms, and all three cell denominators.
  must("families admissible", String(d.families.admissible));
  must("families attempted", String(d.families.attempted));
  must("families not attempted", String(census.not_attempted_in_this_tranche));
  must("universe", String(d.families.universe));
  must("newly discharged", String(d.cells.newly_discharged));
  must("under-supported", String(d.cells.under_supported));
  must("inherited", String(d.cells.inherited));

  // The cumulative arithmetic, both figures, in the one relationship §6.1 fixes.
  must("5Q original coverage", `${delta.q0_original_coverage_percent}%`);
  must("5Q discharged", String(delta.q0_original_discharged));
  must("5R cumulative", `${delta.cumulative_5r_coverage_percent}%`);
  must("the cumulative label", "5R cumulative");

  // The unprobed census, by closed-vocabulary reason, with its counts.
  for (const [reason, count] of Object.entries(delta.unprobed_by_reason)) {
    must(`unprobed ${reason}`, reason);
    must(`unprobed ${reason} count`, String(count));
  }
  for (const [reason, count] of Object.entries(delta.probed_not_discharged_by_reason)) {
    must(`not-discharged ${reason}`, reason);
    must(`not-discharged ${reason} count`, String(count));
  }

  // The standing declarations, each of which an editor could drop without noticing.
  must("orchestration exclusion", "orchestration");
  must("Ruling 2", "Ruling 2");
  must("universe adapter", "unbuilt");
  must("open sockets", "I7 and I8 remain OPEN");

  // §13's non-claims, by their load-bearing clauses rather than by a count.
  const nonClaims = [
    "not proof that Stage 5 has no vulnerabilities",
    "not a repair of Stage 5Q",
    "not exhaustive over all possible attacks",
    "not a claim that an admissible family makes its class safe",
    "reads nothing else",
    "only over the inherited closure",
    "the red team and the blue team remain the same party",
    "zero discovered findings is not itself a security result",
  ];
  for (const clause of nonClaims) {
    checks += 1;
    if (!doc.replace(/\*\*/g, "").includes(clause)) problems.push(`non-claim missing: "${clause}"`);
  }

  // The findings, by id, so a record cannot be dropped from the prose while staying in the ledger.
  must("opening finding", findings.opening_finding.finding_id);
  for (const r of findings.records) {
    checks += 1;
    const shown = doc.includes(r.finding_id) || doc.includes(`${r.finding_id.slice(0, 7)}`);
    if (!shown) problems.push(`finding ${r.finding_id} is in the ledger and not in the document`);
  }
  checks += 1;
  if (!doc.includes(String(findings.findings_against_self))) {
    problems.push("the count of findings against 5R itself is not stated");
  }

  return { ok: problems.length === 0, problems, checks };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const i = argv.indexOf("--file");
  const file = i === -1 ? join(REPO, CLOSEOUT) : argv[i + 1];
  if (!existsSync(file)) {
    process.stderr.write(`checkCloseout: ${file} does not exist\n`);
    return 1;
  }
  const delta = JSON.parse(
    readFileSync(
      join(REPO, "docs/research/llm-shield/evidence/stage-5r/ledgers/delta-ledger.json"),
      "utf8"
    )
  );
  const findings = JSON.parse(
    readFileSync(
      join(REPO, "docs/research/llm-shield/evidence/stage-5r/ledgers/finding-ledger.json"),
      "utf8"
    )
  );
  const r = checkDocument({ text: readFileSync(file, "utf8"), delta, findings });
  process.stdout.write(
    [
      `checked ${file}`,
      `  ${r.checks} assertions against the built ledgers`,
      ...r.problems.map((p) => `  PROBLEM ${p}`),
      r.ok ? "OK: the prose says what the evidence says" : "REFUSED",
      "",
    ].join("\n")
  );
  return r.ok ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
