// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 20: C1 must be an ancestor of C2, and its bytes must still match.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyCampaignAncestry.mjs
//
// Two questions. Was the commitment made before the results existed — answered by ancestry, which git
// records and neither commit can forge after the fact. And is the commitment still true of the tree —
// answered by rebuilding it. Either alone is weak: an ancestor commitment whose bytes were quietly
// changed proves nothing, and a matching commitment with no ordering proves only that someone wrote
// down what they had.
//
// The honest bound stays what §13 and C1 itself say: the producer controls both commits, so ancestry
// raises the cost of back-fitting rather than eliminating it. An external witness over C1 is the
// thing that would close it, and that is a different stage's blade.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { main as verifyCommitment } from "./verifyCampaignCommitment.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const C1_PATH = "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json";
const C2_PATH = "docs/research/llm-shield/evidence/stage-5r/campaign/campaign-result.json";

const git = (args) => execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();

/**
 * The commit whose bytes are in force for a path — the most recent one to touch it.
 *
 * NOT the commit that first added it. C1 was re-issued after the runner it binds was repaired, and
 * resolving the first `A` entry named the superseded commitment while the verifier was checking the
 * re-issued bytes. Reporting one commit and verifying another is the kind of near-miss that reads as
 * a receipt and is not one.
 */
export function inForceCommit(path) {
  const out = git(["log", "-1", "--format=%H", "--", path]);
  return out || null;
}

/** @returns {number} exit code */
export function main() {
  for (const p of [C1_PATH, C2_PATH]) {
    if (!existsSync(join(REPO, p))) {
      process.stderr.write(`ancestry: ${p} does not exist\n`);
      return 1;
    }
  }
  const c1 = inForceCommit(C1_PATH);
  const c2 = inForceCommit(C2_PATH);
  if (!c1 || !c2) {
    process.stderr.write("ancestry: one of C1 or C2 is not in history yet — commit them first\n");
    return 1;
  }

  let ancestor = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", c1, c2], { cwd: REPO, stdio: "pipe" });
    ancestor = true;
  } catch {
    ancestor = false;
  }

  const bytesOk = verifyCommitment([]) === 0;
  const lines = [
    `C1 ${c1.slice(0, 12)}  ${C1_PATH}`,
    `C2 ${c2.slice(0, 12)}  ${C2_PATH}`,
    `C1 is an ancestor of C2 : ${ancestor}`,
    `C1's bytes still match  : ${bytesOk}`,
    ancestor && bytesOk && c1 !== c2
      ? "ANCESTRY VERIFIED"
      : c1 === c2
        ? "REFUSED: the commitment and the results are the same commit — nothing was committed in advance"
        : "REFUSED",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  return ancestor && bytesOk && c1 !== c2 ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
