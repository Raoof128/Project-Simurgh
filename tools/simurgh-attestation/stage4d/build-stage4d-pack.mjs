#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildEvidencePack, signPack } from "./packBuilder.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const runPath = arg("--run-record");
  const outPath = arg("--out");
  const sigPath = arg("--sig");
  if (!runPath || !outPath || !sigPath) {
    throw new Error("usage: build-stage4d-pack --run-record <json> --out <pack> --sig <sig>");
  }
  const privateKeyPath =
    process.env.SIMURGH_4D_PRIVATE_KEY_PATH ||
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
}

main().catch((e) => {
  console.error("stage4d build:", e.message);
  process.exit(2);
});
