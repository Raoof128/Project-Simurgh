// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 24: verify the campaign attestation with the public key alone.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyAttestation.mjs
//
// NO PRIVATE KEY. Not optionally, not as a fallback: a `--key` argument is REFUSED outright, because
// a verifier that accepts one invites a reviewer to run it with the producer's key and call the
// result independent. The private half is not needed and its absence is proved by running this with
// the file physically moved away.

import { readFileSync, existsSync } from "node:fs";
import { verify as verifyRaw } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { verifyAttestation, ROOT_NAMES, sha256Hex } from "../core/attestation.mjs";
import { recomputeRoots, ENVELOPE_PATH, PROFILE_PATH } from "./attestStage5r.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  if (argv.some((a) => a === "--key" || a.startsWith("--key="))) {
    process.stderr.write(
      "verifyAttestation: --key is refused. Verification uses the public key committed inside the " +
        "envelope; a verifier that takes a key argument is one a reviewer can be talked into " +
        "pointing at the producer's.\n"
    );
    return 2;
  }
  const envPath = join(REPO, ENVELOPE_PATH);
  if (!existsSync(envPath)) {
    process.stderr.write("verifyAttestation: no signed envelope\n");
    return 1;
  }
  const envelope = JSON.parse(readFileSync(envPath, "utf8"));
  const profile = JSON.parse(readFileSync(join(REPO, PROFILE_PATH), "utf8"));
  const { roots } = recomputeRoots();

  const result = verifyAttestation({
    envelope,
    rebuiltRoots: roots,
    verifySignature: ({ input, envelope: env }) => {
      const presented = Buffer.from(env.signer.public_key_b64, "base64");
      if (sha256Hex(presented) !== profile.public_key_digest) {
        return { ok: false, reason: "the presented key is not the committed genesis key" };
      }
      const ok = verifyRaw(
        null,
        input,
        { key: presented, format: "der", type: "spki" },
        Buffer.from(env.signature_b64, "base64")
      );
      return ok ? { ok: true } : { ok: false, reason: "signature does not verify" };
    },
  });

  const lines = [
    `envelope    ${ENVELOPE_PATH}`,
    `signer      ${envelope.signer.profile_id} (${profile.public_key_digest.slice(0, 16)}…)`,
    `roots       ${ROOT_NAMES.length}, all recomputed from the evidence`,
    `private key NOT REQUIRED and NOT READ`,
    result.ok ? "ATTESTATION VERIFIED" : `REFUSED at ${result.stage}: ${result.reason}`,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  return result.ok ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
