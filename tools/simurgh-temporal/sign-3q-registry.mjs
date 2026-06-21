// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for Stage 3Q. Reads SIMURGH_3Q_PRIVATE_KEY_PATH
// (default ~/.simurgh/3q-ed25519.pem); CI never runs this. Signs registry.json and
// every committed regression-diff.json, then writes the CURRENT head (for the next
// release). It never overwrites previous-registry-head.json (a deliberate input).
import crypto from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

function sidecarFor(obj, privPem, pubPem) {
  const canonical = Buffer.from(canonicalJson(obj), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.temporal.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + signature.toString("base64"),
  };
}

async function main() {
  const keyPath =
    process.env.SIMURGH_3Q_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3q-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const pubPem = pub.public_key_pem;

  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const regSidecar = sidecarFor(registry, priv, pubPem);
  await writeFile(join(EV, "registry", "registry.signature.json"), stable(regSidecar));

  // current-registry-head.json reflects THIS registry's head — it becomes the NEXT
  // release's previous-registry-head.json. The signer must NOT overwrite the
  // previous-registry-head.json input (the prior release's head; genesis at first release).
  const currentHead = {
    type: "simurgh.temporal.previous_registry_head.v1",
    stage: "3Q",
    previous_registry_digest: sha256Hex(Buffer.from(canonicalJson(registry), "utf8")),
    previous_head_entry_index: registry.head.head_entry_index,
    previous_head_entry_digest: registry.head.head_entry_digest,
    previous_entry_count: registry.head.entry_count,
    previous_signature_digest: sha256Hex(stable(regSidecar)),
  };
  await writeFile(join(EV, "registry", "current-registry-head.json"), stable(currentHead));
  await writeFile(
    join(EV, "registry", "registry-head-digest.txt"),
    registry.head.head_entry_digest + "\n"
  );

  // sign any committed regression diffs (none at genesis)
  let signed = 0;
  try {
    for (const l of await readdir(join(EV, "diffs"), { withFileTypes: true })) {
      if (!l.isDirectory()) continue;
      for (const pair of await readdir(join(EV, "diffs", l.name), { withFileTypes: true })) {
        if (!pair.isDirectory()) continue;
        const f = join(EV, "diffs", l.name, pair.name, "regression-diff.json");
        const diff = JSON.parse(await readFile(f, "utf8"));
        await writeFile(
          f.replace(/\.json$/, ".signature.json"),
          stable(sidecarFor(diff, priv, pubPem))
        );
        signed += 1;
      }
    }
  } catch {
    /* no diffs dir entries */
  }
  console.log(
    `stage3q: signed registry + ${signed} diffs; fingerprint`,
    regSidecar.public_key_fingerprint
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
