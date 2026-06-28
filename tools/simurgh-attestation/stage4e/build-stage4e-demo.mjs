#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pathToFileURL } from "node:url";
import { buildStage4eDemo } from "./stage4eDemo.mjs";

function arg(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

export async function main({ argv = process.argv.slice(2), env = process.env } = {}) {
  const benignRun = arg(argv, "--benign-run");
  const attackRun = arg(argv, "--attack-run");
  const outDir = arg(argv, "--out-dir");
  if (!benignRun || !attackRun || !outDir) {
    throw new Error(
      "usage: build-stage4e-demo --benign-run <json> --attack-run <json> --out-dir <dir>"
    );
  }
  await buildStage4eDemo({
    benignRunPath: benignRun,
    attackRunPath: attackRun,
    outDir,
    privateKeyPath:
      env.SIMURGH_4D_PRIVATE_KEY_PATH ||
      "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem",
  });
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("stage4e build:", error.message);
    process.exit(2);
  });
}
