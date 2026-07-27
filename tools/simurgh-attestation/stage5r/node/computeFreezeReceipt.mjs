// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — print the freeze receipt for the design spec's §§2-5.
//
// This is the command the freeze ceremony records. A freeze whose digest was produced by an
// unrecorded one-off script is a number someone typed; a freeze produced by a committed driver is a
// receipt anyone can re-derive from the same bytes.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/computeFreezeReceipt.mjs [--spec <path>] [--emit-block]
//
// Exit codes: 0 receipt printed; 1 the spec's boundary is not intact (the extractor failed closed).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  freezeReceipt,
  fullSpecDigest,
  FROZEN_BLOCK_DOMAIN,
  FULL_SPEC_DOMAIN,
} from "../core/frozenBlock.mjs";

const DEFAULT_SPEC = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md"
);

/**
 * @param {string[]} argv
 * @returns {{ specPath: string, emitBlock: boolean }}
 */
export function parseArgs(argv) {
  const i = argv.indexOf("--spec");
  return {
    specPath: i === -1 ? DEFAULT_SPEC : argv[i + 1],
    emitBlock: argv.includes("--emit-block"),
  };
}

/**
 * @param {string[]} argv
 * @returns {number} process exit code
 */
export function main(argv) {
  const { specPath, emitBlock } = parseArgs(argv);
  let receipt;
  try {
    receipt = freezeReceipt(readFileSync(specPath, "utf8"));
  } catch (err) {
    process.stderr.write(`FREEZE REFUSED: ${err.message}\n`);
    return 1;
  }
  if (emitBlock) {
    process.stdout.write(receipt.block);
    return 0;
  }
  process.stdout.write(
    [
      `domain           ${FROZEN_BLOCK_DOMAIN}`,
      `spec             ${specPath}`,
      `frozen_bytes     ${receipt.bytes}`,
      `freeze_digest    ${receipt.digest}`,
      `full_spec_domain ${FULL_SPEC_DOMAIN}`,
      `full_spec_digest ${fullSpecDigest(readFileSync(specPath, "utf8"))}`,
      "",
    ].join("\n")
  );
  return 0;
}

// Main guard from the first commit. Ten of 5Q's own drivers executed on import until K7-A found
// them, and a census cannot enumerate a module that exits during enumeration.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
