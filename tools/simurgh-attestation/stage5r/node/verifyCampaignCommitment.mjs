// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 19: verify C1 against the tree, and against a tree whose controls were altered.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs
//   node tools/simurgh-attestation/stage5r/node/verifyCampaignCommitment.mjs --against <corpus dir>
//
// The second form is the one that matters. A verifier that has only ever been run against the corpus
// it was built from has not been shown to refuse anything, and `--against` points it at a corpus
// whose control bytes were altered: it must exit non-zero and name the family. Proving that here is
// the difference between a check and a claim about a check.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { spanDigest } from "../core/controls.mjs";
import { compareCommitments } from "../core/commitment.mjs";
import { rebuildCommitment, C1_PATH } from "./commitCampaign.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/**
 * Compare the committed control digests against the controls in some other directory.
 *
 * @param {{commitment: object, dir: string}} input
 * @returns {string[]} differences
 */
export function compareAgainstCorpusDir({ commitment, dir }) {
  const differences = [];
  const KINDS = {
    vulnerable: "vulnerable.control",
    safe: "safe.control",
    orthogonal: "orthogonal.control",
  };
  const present = readdirSync(dir).filter((n) => /^F\d+$/.test(n));
  for (const family of commitment.families) {
    if (!present.includes(family.probe_family_id)) continue;
    for (const [kind, file] of Object.entries(KINDS)) {
      const path = join(dir, family.probe_family_id, file);
      if (!existsSync(path)) {
        differences.push(`${family.probe_family_id}/${kind}: absent from the compared corpus`);
        continue;
      }
      const digest = spanDigest(readFileSync(path, "utf8"));
      if (digest !== family.control_digests[kind]) {
        differences.push(
          `${family.probe_family_id}/${kind}: control bytes differ from the commitment`
        );
      }
    }
  }
  return differences;
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const c1Path = join(REPO, C1_PATH);
  if (!existsSync(c1Path)) {
    process.stderr.write("C1 does not exist — there is no commitment to verify\n");
    return 1;
  }
  const committed = JSON.parse(readFileSync(c1Path, "utf8"));

  const i = argv.indexOf("--against");
  if (i !== -1) {
    const dir = join(REPO, argv[i + 1]);
    const differences = compareAgainstCorpusDir({ commitment: committed, dir });
    process.stdout.write(
      differences.length
        ? `REFUSED — ${differences.length} difference(s)\n${differences.map((d) => `  ${d}`).join("\n")}\n`
        : "no difference found against the compared corpus\n"
    );
    // A comparison corpus that matches the commitment means the verifier found nothing to refuse,
    // which for an ALTERED corpus is itself the failure.
    return differences.length ? 1 : 0;
  }

  const rebuilt = rebuildCommitment(REPO);
  const result = compareCommitments({ committed, rebuilt });
  process.stdout.write(
    result.ok
      ? `C1 VERIFIED: ${committed.family_count} families, ${committed.total_target_cells} target cells, all bytes match\n`
      : `C1 REFUSED\n${result.differences.map((d) => `  ${d}`).join("\n")}\n`
  );
  return result.ok ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
