// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 25: every manifest entry has an implementation in every runtime.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/checkManifestCoverage.mjs --runtime all
//
// The manifest names what must agree. This asserts that no runtime is quietly missing an entry —
// selective mirroring is the failure the manifest exists to prevent: implement the easy half, run a
// parity check that only exercises the half that exists, and report parity.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { PARITY_ENTRIES, OUT_OF_SCOPE } from "../core/parityManifest.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PORTABLE = "tools/simurgh-attestation/stage5r/browser/vpf-portable.mjs";
const PYTHON = "tools/simurgh-attestation/stage5r/python/vpf_parity.py";

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const runtime = argv[argv.indexOf("--runtime") + 1] ?? "all";
  const portable = readFileSync(join(REPO, PORTABLE), "utf8");
  const python = readFileSync(join(REPO, PYTHON), "utf8");

  const problems = [];
  for (const entry of PARITY_ENTRIES) {
    if (["all", "browser"].includes(runtime) && !portable.includes(`"${entry.id}"`)) {
      problems.push(`${entry.id}: the portable mirror does not dispatch it`);
    }
    if (["all", "python"].includes(runtime) && !python.includes(`"${entry.id}"`)) {
      problems.push(`${entry.id}: the python mirror does not dispatch it`);
    }
  }
  const lines = [
    `manifest entries : ${PARITY_ENTRIES.length}`,
    `out of scope     : ${OUT_OF_SCOPE.length}, each with a reason`,
    ...OUT_OF_SCOPE.map((o) => `    ${o.id.padEnd(28)} ${o.reason}`),
    ...problems.map((p) => `  MISSING ${p}`),
    problems.length ? "REFUSED" : "OK: every entry is implemented in every runtime",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  return problems.length ? 1 : 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
