// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 27: verify the release surface with the public key alone.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyReleaseSurface.mjs
//
// MEMBERS BEFORE SIGNATURE, for the same reason the campaign attestation does it: a verifier that
// checks the signature first reports "signature valid" about a surface whose members no longer
// describe the tree. A mutation test proves the ordering by failing if the signature is even
// reached when a member is wrong.

import { readFileSync, existsSync } from "node:fs";
import { createHash, verify as verifyRaw } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { verifyMembers, surfaceDigest, SURFACE_PATH } from "./buildReleaseSurface.mjs";
import { SIG_PATH, SIGNING_PREFIX } from "./signReleaseSurface.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PROFILE = "tools/simurgh-attestation/stage5r/signer/stage5r-signer-profile.json";

/**
 * Verify a surface and its signature, members first.
 *
 * @param {{surface: object, sig: object, profile: object, verifySignature: Function}} input
 * @returns {{ok: boolean, stage: string, reason?: string}}
 */
export function verifySurface({ surface, sig, profile, verifySignature }) {
  const members = verifyMembers({ surface });
  if (!members.ok) return { ok: false, stage: "members", reason: members.differences.join("; ") };

  const digest = surfaceDigest(surface);
  if (digest !== sig.surface_digest) {
    return { ok: false, stage: "digest", reason: "the signature is over a different surface" };
  }
  const presented = Buffer.from(sig.signer.public_key_b64, "base64");
  if (createHash("sha256").update(presented).digest("hex") !== profile.public_key_digest) {
    return { ok: false, stage: "signer", reason: "not the committed genesis key" };
  }
  return verifySignature({ digest, presented, sig })
    ? { ok: true, stage: "signature" }
    : { ok: false, stage: "signature", reason: "signature does not verify" };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv = []) {
  if (argv.some((a) => a === "--key" || a.startsWith("--key="))) {
    process.stderr.write(
      "verifyReleaseSurface: --key is refused; verification uses the public key\n"
    );
    return 2;
  }
  for (const p of [SURFACE_PATH, SIG_PATH]) {
    if (!existsSync(join(REPO, p))) {
      process.stderr.write(`release surface: ${p} does not exist\n`);
      return 1;
    }
  }
  const surface = JSON.parse(readFileSync(join(REPO, SURFACE_PATH), "utf8"));
  const sig = JSON.parse(readFileSync(join(REPO, SIG_PATH), "utf8"));
  const profile = JSON.parse(readFileSync(join(REPO, PROFILE), "utf8"));

  const r = verifySurface({
    surface,
    sig,
    profile,
    verifySignature: ({ digest, presented, sig: s }) =>
      verifyRaw(
        null,
        Buffer.from(`${SIGNING_PREFIX} ${digest}`, "utf8"),
        { key: presented, format: "der", type: "spki" },
        Buffer.from(s.signature_b64, "base64")
      ),
  });

  process.stdout.write(
    [
      `surface     ${SURFACE_PATH}`,
      `members     ${Object.keys(surface.members).length}, all recomputed from the tree`,
      `chained to  campaign attestation ${surface.members.campaign_attestation_public_digest.slice(0, 16)}`,
      "private key NOT REQUIRED and NOT READ",
      r.ok ? "RELEASE SURFACE VERIFIED" : `REFUSED at ${r.stage}: ${r.reason}`,
      "",
    ].join("\n")
  );
  return r.ok ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
