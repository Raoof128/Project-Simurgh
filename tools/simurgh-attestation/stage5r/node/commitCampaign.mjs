// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 19: write the campaign commitment C1.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/commitCampaign.mjs [--output <path>]
//
// Deterministic, over bytes that are already in history. C1 commits nothing it invented: every field
// is a digest of something the tree already contains, so the artefact can be rebuilt by anyone with
// the tree and compared byte-for-byte with the committed copy.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { loadCorpus } from "../core/families.mjs";
import { loadInheritedTargets, attachTargets } from "../core/campaign.mjs";
import { buildCommitment } from "../core/commitment.mjs";
import { detectorImplementationDigest } from "./detectorChild.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const C1_PATH = "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json";

/**
 * Rebuild the commitment from the tree as it stands.
 *
 * @param {string} root
 * @returns {object}
 */
export function rebuildCommitment(root) {
  const corpus = attachTargets(loadCorpus(root), loadInheritedTargets(root));
  return buildCommitment({
    families: corpus,
    trancheText: readFileSync(
      join(root, "docs/research/llm-shield/evidence/stage-5r/universe/tranche-t1.json"),
      "utf8"
    ),
    detectorDigest: detectorImplementationDigest(),
    runnerText: readFileSync(
      join(root, "tools/simurgh-attestation/stage5r/node/runTranche.mjs"),
      "utf8"
    ),
    instrumentLockText: readFileSync(
      join(root, "docs/research/llm-shield/evidence/stage-5r/instrument-lock.json"),
      "utf8"
    ),
  });
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? join(REPO, C1_PATH) : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  const commitment = rebuildCommitment(REPO);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(commitment)}\n`, "utf8");
  process.stdout.write(
    `wrote ${output}\n` +
      `  ${commitment.family_count} families, ${commitment.total_target_cells} target cells\n` +
      `  detector ${commitment.detector_implementation_digest.slice(0, 16)}…\n` +
      `  runner   ${commitment.runner_digest.slice(0, 16)}…\n` +
      `  lock     ${commitment.instrument_lock_digest.slice(0, 16)}…\n`
  );
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
