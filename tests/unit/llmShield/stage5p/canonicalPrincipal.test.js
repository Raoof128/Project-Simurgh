// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 1 — the canonical principal.
//
// The whole point of this module is what it REFUSES to do. Principal equality is exact equality of
// four validated fields; there is no friendly parser, no normalisation, no repair. "Close enough,
// probably Alice" is how identity soup starts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRINCIPAL_KINDS,
  PRINCIPAL_TYPE,
  makePrincipal,
  principalCanonicalBytes,
  principalsEqual,
  deriveSubjectId,
} from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";

const NS = "simurgh.synthetic.oidc-subject.v1";
const HEX = "a".repeat(64);
const OK = { type: PRINCIPAL_TYPE, kind: "account", namespace_id: NS, subject_id: HEX };

test("the four kinds are exactly the frozen set", () => {
  assert.deepEqual(PRINCIPAL_KINDS, ["account", "person", "organisation", "service"]);
  for (const kind of PRINCIPAL_KINDS) assert.ok(makePrincipal({ ...OK, kind }));
  assert.throws(() => makePrincipal({ ...OK, kind: "department" }), /kind/);
});

// ---- exact-object hardening: makePrincipal is a gate, not a parser -------------------------

test("rejects null, arrays, strings, and non-plain objects", () => {
  assert.throws(() => makePrincipal(null), /object/);
  assert.throws(() => makePrincipal([OK]), /object/);
  assert.throws(() => makePrincipal(`${PRINCIPAL_TYPE}:account:${NS}:${HEX}`), /object/);
  class Fake {}
  assert.throws(() => makePrincipal(Object.assign(new Fake(), OK)), /plain object/);
});

// Prototype smuggling is defeated STRUCTURALLY: only Object.prototype and null prototypes are
// admitted, so an object carrying an inherited field never reaches the key scan at all. Both halves
// are asserted, because "it was rejected" is not the same claim as "the key was invisible".
test("a prototype-bearing object is rejected outright, before any key is read", () => {
  const smuggled = Object.create({ subject_id: HEX });
  smuggled.type = PRINCIPAL_TYPE;
  smuggled.kind = "account";
  smuggled.namespace_id = NS;
  // PREMISE: the inherited field really is readable on this object, and really is not an own key.
  assert.equal(smuggled.subject_id, HEX, "PREMISE FAILED: prototype field not visible");
  assert.equal(Object.prototype.hasOwnProperty.call(smuggled, "subject_id"), false);
  assert.throws(() => makePrincipal(smuggled), /plain object/);
});

test("own keys only — a null-prototype object missing a key fails on that key", () => {
  const bare = Object.create(null);
  Object.assign(bare, { type: PRINCIPAL_TYPE, kind: "account", namespace_id: NS });
  assert.throws(() => makePrincipal(bare), /missing key "subject_id"/);
  bare.subject_id = HEX;
  assert.equal(makePrincipal(bare).subject_id, HEX, "a complete null-prototype object is valid");
});

test("rejects a missing key and an additional key", () => {
  const { kind, ...missing } = OK;
  assert.throws(() => makePrincipal(missing), /missing key "kind"/);
  assert.throws(() => makePrincipal({ ...OK, resolver_profile_id: "x" }), /unknown key/);
});

test("rejects a wrong type literal", () => {
  assert.throws(() => makePrincipal({ ...OK, type: "simurgh.vsi.principal.v2" }), /type/);
});

test("subject_id must be exactly 64 lowercase hex — no prefix, no case folding", () => {
  assert.throws(() => makePrincipal({ ...OK, subject_id: "A".repeat(64) }), /subject_id/);
  assert.throws(() => makePrincipal({ ...OK, subject_id: "a".repeat(63) }), /subject_id/);
  assert.throws(() => makePrincipal({ ...OK, subject_id: "a".repeat(65) }), /subject_id/);
  assert.throws(() => makePrincipal({ ...OK, subject_id: `sha256:${HEX}` }), /subject_id/);
  assert.throws(() => makePrincipal({ ...OK, subject_id: ` ${HEX}` }), /subject_id/);
});

test("namespace_id must be lowercase ASCII — uppercase, unicode and empty rejected", () => {
  assert.throws(
    () => makePrincipal({ ...OK, namespace_id: "Simurgh.Synthetic.v1" }),
    /namespace_id/
  );
  assert.throws(() => makePrincipal({ ...OK, namespace_id: "simurgh.café.v1" }), /namespace_id/);
  assert.throws(() => makePrincipal({ ...OK, namespace_id: "" }), /namespace_id/);
  assert.throws(() => makePrincipal({ ...OK, namespace_id: "simurgh v1" }), /namespace_id/);
});

// ---- equality is exact, over all four fields -----------------------------------------------

test("principalsEqual is exact — differing only in kind is NOT equal", () => {
  const a = makePrincipal(OK);
  assert.equal(principalsEqual(a, makePrincipal(OK)), true);
  assert.equal(principalsEqual(a, makePrincipal({ ...OK, kind: "service" })), false);
  assert.equal(
    principalsEqual(a, makePrincipal({ ...OK, namespace_id: "simurgh.other.v1" })),
    false
  );
  assert.equal(principalsEqual(a, makePrincipal({ ...OK, subject_id: "b".repeat(64) })), false);
});

test("canonical bytes are stable regardless of key insertion order", () => {
  const shuffled = { subject_id: HEX, namespace_id: NS, kind: "account", type: PRINCIPAL_TYPE };
  assert.deepEqual(
    principalCanonicalBytes(makePrincipal(shuffled)),
    principalCanonicalBytes(makePrincipal(OK))
  );
});

// ---- deriveSubjectId: BYTES ONLY ------------------------------------------------------------

test("deriveSubjectId rejects strings at the boundary", () => {
  assert.throws(() => deriveSubjectId(NS, "é"), /bytes/);
  assert.throws(() => deriveSubjectId(NS, "alice@example.com"), /bytes/);
});

test("deriveSubjectId validates its namespace and emits BARE 64-hex (no sha256: prefix)", () => {
  const id = deriveSubjectId(NS, Buffer.from("alice@example.com", "utf8"));
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.startsWith("sha256:"), "bare hex only — the 5O prefixed-token defect stays dead");
  assert.throws(() => deriveSubjectId("Simurgh.V1", Buffer.from("x")), /namespace_id/);
  assert.deepEqual(
    deriveSubjectId(NS, Uint8Array.from([1, 2, 3])),
    deriveSubjectId(NS, Buffer.from([1, 2, 3]))
  );
});

test("the derivation is domain-separated: same bytes, different namespace, different subject", () => {
  const bytes = Buffer.from("alice@example.com", "utf8");
  assert.notEqual(
    deriveSubjectId(NS, bytes),
    deriveSubjectId("simurgh.synthetic.person.v1", bytes)
  );
});

// ---- the core invents no equivalence between distinct byte sequences -----------------------

test("PREMISE then claim: NFC and NFD are distinct bytes, so they are distinct subjects", () => {
  const nfc = Buffer.from("\u00e9", "utf8"); // precomposed U+00E9
  const nfd = Buffer.from("e\u0301", "utf8"); // e + combining acute U+0301
  assert.notDeepEqual(nfc, nfd, "PREMISE FAILED: the two encodings are not distinct bytes");
  assert.notEqual(deriveSubjectId(NS, nfc), deriveSubjectId(NS, nfd));
});

test("no case folding and no trimming: distinct bytes stay distinct subjects", () => {
  const lower = deriveSubjectId(NS, Buffer.from("alice@x", "utf8"));
  assert.notEqual(deriveSubjectId(NS, Buffer.from("Alice@x", "utf8")), lower);
  assert.notEqual(deriveSubjectId(NS, Buffer.from("alice@x ", "utf8")), lower);
});

test("no friendly parser: the module exports nothing that repairs, coerces, or normalises", () => {
  const surface = {
    PRINCIPAL_KINDS,
    PRINCIPAL_TYPE,
    makePrincipal,
    principalCanonicalBytes,
    principalsEqual,
    deriveSubjectId,
  };
  for (const name of Object.keys(surface)) {
    assert.ok(
      !/parse|coerce|repair|infer|normali|fuzzy|match/i.test(name),
      `friendly-parser export found: ${name}`
    );
  }
});
