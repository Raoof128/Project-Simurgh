// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: verify the corpus, and confirm nothing has been run against a cell yet.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyFamilyCorpus.mjs
//
// Two questions, and the second one is the one Task 18 exists to answer. First: does every family
// hold together as bytes — record shape, premise digest, the triad dividing under its own signal,
// §4.3 comparability. Second: is there any campaign artefact in the tree? Building controls before
// the commitment is lawful; running them before it is not, and a result sitting here would be the
// evidence that it happened.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  loadCorpus,
  verifyCorpus,
  buildPremiseReceipts,
  RECEIPTS_PATH,
} from "../core/families.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** Result paths that may exist only once a commitment exists to precede them. */
export const RESULT_PATHS = Object.freeze([
  "docs/research/llm-shield/evidence/stage-5r/campaign",
  "docs/research/llm-shield/evidence/stage-5r/ledger",
]);

/** The commitment those results must not predate. */
export const COMMITMENT_PATH =
  "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json";

/** @returns {number} exit code */
export function main() {
  const corpus = loadCorpus(REPO);
  const result = verifyCorpus(corpus);
  const lines = [`corpus: ${corpus.length} families, ${corpus.length * 3} controls`];

  for (const f of corpus) {
    lines.push(
      `  ${f.id}  ${f.record.attack_class} × ${f.record.target_security_role}` +
        `  signal=${f.record.detector_signal}` +
        `  orthogonal=${f.record.orthogonal_failure_control.failure_mode}`
    );
  }

  const committed = join(REPO, RECEIPTS_PATH);
  let receiptsMatch = null;
  if (existsSync(committed)) {
    receiptsMatch = readFileSync(committed, "utf8") === buildPremiseReceipts(REPO);
    lines.push(`  premise receipts rebuild identically: ${receiptsMatch}`);
  } else {
    lines.push("  premise receipts: NOT YET BUILT");
  }

  // Before Task 19 the honest check is "nothing has run". After it, the honest check is "nothing ran
  // before the commitment" — an absolute absence test would have to go red the moment the campaign
  // legitimately ran, which makes it a countdown rather than an invariant.
  const ran = RESULT_PATHS.filter((p) => existsSync(join(REPO, p)));
  const commitmentExists = existsSync(join(REPO, COMMITMENT_PATH));
  const premature = ran.length > 0 && !commitmentExists;
  lines.push(
    premature
      ? `  EXECUTED BEFORE ANY COMMITMENT: ${ran.join(", ")}`
      : ran.length
        ? `  results present, and C1 exists to precede them: ${ran.join(", ")}`
        : "  no campaign artefact exists — nothing has been run against a cell"
  );

  if (!result.ok) {
    for (const p of result.problems) lines.push(`  PROBLEM ${p.family}: ${p.problem}`);
  }
  const ok = result.ok && !premature && receiptsMatch !== false;
  lines.push(ok ? "OK" : "REFUSED");
  process.stdout.write(`${lines.join("\n")}\n`);
  return ok ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
