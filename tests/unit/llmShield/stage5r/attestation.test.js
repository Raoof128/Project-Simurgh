// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 24: the campaign attestation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { verify as verifyRaw } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  ROOT_NAMES,
  RESULT_STATE_MAP,
  SIGNER_ID,
  PUBLIC_SCHEMA,
  ENVELOPE_SCHEMA,
  buildPublicBundle,
  familyResultRoot,
  controlReceiptRoot,
  publicDigest,
  signingInput,
  verifyAttestation,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage5r/core/attestation.mjs";
import {
  recomputeRoots,
  buildBundle,
  ENVELOPE_PATH,
  PROFILE_PATH,
} from "../../../../tools/simurgh-attestation/stage5r/node/attestStage5r.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const pairs = JSON.parse(
  readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign/pair-results.json"),
    "utf8"
  )
).pairs;
const campaign = JSON.parse(
  readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-5r/campaign/campaign-result.json"),
    "utf8"
  )
);

test("seven roots, in §10.1's order, and the order is committed", () => {
  const bundle = buildBundle();
  assert.deepEqual(Object.keys(bundle.roots), [...ROOT_NAMES]);
  assert.deepEqual(bundle.root_order_is_part_of_the_contract, [...ROOT_NAMES]);
  for (const n of ROOT_NAMES) assert.match(bundle.roots[n], /^[0-9a-f]{64}$/, n);
});

test("THE ATTESTED BOUNDARY IS STATED, and it excludes what does not exist yet", () => {
  const b = buildBundle();
  assert.equal(b.schema, PUBLIC_SCHEMA);
  assert.equal(b.attested_boundary.covers.length, 7);
  const excluded = b.attested_boundary.does_not_cover.join(" ");
  for (const term of ["parity", "K7", "red states", "closeout"]) {
    assert.match(excluded, new RegExp(term), `${term} must be named as excluded`);
  }
});

test("the result root is TOTAL over 55 and refuses anything else", () => {
  const r = familyResultRoot(pairs);
  assert.equal(r.rows.length, 55);
  assert.throws(() => familyResultRoot(pairs.slice(1)), /54 rows/);
  const states = new Set(r.rows.map((x) => x.terminal_state));
  for (const s of states) assert.ok(Object.values(RESULT_STATE_MAP).includes(s), s);
  // The campaign's word and the spec's word for the same fact are mapped, not silently renamed.
  assert.equal(RESULT_STATE_MAP.admissible, "attempted_admissible");
  assert.throws(
    () => familyResultRoot(pairs.map((p, i) => (i === 0 ? { ...p, terminal_state: "fine" } : p))),
    /not one of §10.1's three terminal states/
  );
});

test("the control receipt root demands THREE receipts per family — no optional control", () => {
  assert.match(controlReceiptRoot(campaign.families), /^[0-9a-f]{64}$/);
  const short = campaign.families.map((f, i) =>
    i === 0 ? { ...f, lane_b_receipts: f.lane_b_receipts.slice(1) } : f
  );
  assert.throws(() => controlReceiptRoot(short), /has 2 receipts; there is no optional control/);
});

test("an unknown or missing root is refused rather than ignored", () => {
  const { roots, counts } = recomputeRoots();
  assert.throws(
    () => buildPublicBundle({ roots: { ...roots, extra: "x" }, counts }),
    /unknown root/
  );
  const { family_result_root: _drop, ...fewer } = roots;
  assert.throws(() => buildPublicBundle({ roots: fewer, counts }), /missing root/);
});

test("the bundle is deterministic", () => {
  assert.equal(publicDigest(buildBundle()), publicDigest(buildBundle()));
});

// ---- the signed envelope -------------------------------------------------------------------------

const envPath = join(ROOT, ENVELOPE_PATH);
const profile = JSON.parse(readFileSync(join(ROOT, PROFILE_PATH), "utf8"));

const verifySignature = ({ input, envelope }) => {
  const presented = Buffer.from(envelope.signer.public_key_b64, "base64");
  if (sha256Hex(presented) !== profile.public_key_digest) {
    return { ok: false, reason: "not the committed genesis key" };
  }
  const ok = verifyRaw(
    null,
    input,
    { key: presented, format: "der", type: "spki" },
    Buffer.from(envelope.signature_b64, "base64")
  );
  return ok ? { ok: true } : { ok: false, reason: "signature does not verify" };
};

test("the committed envelope verifies against roots rebuilt from the evidence", () => {
  if (!existsSync(envPath)) return;
  const envelope = JSON.parse(readFileSync(envPath, "utf8"));
  assert.equal(envelope.schema, ENVELOPE_SCHEMA);
  assert.equal(envelope.signer.profile_id, SIGNER_ID);
  const r = verifyAttestation({ envelope, rebuiltRoots: recomputeRoots().roots, verifySignature });
  assert.equal(r.ok, true, r.reason);
});

test("A MUTATED ROOT IS REFUSED BEFORE THE SIGNATURE IS EXAMINED", () => {
  // The order is the point: a verifier that checks the signature first reports "signature valid"
  // about a bundle whose contents no longer describe the evidence.
  if (!existsSync(envPath)) return;
  const envelope = JSON.parse(readFileSync(envPath, "utf8"));
  const roots = { ...recomputeRoots().roots, delta_ledger_digest: "0".repeat(64) };
  let signatureWasExamined = false;
  const r = verifyAttestation({
    envelope,
    rebuiltRoots: roots,
    verifySignature: () => {
      signatureWasExamined = true;
      return { ok: true };
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, "roots");
  assert.equal(signatureWasExamined, false, "the signature was reached despite a bad root");
});

test("a fixture-signed bundle is refused — a valid signature by the wrong key is not a signature", () => {
  if (!existsSync(envPath)) return;
  const envelope = JSON.parse(readFileSync(envPath, "utf8"));
  const forged = {
    ...envelope,
    signer: { ...envelope.signer, public_key_b64: Buffer.alloc(44, 7).toString("base64") },
  };
  const r = verifyAttestation({
    envelope: forged,
    rebuiltRoots: recomputeRoots().roots,
    verifySignature,
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, "signature");
});

test("a wrong signer id is refused", () => {
  if (!existsSync(envPath)) return;
  const envelope = JSON.parse(readFileSync(envPath, "utf8"));
  const swapped = {
    ...envelope,
    signer: { ...envelope.signer, profile_id: "stage5q-vsr-genesis" },
  };
  const r = verifyAttestation({
    envelope: swapped,
    rebuiltRoots: recomputeRoots().roots,
    verifySignature,
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, "signer");
});

test("THE SIGNER PROFILE CARRIES NO PRIVATE KEY, and says verification needs none", () => {
  const text = readFileSync(join(ROOT, PROFILE_PATH), "utf8");
  assert.ok(!/PRIVATE KEY/.test(text), "a private key is in the repository");
  assert.equal(profile.verification_needs_no_private_key, true);
  assert.equal(profile.profile_id, SIGNER_ID);
  assert.match(profile.public_key_digest, /^[0-9a-f]{64}$/);
  assert.match(profile.note, /never committed/);
});

test("the signing input is the digest, not the file, and its separator is a NUL", () => {
  const b = buildBundle();
  assert.equal(signingInput(b).toString("utf8"), `${ENVELOPE_SCHEMA}\u0000${publicDigest(b)}`);
  // Domain separation, for the same reason every other digest in this stage carries it: without a
  // separator, a schema ending in "ab" over digest "c" signs the same bytes as "a" over "bc".
  assert.ok(signingInput(b).includes(0x00));
});
