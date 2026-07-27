// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 27: the release surface, covering what Task 24 deliberately excluded.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/buildReleaseSurface.mjs [--output <path>]
//
// The campaign attestation covers campaign evidence and says so. This covers the rest: parity
// output, the K7 result, the deferred red states and the closeout. An earlier draft of the plan
// named this root and no mechanism, which is how a root becomes a word in a document.
//
// `campaign_attestation_public_digest` is a member ON PURPOSE. It chains the release surface to the
// signed campaign evidence, so the two signatures are ORDERED rather than parallel: this one is
// about a tree that already contains that one.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const E = "docs/research/llm-shield/evidence/stage-5r";
export const SURFACE_PATH = `${E}/release/release-surface.json`;
export const SURFACE_SCHEMA = "simurgh.vpf.release-surface.v1";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** The five members, each a digest of something already on disk. */
export const MEMBERS = Object.freeze([
  "parity_output_root",
  "k7_result_root",
  "deferred_red_state_root",
  "closeout_digest",
  "campaign_attestation_public_digest",
]);

/**
 * @param {string} root
 * @returns {object}
 */
export function buildSurface(root = REPO) {
  const at = (rel) => sha(readFileSync(join(root, rel)));
  const envelope = JSON.parse(
    readFileSync(join(root, `${E}/attestation/campaign-attestation-envelope.json`), "utf8")
  );
  return {
    schema: SURFACE_SCHEMA,
    note:
      "Release-gate evidence: what the campaign attestation deliberately does not cover. The last " +
      "member chains this surface to that attestation's public digest, so the two signatures are " +
      "ordered rather than parallel.",
    members: {
      parity_output_root: at(`${E}/parity/cross-runtime-parity.json`),
      k7_result_root: at("tests/e2e/llmShield/stage5r/k7AllFunctions.test.js"),
      deferred_red_state_root: at(`${E}/gate-red-states/deferred-red-states.json`),
      closeout_digest: at("docs/research/llm-shield/STAGE_5R_CLOSEOUT.md"),
      campaign_attestation_public_digest: envelope.public_digest,
    },
    member_order_is_part_of_the_contract: MEMBERS,
  };
}

/** The digest the signature is taken over. */
export function surfaceDigest(surface) {
  return sha(Buffer.from(canonicalJson(surface), "utf8"));
}

/**
 * Recompute every member and compare, BEFORE any signature is examined.
 *
 * @param {{surface: object, root?: string}} input
 * @returns {{ok: boolean, differences: string[]}}
 */
export function verifyMembers({ surface, root = REPO }) {
  const rebuilt = buildSurface(root);
  const differences = [];
  for (const name of MEMBERS) {
    if (surface.members?.[name] !== rebuilt.members[name]) {
      differences.push(
        `${name}: committed ${surface.members?.[name]} != rebuilt ${rebuilt.members[name]}`
      );
    }
  }
  for (const k of Object.keys(surface.members ?? {})) {
    if (!MEMBERS.includes(k)) differences.push(`${k}: a member nobody declared`);
  }
  return { ok: differences.length === 0, differences };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const i = argv.indexOf("--output");
  const output = i === -1 ? join(REPO, SURFACE_PATH) : argv[i + 1];
  if (!existsSync(join(REPO, `${E}/attestation/campaign-attestation-envelope.json`))) {
    process.stderr.write("release surface: the campaign attestation is not signed yet\n");
    return 1;
  }
  const surface = buildSurface();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(surface)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${output}`,
      ...MEMBERS.map((m) => `  ${m.padEnd(36)} ${surface.members[m].slice(0, 16)}`),
      `  surface digest                       ${surfaceDigest(surface).slice(0, 16)}`,
      "",
    ].join("\n")
  );
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
