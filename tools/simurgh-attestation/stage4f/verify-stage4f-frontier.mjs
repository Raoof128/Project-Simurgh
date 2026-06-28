#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { verifyFrontier } from "./verifyFrontier.mjs";

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const evidenceDir = arg(argv, "--evidence-dir");
  const suitePath = arg(argv, "--suite");
  const gridPath = arg(argv, "--grid");
  const pubkeyPath = arg(argv, "--pubkey");
  const outPath = arg(argv, "--out");
  if (!evidenceDir || !suitePath || !gridPath || !pubkeyPath) {
    throw new Error(
      "usage: verify-stage4f-frontier --evidence-dir <dir> --suite <suite> --grid <grid> --pubkey <pubkey> [--out <path>]"
    );
  }
  const result = await verifyFrontier({ evidenceDir, suitePath, gridPath, pubkeyPath });
  if (outPath) await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`);
  return result.exit_code;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((error) => {
      console.error(`stage4f verify-frontier: ${error.message}`);
      process.exit(2);
    });
}
