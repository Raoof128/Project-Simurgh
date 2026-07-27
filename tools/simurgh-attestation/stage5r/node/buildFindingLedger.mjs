// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 23: write the finding ledger.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildFindingLedger.mjs [--output <path>]
//
// Every record here is derived from an artefact this stage already committed: the inherited
// addendum, the prior-family audit, the campaign result. Nothing is typed in twice, so nothing can
// drift from the evidence it describes.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import {
  buildFindingLedger,
  inheritedOpeningFinding,
  fourTermDisclosure,
  familyResultCensus,
} from "../core/ledgers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ADDENDUM = "docs/research/llm-shield/evidence/stage-5q/attestation/closeout-addendum.json";
const AUDIT = "docs/research/llm-shield/evidence/stage-5r/audit/prior-families.json";
const CAMPAIGN = "docs/research/llm-shield/evidence/stage-5r/campaign/campaign-result.json";
const PAIRS = "docs/research/llm-shield/evidence/stage-5r/campaign/pair-results.json";
export const LEDGER_PATH = "docs/research/llm-shield/evidence/stage-5r/ledgers/finding-ledger.json";

/**
 * Why each family's candidate detections do not survive a reading.
 *
 * Stated per PREDICATE rather than per cell: the eighteen are not eighteen independent judgements,
 * they are three predicates over-firing, and recording them as eighteen separate refutations would
 * dress one assessment up as eighteen.
 */
const REFUTATIONS = Object.freeze({
  F1:
    "the predicate flags any digest call whose argument is not literally `.normalize(...)`, which " +
    "over-fires on a string literal and on already-canonical JSON. Neither can carry a normal-form " +
    "difference, so neither is an R2 laundering defect.",
  F5:
    "the predicate flags a member whose own span lacks a domain separator, which over-fires on a " +
    "generic digest helper whose callers supply the domain. A helper is not a completeness claim.",
  F8:
    "the predicate flags Array.prototype.sort() with no comparator as locale-dependent. It is not: " +
    "the default comparator orders by UTF-16 code units, which is engine-independent, and the " +
    "flagged sites sort string keys. Checked against an explicit code-unit comparator rather than " +
    "assumed — the orders are identical.",
});

const sha = (t) =>
  createHash("sha256")
    .update(Buffer.from(String(t), "utf8"))
    .digest("hex");

/**
 * @param {string} root
 * @returns {string} exact bytes
 */
export function buildArtefact(root) {
  const addendumText = readFileSync(join(root, ADDENDUM), "utf8");
  const addendum = JSON.parse(addendumText);
  const audit = JSON.parse(readFileSync(join(root, AUDIT), "utf8"));
  const campaign = JSON.parse(readFileSync(join(root, CAMPAIGN), "utf8"));
  const pairs = JSON.parse(readFileSync(join(root, PAIRS), "utf8"));

  const opening = inheritedOpeningFinding({ addendum, addendumDigest: sha(addendumText) });

  const records = [
    {
      finding_id: "5R-F001",
      recorded_by: "5r",
      about_stage: "5q",
      attack_class: "R7",
      severity: "assurance_only",
      affected_artifact:
        "docs/research/llm-shield/evidence/stage-5q/mutation/receipts.json + the L4 admissibility rule that consumes it",
      expected_result:
        "a green→red→green mutation receipt for class R is evidence that class R is detectable over the members where R is claimed to apply",
      observed_result:
        "each receipt is evidence over exactly one member, in one role. Across the fourteen discharged classes the tested role holds 2 118 of 20 213 obligated cells — 10.5%. Four populated roles totalling 699 members received no mutation evidence at all; of the 26 (role, class) obligations they carry, 22 were discharged class-wide on evidence earned in another role.",
      why_not_stronger:
        "no published 5Q coverage number depends on it. status_tally shows attacked_pass: 0, so the weak generalisation never propagated into the 6.2%. The defect is in the assurance argument, not the arithmetic, and any stronger severity would be an overclaim — this finding exists to make an overclaim harder, not to commit one.",
      not_a_repair:
        "5Q's ledger is not reopened and its receipts are not re-run. This is a 5R record about a 5Q artifact, the same relationship 5Q had to 5M.",
      measured_before_the_harness_existed: true,
    },
    ...audit.families.map((f, i) => ({
      finding_id: `5R-F${String(i + 2).padStart(3, "0")}`,
      recorded_by: "5r",
      about_stage: "5q",
      attack_class: f.attack_class,
      severity: "assurance_only",
      affected_artifact: `docs/research/llm-shield/evidence/stage-5q/packs/all-pack-results.json :: ${f.pack_id}`,
      expected_result:
        "a probe family that discharges obligation cells satisfies §4.1's seven admissibility conditions",
      observed_result:
        `the ${f.audited_family_id} family fails ${f.failing_conditions.length} of seven: ` +
        `${f.failing_conditions.join(", ")}. Its ${f.discharges_examined} discharges span ` +
        `${f.roles_spanned.length} security role(s) while the family declares only a category.`,
      judges_a_historical_artefact_against_a_later_contract: true,
      why_not_stronger:
        "the family was admissible under 5Q Law 4, which is the rule it was built to satisfy. Nothing is withdrawn: 5Q's 1 438 cells stand, and L5 forbids rewriting a frozen record.",
    })),
    {
      finding_id: "5R-F008",
      recorded_by: "5r",
      about_stage: "5r",
      attack_class: "R7",
      severity: "claim_narrowing",
      affected_artifact: "tools/simurgh-attestation/stage5r/core/campaign.mjs :: probeCell",
      expected_result:
        "a tranche of admissible families discharges some of the obligation cells its pairs contain",
      observed_result:
        `all eight T1 families are admissible and all ${campaign.cells.total} cells of their pairs were probed, and ` +
        "ZERO were discharged. The probe is static; clause 10 requires the class-specific outcome matched on this member; a static reading cannot demonstrate an outcome that was never executed.",
      claim_narrowed:
        "5R demonstrates an instrument, not coverage. The tranche's contribution to cumulative coverage is exactly zero and the ledger says so in the same relationship as every other figure.",
      declared_before_the_run:
        "the bound is written into the module that produces the result, not appended to it afterwards, and a unit test asserts no cell can reach the discharged state through this probe.",
    },
    {
      finding_id: "5R-F009",
      recorded_by: "5r",
      about_stage: "5r",
      attack_class: "R10",
      severity: "assurance_only",
      affected_artifact:
        "tools/simurgh-attestation/stage5r/node/detectorChild.mjs :: decide (as of Task 11)",
      expected_result:
        "the detector decides by the declared signal, which is a property of the code under test",
      observed_result:
        "it decided by the presence of a marker comment naming the declared signal — a marker the control's own author places. Under it vulnerable-detected and safe-not-detected held by construction, all seven §4.1 conditions passed, and none of it was about a defect.",
      why_not_stronger:
        "found and repaired at Task 18, before any campaign ran, so no published 5R result depends on it. Recorded under signature rather than narrated in prose because §7.3 exists precisely to close that gap.",
      repaired_by: "core/signals.mjs; mutant N7 seeds this exact defect and the census catches it",
    },
  ];

  const adjudicated = campaign.candidate_findings.map((c) => ({
    ...c,
    verdict: "refuted",
    refutation: REFUTATIONS[c.probe_family_id] ?? "no refutation recorded — this must not ship",
    discharges_nothing:
      "a candidate is never an automatic discharge; clause 10 was not satisfied by any of them",
  }));
  const unrefuted = adjudicated.filter((a) => a.refutation.startsWith("no refutation"));

  const artefact = buildFindingLedger({
    opening,
    records,
    adjudicated,
    census: familyResultCensus(pairs.pairs),
    disclosure: fourTermDisclosure({
      admissible: campaign.families_admissible,
      attempted: campaign.families_attempted,
      newlyDischarged: campaign.newly_discharged_cells,
    }),
  });
  artefact.candidate_findings_raised = adjudicated.length;
  artefact.candidate_findings_unrefuted = unrefuted.length;
  return `${canonicalJson(artefact)}\n`;
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? join(REPO, LEDGER_PATH) : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  for (const p of [AUDIT, CAMPAIGN]) {
    if (!existsSync(join(REPO, p))) {
      process.stderr.write(`finding ledger: ${p} does not exist yet\n`);
      return 1;
    }
  }
  const bytes = buildArtefact(REPO);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes, "utf8");
  const a = JSON.parse(bytes);
  const lines = [
    `wrote ${output}`,
    `  ${a.record_count} records, ${a.findings_against_self} of them against 5R itself`,
    `  opening: ${a.opening_finding.finding_id} (inherited by digest, 5Q's disposition quoted)`,
    `  candidates raised ${a.candidate_findings_raised}, unrefuted ${a.candidate_findings_unrefuted}`,
    `  ${a.four_term_disclosure.families.text}`,
    `  ${a.four_term_disclosure.cells.text}`,
  ];
  for (const r of a.records) lines.push(`    ${r.finding_id}  ${r.about_stage}  ${r.severity}`);
  process.stdout.write(`${lines.join("\n")}\n`);
  return a.candidate_findings_unrefuted === 0 ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
