#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyEvidencePack } from "./verifyPack.mjs";

export function arg(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const packPath = argv[0];
  const sigPath = arg(argv, "--sig");
  const pubkeyPath = arg(argv, "--pubkey");
  if (!packPath || !sigPath || !pubkeyPath) {
    throw new Error("usage: verify-stage4d-pack <pack> --sig <sig> --pubkey <pubkey>");
  }
  const resultsPath = arg(argv, "--results") || join(dirname(packPath), "verify-results.json");
  const pack = JSON.parse(await readFile(packPath, "utf8"));
  const signature = (await readFile(sigPath, "utf8")).trim();
  const publicKeyPem = await readFile(pubkeyPath, "utf8");
  const result = verifyEvidencePack({ pack, signature, publicKeyPem });
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  return result.exit_code;
}

export async function writeEnvironmentFailure({ argv = process.argv.slice(2), error }) {
  const packPath = argv[0] || ".";
  const resultsPath = arg(argv, "--results") || join(dirname(packPath), "verify-results.json");
  const result = {
    ok: false,
    exit_code: 2,
    layers: {},
    first_failure: {
      layer: "environment",
      reason: "environment_setup_error",
      message: error.message,
    },
  };
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  return result.exit_code;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((exitCode) => process.exit(exitCode))
    .catch(async (e) => {
      const exitCode = await writeEnvironmentFailure({ error: e });
      process.exit(exitCode);
    });
}
