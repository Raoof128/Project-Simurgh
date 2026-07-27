// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 24: build and sign the campaign attestation.
//
// Usage:
//   node .../attestStage5r.mjs --build-only [--output <path>]   deterministic, anyone can run it
//   node .../attestStage5r.mjs --sign                            needs the offline private half
//
// The bundle and the signature are written by different flags on purpose. `--build-only` is
// reproducible by anyone and byte-identical on every run; `--sign` needs a key that is not in this
// repository and never will be.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createPrivateKey, sign as signRaw, createPublicKey } from "node:crypto";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import {
  ROOT_NAMES,
  ENVELOPE_SCHEMA,
  SIGNER_ID,
  buildPublicBundle,
  publicDigest,
  signingInput,
  familyResultRoot,
  controlReceiptRoot,
  root,
  sha256Hex,
} from "../core/attestation.mjs";
import { INHERITED_FILE_PINS } from "../core/inherit.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const E = "docs/research/llm-shield/evidence/stage-5r";
export const BUNDLE_PATH = `${E}/attestation/campaign-attestation.json`;
export const ENVELOPE_PATH = `${E}/attestation/campaign-attestation-envelope.json`;
export const PROFILE_PATH = "tools/simurgh-attestation/stage5r/signer/stage5r-signer-profile.json";
const PRIVATE_KEY = join(homedir(), ".simurgh", "5r-ed25519.pem");

const readJson = (p) => JSON.parse(readFileSync(join(REPO, p), "utf8"));

/**
 * Recompute every root from the evidence on disk.
 *
 * @param {string} root_ repository root
 * @returns {{roots: Record<string,string>, counts: object}}
 */
export function recomputeRoots() {
  const universe = readJson(`${E}/universe/family-universe.json`);
  const pairs = readJson(`${E}/campaign/pair-results.json`);
  const campaign = readJson(`${E}/campaign/campaign-result.json`);
  const delta = readFileSync(join(REPO, `${E}/ledgers/delta-ledger.json`), "utf8");
  const audit = readFileSync(join(REPO, `${E}/audit/prior-families.json`), "utf8");
  const findings = readFileSync(join(REPO, `${E}/ledgers/finding-ledger.json`), "utf8");

  const result = familyResultRoot(pairs.pairs);
  return {
    roots: {
      // The seven inherited digests, canonicalised together. They are 5Q's, unchanged.
      inherited_commitment_digest: root({ inherited: INHERITED_FILE_PINS }),
      family_universe_root: root({
        pair_count: universe.pair_count,
        pairs: universe.pairs,
      }),
      family_result_root: result.root,
      control_receipt_root: controlReceiptRoot(campaign.families),
      delta_ledger_digest: sha256Hex(delta),
      prior_family_audit_digest: sha256Hex(audit),
      vpf_finding_ledger_digest: sha256Hex(findings),
    },
    counts: {
      inherited_digests: Object.keys(INHERITED_FILE_PINS).length,
      universe_pairs: universe.pair_count,
      result_rows: result.rows.length,
      families_attempted: campaign.families_attempted,
      families_admissible: campaign.families_admissible,
      control_receipts: campaign.families.length * 3,
      cells_probed: campaign.cells.total,
      newly_discharged_cells: campaign.newly_discharged_cells,
    },
  };
}

/** Build the unsigned public bundle. */
export function buildBundle() {
  const { roots, counts } = recomputeRoots();
  return buildPublicBundle({ roots, counts });
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const i = argv.indexOf("--output");
  const bundlePath = i === -1 ? join(REPO, BUNDLE_PATH) : argv[i + 1];
  const bundle = buildBundle();
  const bytes = `${canonicalJson(bundle)}\n`;
  mkdirSync(dirname(bundlePath), { recursive: true });
  writeFileSync(bundlePath, bytes, "utf8");

  const lines = [`wrote ${bundlePath}`];
  for (const n of ROOT_NAMES) lines.push(`  ${n.padEnd(30)} ${bundle.roots[n].slice(0, 16)}…`);
  lines.push(`  public digest                  ${publicDigest(bundle).slice(0, 16)}…`);

  if (argv.includes("--sign")) {
    if (!existsSync(PRIVATE_KEY)) {
      process.stderr.write(
        `attestation: ${PRIVATE_KEY} is absent. --build-only needs no key; signing does.\n`
      );
      return 1;
    }
    const priv = createPrivateKey(readFileSync(PRIVATE_KEY));
    const pubDer = createPublicKey(priv).export({ type: "spki", format: "der" });
    const profile = readJson(PROFILE_PATH);
    if (sha256Hex(pubDer) !== profile.public_key_digest) {
      process.stderr.write(
        "attestation: the private key does not match the committed signer profile\n"
      );
      return 1;
    }
    const envelope = {
      schema: ENVELOPE_SCHEMA,
      note:
        "Signed once by the producer. Verification needs the PUBLIC key committed below and no " +
        "private key at all — 5R depends on no predecessor's private key, and on its own only to " +
        "produce this file.",
      public_bundle: bundle,
      public_digest: publicDigest(bundle),
      signer: {
        profile_id: SIGNER_ID,
        algorithm: "ed25519",
        public_key_b64: Buffer.from(pubDer).toString("base64"),
        expected_public_key_digest: profile.public_key_digest,
      },
      signature_b64: signRaw(null, signingInput(bundle), priv).toString("base64"),
    };
    const envPath = join(REPO, ENVELOPE_PATH);
    mkdirSync(dirname(envPath), { recursive: true });
    writeFileSync(envPath, `${canonicalJson(envelope)}\n`, "utf8");
    lines.push(`signed ${envPath}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
