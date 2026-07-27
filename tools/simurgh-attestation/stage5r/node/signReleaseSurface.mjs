// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 27: sign the release surface.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/signReleaseSurface.mjs
//
// THE SAME KEY AS THE CAMPAIGN ATTESTATION, deliberately. A second 5R key would make one stage look
// like two parties, which is the property 5G spent a whole stage establishing and this stage has no
// business quietly undoing.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createPrivateKey, createPublicKey, createHash, sign as signRaw } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildSurface, surfaceDigest, SURFACE_PATH } from "./buildReleaseSurface.mjs";
import { SIGNER_ID } from "../core/attestation.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const SIG_PATH = "docs/research/llm-shield/evidence/stage-5r/release/release-surface.sig";
export const SIGNING_PREFIX = "simurgh.vpf.release-surface.v1";
const PROFILE = "tools/simurgh-attestation/stage5r/signer/stage5r-signer-profile.json";
const PRIVATE_KEY = join(homedir(), ".simurgh", "5r-ed25519.pem");

/** @returns {number} exit code */
export function main() {
  if (!existsSync(PRIVATE_KEY)) {
    process.stderr.write(`release surface: ${PRIVATE_KEY} is absent; only the producer can sign\n`);
    return 1;
  }
  const surface = buildSurface();
  const committed = join(REPO, SURFACE_PATH);
  if (!existsSync(committed) || readFileSync(committed, "utf8") !== `${canonicalJson(surface)}\n`) {
    process.stderr.write(
      "release surface: build it first — the committed copy is not what rebuilds\n"
    );
    return 1;
  }
  const priv = createPrivateKey(readFileSync(PRIVATE_KEY));
  const pubDer = createPublicKey(priv).export({ type: "spki", format: "der" });
  const profile = JSON.parse(readFileSync(join(REPO, PROFILE), "utf8"));
  if (createHash("sha256").update(pubDer).digest("hex") !== profile.public_key_digest) {
    process.stderr.write("release surface: the key does not match the committed signer profile\n");
    return 1;
  }
  const digest = surfaceDigest(surface);
  const sig = {
    schema: "simurgh.vpf.release-surface-signature.v1",
    note:
      "The same key that signed the campaign attestation. A second 5R key would make one stage " +
      "look like two parties.",
    surface_digest: digest,
    signer: {
      profile_id: SIGNER_ID,
      algorithm: "ed25519",
      public_key_b64: Buffer.from(pubDer).toString("base64"),
      expected_public_key_digest: profile.public_key_digest,
    },
    signature_b64: signRaw(null, Buffer.from(`${SIGNING_PREFIX} ${digest}`, "utf8"), priv).toString(
      "base64"
    ),
  };
  const out = join(REPO, SIG_PATH);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${canonicalJson(sig)}\n`, "utf8");
  process.stdout.write(`signed ${SIG_PATH}\n  surface digest ${digest.slice(0, 16)}\n`);
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
