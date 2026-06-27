#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildEvidencePack, signPack } from "./packBuilder.mjs";

export function arg(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

export const stable = (v) => JSON.stringify(v, null, 2) + "\n";

export async function main({ argv = process.argv.slice(2), env = process.env } = {}) {
  const runPath = arg(argv, "--run-record");
  const outPath = arg(argv, "--out");
  const sigPath = arg(argv, "--sig");
  if (!runPath || !outPath || !sigPath) {
    throw new Error("usage: build-stage4d-pack --run-record <json> --out <pack> --sig <sig>");
  }
  const privateKeyPath =
    env.SIMURGH_4D_PRIVATE_KEY_PATH ||
    "tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem";
  const privateKey = crypto.createPrivateKey(await readFile(privateKeyPath, "utf8"));
  const publicKey = crypto.createPublicKey(privateKey);
  const runRecord = JSON.parse(await readFile(runPath, "utf8"));
  const pack = buildEvidencePack({ runRecord, privateKey, publicKey });
  const signature = signPack(pack, privateKey);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, stable(pack));
  await writeFile(sigPath, signature + "\n");
  await writeFile(
    join(dirname(outPath), "signer.pub"),
    publicKey.export({ type: "spki", format: "pem" })
  );
  await writeFile(join(dirname(outPath), "run-manifest.json"), stable(pack.run_manifest));
  await writeFile(
    join(dirname(outPath), "completeness-manifest.json"),
    stable(pack.completeness_manifest)
  );
  await writeFile(join(dirname(outPath), "non-claims.json"), stable(pack.non_claims));
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("stage4d build:", e.message);
    process.exit(2);
  });
}
