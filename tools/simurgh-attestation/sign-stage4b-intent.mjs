// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer. Reads SIMURGH_4B_PRIVATE_KEY_PATH (default ~/.simurgh/4b-ed25519.pem);
// CI never runs this. Signs canonicalJson(parse(bundle)).
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4b-intent";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_4B_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "4b-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage4b-public-key.json"), "utf8"));
  const bundle = JSON.parse(await readFile(join(EV, "intent-bundle.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.stage4b.intent_bundle.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "intent-bundle.signature.json"), stable(sidecar));
  console.log("stage4b: signed; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error("stage4b sign:", e.message);
  process.exit(1);
});
