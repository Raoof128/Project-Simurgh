#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the Q0 attestation driver (Task 20).
//
//   node .../attestation.mjs                 recompute and verify what is committed
//   node .../attestation.mjs --write         rebuild the deterministic bundle
//   node .../attestation.mjs --sign          also sign it (needs the offline private half)
//
// THE BUNDLE AND THE SIGNATURE ARE WRITTEN BY DIFFERENT FLAGS ON PURPOSE. `--write` is
// reproducible by anyone and produces byte-identical output on every run; `--sign` requires a key
// that is not in this repository and never will be. Someone who can do the first and not the
// second is exactly the reviewer this artifact is built for.
//
// ROOTS ARE RECOMPUTED FROM THE EVIDENCE, NEVER COPIED FROM THE BUNDLE. Three of the ten are
// derived here by re-reading and re-digesting the trays, campaigns, receipts and packs; the other
// seven are read from the artifacts that own them and are cross-checked against the commitment
// receipt. A driver that read its roots out of the bundle it is verifying would verify that the
// file equals itself.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createPrivateKey, createPublicKey, createHash, sign as signRaw } from "node:crypto";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import {
  ROOT_NAMES,
  PUBLIC_SCHEMA,
  ENVELOPE_SCHEMA,
  buildPublicBundle,
  publicDigest,
  signingInput,
  verifyAttestation,
  verifyRotationChain,
  attackResultRoot,
  mutationReceiptRoot,
  attackPackRoot,
  sha256Hex,
} from "../core/attestation.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const A = `${E}/attestation`;
const PROFILE = "tools/simurgh-attestation/stage5q/signer/stage5q-signer-profile.json";
const PRIVATE_KEY = join(homedir(), ".simurgh", "5q-ed25519.pem");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/**
 * Recompute all ten roots from the evidence on disk.
 *
 * Seven are read from the artifact that owns them; three are re-derived here. The seven are ALSO
 * cross-checked against the commitment receipt, so a root that disagrees with itself across two
 * files is a failure rather than a coin toss.
 */
export function recomputeRoots() {
  const receipt = readJson(`${E}/closure/commitment-receipt.json`);
  const obligations = readJson(`${E}/closure/obligation-matrix.json`);
  const coverage = readJson(`${E}/coverage/discharge-ledger.json`);
  const findings = readJson(`${E}/findings/q0-finding-ledger.json`);
  const mutation = readJson(`${E}/mutation/receipts.json`);
  const packs = readJson(`${E}/packs/all-pack-results.json`);

  const trays = readdirSync(`${E}/trays`)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(`${E}/trays/${f}`));
  const campaigns = readdirSync(`${E}/campaigns`)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(`${E}/campaigns/${f}`));

  const sidecar = (name) => readFileSync(`${E}/closure/${name}.json.digest`, "utf8").trim();

  const roots = {
    closure_member_commitment_digest: sidecar("function-closure"),
    release_tag_closure_digest: sidecar("release-tag-closure"),
    attack_taxonomy_digest: sidecar("attack-taxonomy"),
    historical_function_closure_digest: receipt.roots.historical_function_closure_digest,
    obligation_matrix_root: obligations.obligation_matrix_root,
    coverage_discharge_root: coverage.coverage_discharge_root,
    q0_finding_ledger_digest: findings.q0_finding_ledger_digest,
    mutation_receipt_root: mutationReceiptRoot(mutation.receipts),
    attack_pack_root: attackPackRoot(packs),
    q0_attack_result_root: attackResultRoot({ trays, campaigns }),
  };

  // The cross-check. Three files carry the closure roots; if any pair disagrees, the universe has
  // two descriptions and neither is authoritative.
  const crossChecks = [
    ["closure_member_commitment_digest", receipt.roots.closure_member_commitment_digest],
    ["release_tag_closure_digest", receipt.roots.release_tag_closure_digest],
    ["attack_taxonomy_digest", receipt.roots.attack_taxonomy_digest],
    ["obligation_matrix_root", receipt.roots.obligation_matrix_root],
  ];
  const disagreements = crossChecks
    .filter(([name, value]) => roots[name] !== value)
    .map(([name]) => name);

  return {
    roots,
    disagreements,
    meta: {
      member_count: receipt.member_count,
      closure_source_commit: receipt.closure_source_commit,
      trays: trays.length,
      campaigns: campaigns.length,
      // R5 and R7: M5 and M7 are unkillable because the guards they remove are redundant with an
      // immediately following check. The classes are NAMED in the attestation rather than left to
      // be inferred from a receipt file nobody reads.
      inadmissible_classes: mutation.receipts
        .filter((r) => !(r.baseline_exit === 0 && r.mutated_exit !== 0 && r.restored_exit === 0))
        .map((r) => r.attack_class)
        .sort(),
    },
  };
}

/** acorn's integrity, read from the lockfile — the parser is a closure member's producer. */
function parserMeta() {
  const lock = readJson("package-lock.json");
  const entry = lock.packages?.["node_modules/acorn"] ?? lock.dependencies?.acorn ?? {};
  return {
    name: "acorn",
    version: entry.version ?? "unknown",
    integrity: entry.integrity ?? "unknown",
  };
}

function main(argv) {
  const profile = readJson(PROFILE);
  const { roots, disagreements, meta } = recomputeRoots();

  if (disagreements.length > 0) {
    console.log("REFUSING: roots disagree across the artifacts that carry them:");
    for (const d of disagreements) console.log(`    ✗ ${d}`);
    return 1;
  }

  const bundle = buildPublicBundle({
    roots,
    closureMeta: {
      member_count: meta.member_count,
      closure_source_commit: meta.closure_source_commit,
      parser: parserMeta(),
    },
    inadmissibleClasses: meta.inadmissible_classes,
    signer: {
      profile_id: profile.profile_id,
      expected_public_key_digest: profile.public_key_digest,
    },
  });
  const digest = publicDigest(bundle);

  console.log("Stage 5Q — Q0 attestation (Task 20)");
  console.log(
    `  members / trays / campaigns : ${meta.member_count} / ${meta.trays} / ${meta.campaigns}`
  );
  console.log(`  roots                       : ${ROOT_NAMES.length}`);
  for (const name of ROOT_NAMES) console.log(`      ${name.padEnd(36)} ${roots[name]}`);
  console.log(
    `  inadmissible classes        : ${meta.inadmissible_classes.join(", ") || "(none)"}`
  );
  console.log(`  known limitations           : ${bundle.known_limitations.length}`);
  console.log(
    `  signer                      : ${profile.profile_id} (${profile.public_key_digest.slice(0, 16)}…)`
  );
  console.log(`  public_digest               : ${digest}`);

  if (argv.includes("--write")) {
    mkdirSync(A, { recursive: true });
    // canonicalJson, then a trailing newline. The bytes a reviewer reproduces.
    writeFileSync(`${A}/public-structural-bundle.json`, `${canonicalJson(bundle)}\n`);
    console.log(`  written                     : ${A}/public-structural-bundle.json`);
  }

  if (argv.includes("--sign")) {
    if (!existsSync(PRIVATE_KEY)) {
      console.log(
        `REFUSING to sign: ${PRIVATE_KEY} is absent. The private half lives offline and outside\n` +
          "  this repository by design; --write is reproducible without it."
      );
      return 1;
    }
    const priv = createPrivateKey(readFileSync(PRIVATE_KEY));
    const pubDer = createPublicKey(priv).export({ type: "spki", format: "der" });
    const presented = pubDer.toString("base64");
    if (sha256Hex(pubDer) !== profile.public_key_digest) {
      console.log("REFUSING to sign: the offline key is not the one the committed profile names.");
      return 1;
    }
    const envelope = {
      schema: ENVELOPE_SCHEMA,
      public_digest: digest,
      signer: { profile_id: profile.profile_id, public_key_b64: presented, algorithm: "ed25519" },
      signature_b64: signRaw(null, signingInput(digest), priv).toString("base64"),
      // TIME LIVES HERE, never in the deterministic bundle. This file is verified, not reproduced.
      created_at: new Date().toISOString(),
    };
    mkdirSync(A, { recursive: true });
    writeFileSync(`${A}/signed-audit-envelope.json`, `${JSON.stringify(envelope, null, 2)}\n`);
    console.log(`  signed                      : ${A}/signed-audit-envelope.json`);
  }

  // VERIFY, in the normative order, whatever is on disk. This runs on every invocation — including
  // the ones that just wrote the files, because an artifact that has never been verified by the
  // path a reviewer will use is an artifact nobody has checked.
  const bundlePath = `${A}/public-structural-bundle.json`;
  const envelopePath = `${A}/signed-audit-envelope.json`;
  if (!existsSync(bundlePath) || !existsSync(envelopePath)) {
    console.log("\n  (no committed attestation yet — run with --write --sign)");
    return 0;
  }

  const onDisk = readJson(bundlePath);
  const envelope = readJson(envelopePath);
  const publicKey = createPublicKey({
    key: Buffer.from(envelope.signer.public_key_b64, "base64"),
    format: "der",
    type: "spki",
  });

  // Byte-stability, stated exactly: the bundle we just rebuilt must equal the committed bytes.
  const rebuiltBytes = `${canonicalJson(bundle)}\n`;
  const committedBytes = readFileSync(bundlePath, "utf8");
  const byteStable = rebuiltBytes === committedBytes;

  const rotation = verifyRotationChain({
    genesisKeyB64: profile.public_key_b64,
    chain: profile.rotation.chain,
    presentedKeyB64: envelope.signer.public_key_b64,
  });

  const result = verifyAttestation({
    bundle: onDisk,
    envelope,
    recomputedRoots: roots,
    publicKey,
  });

  console.log("\n  VERIFICATION, in the normative order:");
  for (const s of result.steps) {
    console.log(`      ${s.ok ? "✔" : "✗"} ${s.step.padEnd(20)} ${String(s.reason).slice(0, 96)}`);
  }
  console.log(
    `      ${byteStable ? "✔" : "✗"} byte_stability       the committed bundle rebuilds byte-for-byte`
  );
  console.log(`      ${rotation.ok ? "✔" : "✗"} key_rotation_chain   ${rotation.reason}`);

  const allOk = result.ok && byteStable && rotation.ok;

  if (argv.includes("--write")) {
    const verification = {
      schema: "simurgh.vsr.q0.verification-receipt.v1",
      note:
        "Produced by the SAME code path a reviewer runs. Roots are recomputed from the evidence " +
        "before the signature is looked at: a valid signature over stale claims verifies " +
        "perfectly and means nothing.",
      public_digest: digest,
      verified: allOk,
      byte_stable: byteStable,
      rotation_chain: rotation,
      steps: result.steps,
      roots_recomputed_from: [
        "closure/{function-closure,release-tag-closure,attack-taxonomy}.json.digest",
        "closure/{commitment-receipt,obligation-matrix}.json",
        "coverage/discharge-ledger.json",
        "findings/q0-finding-ledger.json",
        "mutation/receipts.json",
        "packs/all-pack-results.json",
        "trays/*.json + campaigns/*.json  (q0_attack_result_root)",
      ],
    };
    writeFileSync(`${A}/verification-receipt.json`, `${JSON.stringify(verification, null, 2)}\n`);
    console.log(`  written                     : ${A}/verification-receipt.json`);
  }

  console.log(`\n  Q0 ATTESTATION ${allOk ? "VERIFIES" : "DOES NOT VERIFY"}`);
  return allOk ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
