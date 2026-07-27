// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 14: emit the parity manifest.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildParityManifest.mjs [--output <path>]

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildManifest } from "../core/parityManifest.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/parity/parity-manifest.json"
);

/** @param {string[]} argv @returns {{output: string}} */
export function parseArgs(argv) {
  const i = argv.indexOf("--output");
  return { output: i === -1 ? DEFAULT_OUT : argv[i + 1] };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output } = parseArgs(argv);
  const manifest = buildManifest();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(manifest)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${output}`,
      `  ${manifest.entry_count} entries · ${manifest.vector_count} vectors`,
      `  out of scope, named with reasons: ${manifest.out_of_scope.length}`,
      "",
    ].join("\n")
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
