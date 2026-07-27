// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 18: write the deterministic premise-receipt artefact.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildPremiseReceipts.mjs [--output <path>]
//
// Deterministic: the same corpus bytes produce the same artefact bytes, in this process or another,
// today or after a reboot. Nothing here reads a clock, an environment or a path outside the corpus.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildPremiseReceipts, RECEIPTS_PATH } from "../core/families.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** @param {string[]} argv */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? join(REPO, RECEIPTS_PATH) : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  const bytes = buildPremiseReceipts(REPO);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, bytes, "utf8");
  const artefact = JSON.parse(bytes);
  process.stdout.write(
    `wrote ${output}\n` +
      `  ${artefact.family_count} families, ${artefact.control_count} controls\n` +
      `  corpus_verified: ${artefact.corpus_verified}\n` +
      (artefact.problems.length
        ? `  PROBLEMS: ${artefact.problems.map((p) => `${p.family}: ${p.problem}`).join("; ")}\n`
        : "")
  );
  return artefact.corpus_verified ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
