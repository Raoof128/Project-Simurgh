// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — K7-B: attestation and closure cross-binding (Task 20.5).
//
// K7 SPLIT IN TWO BECAUSE THE ORIGINAL CREATED A CYCLE (gauntlet P0-12). It was committed at 18.2
// and had to verify the Task 20 attestation, while Task 20 claimed to cover K7. Whichever ran
// first was verifying something that did not exist yet.
//
//     K7-A   BEFORE Task 20    export census + invocation coverage. Task 20 signs its result.
//     K7-B   AFTER  Task 21    THIS FILE. Verifies the completed attestation. It is part of the
//                              reproduction receipt, NOT a prerequisite of the signature it checks.
//
// The question K7-B asks is narrow and is not asked anywhere else: DOES EVERY ROOT IN THE SIGNED
// ATTESTATION ACTUALLY BIND THE ARTIFACT IT NAMES? Each of the ten is a 64-hex string, and a
// 64-hex string is a claim about bytes only if somebody re-derives it from those bytes. The
// attestation driver does that; this net does it again, independently, from the file paths rather
// than from the driver's own accounting — because a driver that computed a root wrongly would
// verify its own mistake perfectly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash, createPublicKey } from "node:crypto";
import {
  ROOT_NAMES,
  KNOWN_LIMITATIONS,
  verifyAttestation,
  attackResultRoot,
  mutationReceiptRoot,
  attackPackRoot,
  publicDigest,
} from "../../../../tools/simurgh-attestation/stage5q/core/attestation.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const A = `${E}/attestation`;
const PROFILE = "tools/simurgh-attestation/stage5q/signer/stage5q-signer-profile.json";

const present =
  existsSync(`${A}/public-structural-bundle.json`) && existsSync(`${A}/signed-audit-envelope.json`);

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readDir = (d) =>
  readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => readJson(`${d}/${f}`));

test("K7-B: the signed attestation exists and is the artifact a reviewer runs against", () => {
  assert.equal(present, true, "no signed Q0 attestation");
  assert.ok(existsSync(`${A}/verification-receipt.json`), "no verification receipt");
});

test("K7-B: every one of the ten roots binds the artifact it names", () => {
  if (!present) return;
  const bundle = readJson(`${A}/public-structural-bundle.json`);

  // Re-derived HERE, from the paths, without going through the attestation driver. If the driver
  // computed a root wrongly it would verify its own mistake; this is the second opinion.
  const independent = {
    closure_member_commitment_digest: readFileSync(
      `${E}/closure/function-closure.json.digest`,
      "utf8"
    ).trim(),
    release_tag_closure_digest: readFileSync(
      `${E}/closure/release-tag-closure.json.digest`,
      "utf8"
    ).trim(),
    attack_taxonomy_digest: readFileSync(`${E}/closure/attack-taxonomy.json.digest`, "utf8").trim(),
    historical_function_closure_digest: readJson(`${E}/closure/commitment-receipt.json`).roots
      .historical_function_closure_digest,
    obligation_matrix_root: readJson(`${E}/closure/obligation-matrix.json`).obligation_matrix_root,
    coverage_discharge_root: readJson(`${E}/coverage/discharge-ledger.json`)
      .coverage_discharge_root,
    q0_finding_ledger_digest: readJson(`${E}/findings/q0-finding-ledger.json`)
      .q0_finding_ledger_digest,
    mutation_receipt_root: mutationReceiptRoot(readJson(`${E}/mutation/receipts.json`).receipts),
    attack_pack_root: attackPackRoot(readJson(`${E}/packs/all-pack-results.json`)),
    q0_attack_result_root: attackResultRoot({
      trays: readDir(`${E}/trays`),
      campaigns: readDir(`${E}/campaigns`),
    }),
  };

  for (const name of ROOT_NAMES) {
    assert.equal(bundle.roots[name], independent[name], `${name} does not bind its artifact`);
  }
});

test("K7-B: the closure root in the attestation is the SAME universe the trays were bound to", () => {
  // Cross-binding, not just recomputation. Sixteen trays each carry a closure digest; if any names
  // a different universe than the attestation does, the attestation covers a set the attacks were
  // never run against.
  if (!present) return;
  const bundle = readJson(`${A}/public-structural-bundle.json`);
  const trays = readDir(`${E}/trays`);
  assert.equal(trays.length, 16);
  for (const tray of trays) {
    assert.equal(
      tray.closure_digest,
      bundle.roots.closure_member_commitment_digest,
      `${tray.tray_id} is bound to a different universe than the attestation`
    );
  }
  assert.equal(
    readJson(`${E}/coverage/discharge-ledger.json`).closure_digest,
    bundle.roots.closure_member_commitment_digest
  );
  assert.equal(
    readJson(`${E}/findings/q0-finding-ledger.json`).closure_digest,
    bundle.roots.closure_member_commitment_digest
  );
});

test("K7-B: the signature verifies over the digest of the committed bytes", () => {
  if (!present) return;
  const bundle = readJson(`${A}/public-structural-bundle.json`);
  const envelope = readJson(`${A}/signed-audit-envelope.json`);
  const bytes = readFileSync(`${A}/public-structural-bundle.json`, "utf8");

  // The bytes on disk must BE the canonical form. If the file were pretty-printed, the digest a
  // reviewer computes from the file would differ from the one the envelope signed.
  assert.equal(bytes, `${canonicalJson(bundle)}\n`);
  assert.equal(envelope.public_digest, publicDigest(bundle));
  assert.equal(
    envelope.public_digest,
    createHash("sha256").update(Buffer.from(bytes.trimEnd(), "utf8")).digest("hex")
  );

  const publicKey = createPublicKey({
    key: Buffer.from(envelope.signer.public_key_b64, "base64"),
    format: "der",
    type: "spki",
  });
  const r = verifyAttestation({
    bundle,
    envelope,
    recomputedRoots: bundle.roots,
    publicKey,
  });
  assert.equal(r.ok, true, JSON.stringify(r.steps.at(-1)));
});

test("K7-B: the envelope's signer is the one and only committed profile", () => {
  if (!present) return;
  const profile = readJson(PROFILE);
  const envelope = readJson(`${A}/signed-audit-envelope.json`);
  const bundle = readJson(`${A}/public-structural-bundle.json`);
  assert.equal(envelope.signer.public_key_b64, profile.public_key_b64);
  assert.equal(bundle.expected_public_key_digest, profile.public_key_digest);
  assert.equal(bundle.signer_profile_id, profile.profile_id);
  // Exactly one committed copy of the public key: the profile. The bundle carries only a digest.
  assert.equal(canonicalJson(bundle).includes(profile.public_key_b64), false);
});

test("K7-B: the attestation's non-claims survive into the artifact a reader sees", () => {
  if (!present) return;
  const bundle = readJson(`${A}/public-structural-bundle.json`);
  assert.deepEqual(bundle.known_limitations, [...KNOWN_LIMITATIONS].sort());
  assert.ok(
    bundle.known_limitations.some((l) => l.includes("zero discovered findings")),
    "the one non-claim this whole stage turns on"
  );
});

test("K7-B: the verification receipt was produced by the reviewer's code path, and is honest", () => {
  if (!present) return;
  const receipt = readJson(`${A}/verification-receipt.json`);
  assert.equal(receipt.verified, true);
  assert.equal(receipt.byte_stable, true);
  // The FIRST recorded step must be the root recomputation. A receipt whose first step is the
  // signature documents a verifier that checked the roots never.
  assert.equal(receipt.steps[0].step, "roots_recompute");
  assert.equal(receipt.rotation_chain.ok, true);
});

test("K7-B: the attestation does NOT claim coverage the coverage ledger denies", () => {
  // The cross-binding that matters most here. L1 is not certified — 1438 of 23332 obligated cells
  // discharged — and nothing in the signed bundle may read as if it were. The bundle carries roots
  // and non-claims; it carries no coverage percentage, no "complete", no "verified secure".
  if (!present) return;
  const coverage = readJson(`${E}/coverage/discharge-ledger.json`);
  const text = readFileSync(`${A}/public-structural-bundle.json`, "utf8").toLowerCase();
  if (coverage.l1_certified === false) {
    for (const forbidden of ["complete", "secure", "no vulnerabilities", "fully covered"]) {
      // `complete only over the frozen ... closure` is a §13 NON-claim and is allowed; it is the
      // bare word used as an assertion that is not.
      const bare = new RegExp(`"[^"]*\\b${forbidden}\\b[^"]*"`, "g");
      for (const hit of text.match(bare) ?? []) {
        assert.ok(
          KNOWN_LIMITATIONS.some((l) => hit.includes(l.toLowerCase().slice(0, 30))),
          `the bundle asserts '${forbidden}' outside the §13 non-claims: ${hit.slice(0, 90)}`
        );
      }
    }
  }
});
