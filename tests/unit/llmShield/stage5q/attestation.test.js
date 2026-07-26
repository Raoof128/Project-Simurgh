// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 20 — the Q0 attestation over ten roots.
//
// The failure this whole design exists to prevent has one shape: A VALID SIGNATURE OVER STALE
// CLAIMS. It verifies perfectly, it is cryptographically sound, and it says nothing — because
// nobody checked that the claims still describe the evidence. So the tests below are mostly about
// ORDER and about what the bundle is NOT allowed to contain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createPublicKey, createHash } from "node:crypto";
import {
  ROOT_NAMES,
  PUBLIC_SCHEMA,
  ENVELOPE_SCHEMA,
  KNOWN_LIMITATIONS,
  buildPublicBundle,
  publicDigest,
  signingInput,
  verifyAttestation,
  verifyRotationChain,
  attackResultRoot,
  mutationReceiptRoot,
  attackPackRoot,
} from "../../../../tools/simurgh-attestation/stage5q/core/attestation.mjs";
import { recomputeRoots } from "../../../../tools/simurgh-attestation/stage5q/node/attestation.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const E = "docs/research/llm-shield/evidence/stage-5q";
const A = `${E}/attestation`;
const PROFILE = "tools/simurgh-attestation/stage5q/signer/stage5q-signer-profile.json";

const profile = JSON.parse(readFileSync(PROFILE, "utf8"));
const hasAttestation =
  existsSync(`${A}/public-structural-bundle.json`) && existsSync(`${A}/signed-audit-envelope.json`);

const fakeRoots = () =>
  Object.fromEntries(ROOT_NAMES.map((n, i) => [n, String(i).repeat(64).slice(0, 64)]));
const fakeSigner = { profile_id: "p", expected_public_key_digest: "a".repeat(64) };
const fakeMeta = {
  member_count: 1,
  closure_source_commit: "0".repeat(40),
  parser: { name: "acorn", version: "8.17.0", integrity: "sha512-x" },
};
const build = (over = {}) =>
  buildPublicBundle({
    roots: fakeRoots(),
    closureMeta: fakeMeta,
    inadmissibleClasses: [],
    signer: fakeSigner,
    ...over,
  });

// ------------------------------------------------------------------------------------------------
// What the deterministic bundle may and may not contain.
// ------------------------------------------------------------------------------------------------

test("the bundle carries exactly TEN roots, and the list is exact in both directions", () => {
  assert.equal(ROOT_NAMES.length, 10);
  assert.deepEqual(Object.keys(build().roots).sort(), [...ROOT_NAMES].sort());
  // A ninth-root bundle is refused rather than emitted with a hole.
  const nine = fakeRoots();
  delete nine.q0_attack_result_root;
  assert.throws(() => build({ roots: nine }), /missing or not 64-hex/);
  // And an eleventh is refused too: a root list that grows silently stops covering what it claims.
  assert.throws(() => build({ roots: { ...fakeRoots(), invented: "b".repeat(64) } }), /EXACT/);
});

test("NO timestamp, NO signature, NO raw public key in the deterministic bundle", () => {
  // Any created_at breaks byte identity on the second run (P2-18). A raw key would be a third copy
  // of a value that must live in exactly one place (second gauntlet A2).
  const text = canonicalJson(build());
  for (const forbidden of ["created_at", "timestamp", "signature", "public_key_b64"]) {
    assert.equal(text.includes(forbidden), false, `the bundle contains '${forbidden}'`);
  }
  // It binds the signer WITHOUT embedding the key.
  assert.match(build().expected_public_key_digest, /^[0-9a-f]{64}$/);
  assert.ok(build().signer_profile_id);
});

test("inadmissible_classes is an ARRAY, empty when none, never absent", () => {
  // An absent field and an empty one must not look the same: absent reads as "not considered".
  assert.deepEqual(build().inadmissible_classes, []);
  assert.throws(() => build({ inadmissibleClasses: undefined }), /required and is an ARRAY/);
  assert.deepEqual(build({ inadmissibleClasses: ["R7", "R5"] }).inadmissible_classes, ["R5", "R7"]);
});

test("every §13 non-claim is published, including the one about zero findings", () => {
  assert.equal(KNOWN_LIMITATIONS.length, 9);
  const joined = KNOWN_LIMITATIONS.join(" | ");
  for (const claim of [
    "no vulnerabilities",
    "exhaustive",
    "penetration testing",
    "ground truth",
    "real-world identity",
    "frozen function, tag and attack closure",
    "environmental failure",
    "zero discovered findings is not itself a security result",
    "red team and the blue team are the same party",
  ]) {
    assert.ok(joined.includes(claim), `§13 non-claim absent: ${claim}`);
  }
  assert.deepEqual(build().known_limitations, [...KNOWN_LIMITATIONS].sort());
});

test("the bundle rebuilds byte-for-byte from the same inputs", () => {
  assert.equal(canonicalJson(build()), canonicalJson(build()));
  assert.equal(publicDigest(build()), publicDigest(build()));
});

// ------------------------------------------------------------------------------------------------
// Verification ORDER — the property the whole design turns on.
// ------------------------------------------------------------------------------------------------

test("the roots are checked FIRST: a perfect signature over stale claims fails", () => {
  const bundle = build();
  const digest = publicDigest(bundle);
  const envelope = {
    schema: ENVELOPE_SCHEMA,
    public_digest: digest,
    signer: { profile_id: "p", public_key_b64: "", algorithm: "ed25519" },
    signature_b64: "",
  };
  // The evidence has moved; the bundle has not. Everything downstream — digest, signer, signature
  // — could be flawless and it must still fail, at the FIRST step.
  const drifted = { ...fakeRoots(), coverage_discharge_root: "f".repeat(64) };
  const r = verifyAttestation({ bundle, envelope, recomputedRoots: drifted, publicKey: null });
  assert.equal(r.ok, false);
  assert.equal(r.steps.at(-1).step, "roots_recompute");
  assert.match(r.steps.at(-1).reason, /coverage_discharge_root/);
});

test("tampering ANY ONE of the ten roots breaks verification", () => {
  const bundle = build();
  const envelope = { public_digest: publicDigest(bundle), signer: {}, signature_b64: "" };
  // The tamper value must not collide with any fixture root. `"9".repeat(64)` did: `fakeRoots()`
  // numbers its tenth entry with 9s, so "tampering" it wrote back the value it already had and the
  // test failed for the right reason — nothing had changed.
  const TAMPER = "deadbeef".repeat(8);
  assert.equal(Object.values(fakeRoots()).includes(TAMPER), false, "the tamper value must be new");
  for (const name of ROOT_NAMES) {
    const tampered = { ...fakeRoots(), [name]: TAMPER };
    const r = verifyAttestation({ bundle, envelope, recomputedRoots: tampered, publicKey: null });
    assert.equal(r.ok, false, `tampering ${name} was not detected`);
    assert.match(r.steps.at(-1).reason, new RegExp(name));
  }
});

test("a missing §13 non-claim fails verification even when every root agrees", () => {
  const bundle = build();
  bundle.known_limitations = bundle.known_limitations.filter(
    (l) => !l.includes("zero discovered findings")
  );
  const envelope = { public_digest: publicDigest(bundle), signer: {}, signature_b64: "" };
  const r = verifyAttestation({ bundle, envelope, recomputedRoots: fakeRoots(), publicKey: null });
  assert.equal(r.ok, false);
  assert.equal(r.steps.at(-1).step, "limitations_complete");
});

test("an envelope presenting a DIFFERENT key is refused before the signature is looked at", () => {
  // A valid signature by the wrong party is still the wrong party.
  const bundle = build();
  const envelope = {
    public_digest: publicDigest(bundle),
    signer: { public_key_b64: Buffer.from("some other key").toString("base64") },
    signature_b64: "",
  };
  const r = verifyAttestation({ bundle, envelope, recomputedRoots: fakeRoots(), publicKey: null });
  assert.equal(r.ok, false);
  assert.equal(r.steps.at(-1).step, "signer_binding");
});

test("the signing input is domain-separated", () => {
  const input = signingInput("a".repeat(64));
  assert.ok(input.includes(Buffer.from([0x00])), "a 0x00 separator");
  assert.ok(input.subarray(0, ENVELOPE_SCHEMA.length).toString() === ENVELOPE_SCHEMA);
});

// ------------------------------------------------------------------------------------------------
// The rotation chain — Q1 depends on it.
// ------------------------------------------------------------------------------------------------

test("an EMPTY chain is valid only when the presented key IS the genesis key", () => {
  assert.equal(
    verifyRotationChain({ genesisKeyB64: "G", chain: [], presentedKeyB64: "G" }).ok,
    true
  );
  assert.equal(
    verifyRotationChain({ genesisKeyB64: "G", chain: [], presentedKeyB64: "X" }).ok,
    false
  );
});

test("an absent chain is not an empty chain", () => {
  assert.equal(verifyRotationChain({ genesisKeyB64: "G", presentedKeyB64: "G" }).ok, false);
});

test("a rotation not signed by the OUTGOING key is refused", () => {
  // Otherwise anyone holding any key could declare themselves the successor.
  const r = verifyRotationChain({
    genesisKeyB64: "G",
    chain: [
      {
        schema: "simurgh.vsr.q0.key-rotation.v1",
        from_public_key_b64: "G",
        to_public_key_b64: "H",
        signature_b64: "AAAA",
      },
    ],
    presentedKeyB64: "H",
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /not signed by the outgoing key/);
});

// ------------------------------------------------------------------------------------------------
// The roots are computed from the evidence, not from each other.
// ------------------------------------------------------------------------------------------------

test("q0_attack_result_root moves when a clean observation is deleted", () => {
  // The hole this root closes: a clean tray row could be edited or removed and no root moved. In a
  // stage whose headline non-claim is "zero findings is not a security result", the zero-finding
  // evidence was the one artifact nobody committed.
  const tray = {
    tray_id: "tray-5a",
    closure_digest: "d",
    attack_pack_ids: ["p"],
    finding_ids: [],
    coverage_statuses: {},
    positive_path_result: { result: "reproduced" },
    summary: "s",
    obligation_receipts: [
      {
        function_id: "f",
        attack_class: "R1",
        observed_outcome: "refused_as_expected",
        discharge_status: "attacked_pass",
      },
      {
        function_id: "g",
        attack_class: "R8",
        observed_outcome: "refused_as_expected",
        discharge_status: "attacked_pass",
      },
    ],
  };
  const full = attackResultRoot({ trays: [tray], campaigns: [] });
  const pruned = attackResultRoot({
    trays: [{ ...tray, obligation_receipts: tray.obligation_receipts.slice(0, 1) }],
    campaigns: [],
  });
  assert.notEqual(full, pruned, "deleting a clean observation did not move the root");
});

test("mutation_receipt_root moves when a green->red->green witness is altered", () => {
  const receipts = [
    {
      mutant_id: "M1",
      attack_class: "R1",
      target_function_id: "f",
      baseline_exit: 0,
      mutated_exit: 1,
      restored_exit: 0,
    },
  ];
  const altered = [{ ...receipts[0], mutated_exit: 0 }];
  assert.notEqual(mutationReceiptRoot(receipts), mutationReceiptRoot(altered));
});

test("attack_pack_root covers DEFINITIONS and premises, never verdicts", () => {
  // Keeping them apart is what makes "the packs were these" and "the packs found this" two
  // separately falsifiable statements.
  const base = {
    families: [
      { pack_id: "p", family_id: "f", attack_class: "R8", categories: ["x"], intent: "i" },
    ],
    discharges: [
      {
        function_id: "a",
        attack_class: "R8",
        pack_id: "p",
        premise_receipt_digest: "d",
        observed_outcome: "refused_as_expected",
      },
    ],
  };
  const verdictChanged = {
    ...base,
    discharges: [{ ...base.discharges[0], observed_outcome: "unexpectedly_accepted" }],
  };
  const premiseChanged = {
    ...base,
    discharges: [{ ...base.discharges[0], premise_receipt_digest: "other" }],
  };
  assert.equal(
    attackPackRoot(base),
    attackPackRoot(verdictChanged),
    "a verdict is not a definition"
  );
  assert.notEqual(attackPackRoot(base), attackPackRoot(premiseChanged), "a premise IS");
});

// ------------------------------------------------------------------------------------------------
// The committed attestation.
// ------------------------------------------------------------------------------------------------

test("the committed bundle rebuilds byte-for-byte from the evidence", () => {
  if (!hasAttestation) return;
  const { roots } = recomputeRoots();
  const committed = JSON.parse(readFileSync(`${A}/public-structural-bundle.json`, "utf8"));
  assert.deepEqual(committed.roots, roots, "a root drifted from the evidence");
  assert.equal(committed.schema, PUBLIC_SCHEMA);
  assert.equal(
    readFileSync(`${A}/public-structural-bundle.json`, "utf8"),
    `${canonicalJson(committed)}\n`
  );
});

test("the committed envelope verifies, and its signer is the committed profile", () => {
  if (!hasAttestation) return;
  const bundle = JSON.parse(readFileSync(`${A}/public-structural-bundle.json`, "utf8"));
  const envelope = JSON.parse(readFileSync(`${A}/signed-audit-envelope.json`, "utf8"));
  const publicKey = createPublicKey({
    key: Buffer.from(envelope.signer.public_key_b64, "base64"),
    format: "der",
    type: "spki",
  });
  const { roots } = recomputeRoots();
  const r = verifyAttestation({ bundle, envelope, recomputedRoots: roots, publicKey });
  assert.equal(r.ok, true, JSON.stringify(r.steps.at(-1)));
  assert.equal(
    envelope.signer.public_key_b64,
    profile.public_key_b64,
    "a key the profile does not name"
  );
  assert.equal(
    createHash("sha256")
      .update(Buffer.from(envelope.signer.public_key_b64, "base64"))
      .digest("hex"),
    profile.public_key_digest
  );
});

test("the committed attestation records R5 and R7 as inadmissible", () => {
  // M5 and M7 are unkillable because the guards they remove are redundant with an immediately
  // following check. The classes are NAMED rather than left to be inferred from a receipt file.
  if (!hasAttestation) return;
  const bundle = JSON.parse(readFileSync(`${A}/public-structural-bundle.json`, "utf8"));
  assert.deepEqual(bundle.inadmissible_classes, ["R5", "R7"]);
});

test("the signer profile keeps the private half out of the repository", () => {
  assert.match(profile.lifecycle.private_half, /offline, outside the repository/);
  assert.equal(JSON.stringify(profile).includes("PRIVATE KEY"), false);
  // Retained through Q1: destroying the only key after Q0 makes authenticated append impossible,
  // and Q1-F001 is already scheduled (gauntlet P0-16).
  assert.match(profile.lifecycle.retained_until, /Q1/);
  assert.deepEqual(profile.rotation.chain, []);
});

test("no private key material anywhere in the committed attestation", () => {
  if (!hasAttestation) return;
  for (const file of [
    "public-structural-bundle.json",
    "signed-audit-envelope.json",
    "verification-receipt.json",
  ]) {
    const text = readFileSync(`${A}/${file}`, "utf8");
    assert.equal(/PRIVATE KEY|BEGIN OPENSSH/.test(text), false, `${file} carries key material`);
  }
});
