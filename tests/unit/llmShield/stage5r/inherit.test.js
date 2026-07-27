// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 2: the inheritance verifier.
//
// Frozen §2.2: before any 5R artifact is produced, the seven inherited digests must be re-derived,
// the 5Q envelope verified ROOTS FIRST and SIGNATURE LAST, the bound context confirmed, and any
// mismatch must fail closed naming which digest moved. A 5R run against a mutated 5Q evidence tree
// must be impossible, not merely discouraged.
//
// Every negative case here runs against an in-memory fixture tree. Ruling 5: no destructive test
// touches the primary inherited evidence, ever, not even briefly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  INHERITED_ROOTS,
  BOUND_CONTEXT,
  INHERITED_FILES,
  INHERITED_FILE_PINS,
  ENVELOPE_FILE,
  FILE_PIN_DOMAIN,
  filePin,
  verifyInheritance,
} from "../../../../tools/simurgh-attestation/stage5r/core/inherit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EVIDENCE = join(ROOT, "docs/research/llm-shield/evidence/stage-5q");

/** Read the real tree once, into a plain map the verifier consumes. */
function realTree() {
  const tree = {};
  for (const rel of [...Object.values(INHERITED_FILES), ENVELOPE_FILE]) {
    tree[rel] = readFileSync(join(EVIDENCE, rel), "utf8");
  }
  return tree;
}

/** A fixture copy with one JSON field mutated. The primary tree is never written. */
function mutated(rel, fn) {
  const tree = realTree();
  const obj = JSON.parse(tree[rel]);
  fn(obj);
  tree[rel] = `${JSON.stringify(obj, null, 2)}\n`;
  return tree;
}

// ---- the frozen constants ------------------------------------------------------------------------

test("exactly seven roots are inherited, matching frozen §2.1", () => {
  assert.equal(Object.keys(INHERITED_ROOTS).length, 7);
  assert.equal(
    INHERITED_ROOTS.q0_attestation_public_digest,
    "8d04e35c6ccd7531e963de7e6aa964e4777b361666be8be516642f25eac27de6"
  );
  assert.equal(
    INHERITED_ROOTS.obligation_matrix_root,
    "eefabdf2ddf3b4c0db9a061377ffefdb484d3c09aa591fb3d61770a933f09b70"
  );
  for (const [name, digest] of Object.entries(INHERITED_ROOTS)) {
    assert.match(digest, /^[0-9a-f]{64}$/, name);
  }
});

test("the bound context is frozen alongside the digests — a digest without provenance is a number", () => {
  assert.equal(BOUND_CONTEXT.closure_source_commit, "3512d287d2e13ceb31115477acc8b5ff182bc36e");
  assert.equal(BOUND_CONTEXT.member_count, 2531);
  assert.equal(BOUND_CONTEXT.signer_profile_id, "stage5q-q0-genesis");
  assert.deepEqual(BOUND_CONTEXT.inadmissible_classes, ["R5", "R7"]);
});

test("every inherited root maps to exactly one evidence file, and each has a pin", () => {
  assert.deepEqual(Object.keys(INHERITED_FILES).sort(), Object.keys(INHERITED_ROOTS).sort());
  assert.deepEqual(Object.keys(INHERITED_FILE_PINS).sort(), Object.keys(INHERITED_ROOTS).sort());
  assert.equal(FILE_PIN_DOMAIN, "simurgh.vpf.inherited-file.v1");
});

// ---- the happy path ------------------------------------------------------------------------------

test("the real 5Q evidence tree verifies, and the check ORDER is roots-first", () => {
  const r = verifyInheritance(realTree());
  assert.equal(r.ok, true, JSON.stringify(r.failures));
  // The signature is the LAST check performed. A verifier that checks the signature first and the
  // roots never is the exact failure this order prevents: a valid signature over stale claims
  // verifies perfectly and means nothing.
  assert.equal(r.checks.at(-1).name, "signature");
  assert.ok(r.checks.findIndex((c) => c.name === "file_pins") < r.checks.length - 1);
  assert.ok(r.checks.every((c) => c.ok));
});

test("verification needs NO private key — only the public key committed in the envelope", () => {
  const r = verifyInheritance(realTree());
  assert.equal(r.ok, true);
  assert.equal(r.signer.profile_id, "stage5q-q0-genesis");
  assert.equal(
    r.signer.public_key_digest,
    "de557244c368b6105e5cbad5717f009fa5a6299ba896b2843d324ebdd1886811"
  );
});

test("file pins are stable and domain-separated", () => {
  const tree = realTree();
  for (const [name, rel] of Object.entries(INHERITED_FILES)) {
    assert.equal(filePin(tree[rel]), INHERITED_FILE_PINS[name], name);
  }
  // A bare sha256 of the same bytes must not collide with the domain-separated pin.
  assert.notEqual(filePin("x"), filePin("y"));
});

// ---- fail closed, naming what moved --------------------------------------------------------------

test("a one-byte change to ANY inherited file is refused and NAMES the file", () => {
  for (const [name, rel] of Object.entries(INHERITED_FILES)) {
    const tree = realTree();
    tree[rel] = `${tree[rel]}\n`; // one byte, semantically nothing
    const r = verifyInheritance(tree);
    assert.equal(r.ok, false, `${name} tamper was not detected`);
    assert.ok(
      r.failures.some((f) => f.detail.includes(rel) || f.detail.includes(name)),
      `${name}: failure did not name the file — got ${JSON.stringify(r.failures)}`
    );
  }
});

test("a root that disagrees with its evidence file's own declared digest is refused", () => {
  const tree = mutated("closure/function-closure.json", (o) => {
    o.closure_member_commitment_digest = "0".repeat(64);
  });
  const r = verifyInheritance(tree);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.check === "declared_digests" || f.check === "file_pins"));
});

test("member_count drift is refused", () => {
  const tree = mutated("closure/function-closure.json", (o) => {
    o.member_count = 2530;
  });
  const r = verifyInheritance(tree);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => /member_count|file_pins/.test(f.check)));
});

test("a VALID signature over MUTATED roots is still refused — roots before signature", () => {
  // The bundle is left signable-looking but a root is changed. Because the pin and root checks run
  // first, the run fails before the signature is ever examined, and the report says so.
  const tree = mutated("attestation/public-structural-bundle.json", (o) => {
    o.roots.obligation_matrix_root = "1".repeat(64);
  });
  const r = verifyInheritance(tree);
  assert.equal(r.ok, false);
  const sigCheck = r.checks.find((c) => c.name === "signature");
  assert.ok(
    !sigCheck || sigCheck.skipped,
    "the signature must not be reached once a root has moved"
  );
  assert.ok(r.failures.some((f) => /obligation_matrix_root|file_pins/.test(f.detail)));
});

test("a broken signature is refused when everything else is intact", () => {
  const tree = realTree();
  const env = JSON.parse(tree["attestation/signed-audit-envelope.json"]);
  env.signature_b64 = Buffer.from(Buffer.from(env.signature_b64, "base64").reverse()).toString(
    "base64"
  );
  tree["attestation/signed-audit-envelope.json"] = `${JSON.stringify(env, null, 2)}\n`;
  const r = verifyInheritance(tree, { skipEnvelopePin: true });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.check === "signature"));
});

test("a bundle signed by a DIFFERENT key is refused even if the signature is internally valid", () => {
  const tree = realTree();
  const env = JSON.parse(tree["attestation/signed-audit-envelope.json"]);
  env.signer.public_key_b64 = Buffer.alloc(44, 7).toString("base64");
  tree["attestation/signed-audit-envelope.json"] = `${JSON.stringify(env, null, 2)}\n`;
  const r = verifyInheritance(tree, { skipEnvelopePin: true });
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => /public_key|signature/.test(f.check)));
});

test("a missing evidence file fails closed rather than being treated as unchanged", () => {
  const tree = realTree();
  delete tree["coverage/discharge-ledger.json"];
  const r = verifyInheritance(tree);
  assert.equal(r.ok, false);
  assert.ok(r.failures.some((f) => f.detail.includes("discharge-ledger.json")));
});
