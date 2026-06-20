// SPDX-License-Identifier: AGPL-3.0-or-later
// One-time Ed25519 keypair generation. The private key is written OUTSIDE the repo.
import crypto from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fingerprintPublicKey } from "./canonicalise.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}

const outPrivate = arg("--out-private");
const outPublic = arg("--out-public");
if (!outPrivate || !outPublic) {
  console.error("usage: keygen.mjs --out-private <path.pem> --out-public <path.json>");
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });
const fingerprint = fingerprintPublicKey(pubPem);

await writeFile(outPrivate, privPem, { mode: 0o600 });
await writeFile(
  outPublic,
  JSON.stringify(
    { key_type: "Ed25519", format: "spki-pem", public_key_pem: pubPem, fingerprint },
    null,
    2
  ) + "\n"
);
console.log("keygen: wrote private key to", outPrivate, "(KEEP OUT OF REPO)");
console.log("keygen: wrote public key to", outPublic);
console.log("fingerprint:", fingerprint);
