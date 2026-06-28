#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pathToFileURL } from "node:url";
import { buildStage4fDemo } from "./stage4fDemo.mjs";

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const suiteId = arg(argv, "--suite-id");
  const fixtureRoot = arg(argv, "--fixture-root");
  const privateKeyPath = arg(argv, "--private-key");
  const outDir = arg(argv, "--out-dir");
  if (!suiteId || !fixtureRoot || !privateKeyPath || !outDir) {
    throw new Error(
      "usage: build-stage4f-demo --suite-id <id> --fixture-root <dir> --private-key <pem> --out-dir <dir>"
    );
  }
  await buildStage4fDemo({ suiteId, fixtureRoot, privateKeyPath, outDir });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`stage4f demo: ${error.message}`);
    process.exit(2);
  });
}
