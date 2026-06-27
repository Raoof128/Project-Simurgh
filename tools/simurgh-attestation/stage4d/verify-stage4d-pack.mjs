#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { verifyEvidencePack } from "./verifyPack.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

async function main() {
  const packPath = process.argv[2];
  const sigPath = arg("--sig");
  const pubkeyPath = arg("--pubkey");
  const resultsPath = arg("--results") || join(dirname(packPath), "verify-results.json");
  if (!packPath || !sigPath || !pubkeyPath) {
    throw new Error("usage: verify-stage4d-pack <pack> --sig <sig> --pubkey <pubkey>");
  }
  const pack = JSON.parse(await readFile(packPath, "utf8"));
  const signature = (await readFile(sigPath, "utf8")).trim();
  const publicKeyPem = await readFile(pubkeyPath, "utf8");
  const result = verifyEvidencePack({ pack, signature, publicKeyPem });
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  process.exit(result.exit_code);
}

main().catch(async (e) => {
  const packPath = process.argv[2] || ".";
  const resultsPath = arg("--results") || join(dirname(packPath), "verify-results.json");
  const result = {
    ok: false,
    exit_code: 2,
    layers: {},
    first_failure: { layer: "environment", reason: "environment_setup_error", message: e.message },
  };
  await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
  process.exit(2);
});
