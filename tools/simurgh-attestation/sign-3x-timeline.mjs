// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for the Stage 3X timeline index. Reads SIMURGH_3X_PRIVATE_KEY_PATH (default
// ~/.simurgh/3x-ed25519.pem); CI never runs this. Signs canonicalJson(parse(index)).
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

async function main() {
  const keyPath =
    process.env.SIMURGH_3X_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3x-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3x-public-key.json"), "utf8"));
  const index = JSON.parse(await readFile(join(EV, "timeline.index.json"), "utf8"));
  const canonical = Buffer.from(canonicalJson(index), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(priv));
  const sidecar = {
    schema: "simurgh.vca.public_timeline.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pub.public_key_pem),
    signature: "base64:" + signature.toString("base64"),
  };
  await writeFile(join(EV, "timeline.signature.json"), stable(sidecar));
  console.log("stage3x: signed; fingerprint", sidecar.public_key_fingerprint);
}
main().catch((e) => {
  console.error("stage3x sign:", e.message);
  process.exit(1);
});
