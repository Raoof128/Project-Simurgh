// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3W offline release-witness bundle. Reads
// SIMURGH_3W_PRIVATE_KEY_PATH (default ~/.simurgh/3w-ed25519.pem); CI never runs this. Signs
// canonicalJson(parse(bundle)) — canonical-not-bytes, so prettier/merge cannot break it.
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3w";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_3W_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3w-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3w-public-key.json"), "utf8"));
  const bundle = JSON.parse(await readFile(join(EV, "attestation.bundle.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.vca.release_witness.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "attestation.signature.json"), stable(sidecar));
  console.log("stage3w: signed; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error("stage3w sign:", e.message);
  process.exit(1);
});
