// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — A27 digest-token codec parity vectors.
//
// Premise type for every law below: exhaustive finite check or explicit counterexample.
// A premise TYPE is a classification, not proof the premise holds -- which is exactly how the
// withdrawn S7.19 passed every gate. These are executed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  encodeDigestToken,
  decodeDigestToken,
  DIGEST_TOKEN_WIDTHS,
  STAGE5O_DIGEST_TOKEN_CODEC_ID,
} from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";

const ZERO = Buffer.alloc(32, 0x00);
const FF = Buffer.alloc(32, 0xff);
const MIXED = createHash("sha256").update("simurgh.vsc.mixed").digest();

/**
 * The negative-fixture law, in executable form.
 *
 * A negative fixture must FIRST prove it generated a negative case. The mixed-case vector below
 * did not: it built a "mutation" that was the identity ("9".toUpperCase() === "9"), then asserted
 * the implementation was wrong for accepting a conforming token. That is the withdrawn S7.19
 * defect -- a premise asserted rather than verified -- reappearing inside the tests written to
 * prevent it.
 *
 *   require mutated != valid          // the mutation actually mutated
 *   require valid is accepted         // the baseline really is a positive case
 *   require mutated is rejected       // the claim under test
 *   require property(mutated)         // the mutation changed the property it claims to change
 */
function assertNegativeVector({ name, valid, mutated, accept, property, propertyName }) {
  assert.notEqual(
    mutated,
    valid,
    `${name}: PREMISE FAILED — the mutation did not change the input`
  );
  assert.doesNotThrow(
    () => accept(valid),
    `${name}: PREMISE FAILED — the baseline is not accepted`
  );
  if (property) {
    assert.ok(
      property(mutated),
      `${name}: PREMISE FAILED — mutant lacks the property "${propertyName}"`
    );
  }
  assert.throws(() => accept(mutated), `${name}: the mutated input must be REJECT`);
}

const containsUppercaseAscii = (s) => /[A-Z]/.test(s);

test("codec id is pinned", () => {
  assert.equal(STAGE5O_DIGEST_TOKEN_CODEC_ID, "simurgh.vsc.digest_token_codec.v1");
});

test("encode: fixed vectors produce the exact frozen token", () => {
  assert.equal(encodeDigestToken(ZERO), "sha256:" + "00".repeat(32));
  assert.equal(encodeDigestToken(FF), "sha256:" + "ff".repeat(32));
  assert.equal(encodeDigestToken(MIXED), "sha256:" + MIXED.toString("hex"));
});

test("widths: a token is 71 ASCII chars; a payload is 32 raw bytes", () => {
  const t = encodeDigestToken(MIXED);
  assert.equal(t.length, 71);
  assert.equal(Buffer.byteLength(t, "ascii"), 71);
  assert.equal(DIGEST_TOKEN_WIDTHS.raw_bytes, 32);
  assert.equal(DIGEST_TOKEN_WIDTHS.token_chars, 71);
  // the whole point: sizing one with the other is a 39-byte overrun
  assert.equal(t.length - DIGEST_TOKEN_WIDTHS.raw_bytes, 39);
});

test("law: decode(encode(x)) == x for every generated 32-byte x", () => {
  for (let i = 0; i < 512; i++) {
    const x = createHash("sha256").update(`vector-${i}`).digest();
    assert.ok(decodeDigestToken(encodeDigestToken(x)).equals(x), `round-trip failed at ${i}`);
  }
  for (const x of [ZERO, FF, MIXED]) {
    assert.ok(decodeDigestToken(encodeDigestToken(x)).equals(x));
  }
});

test("law: encode(decode(t)) == t for every accepted token t", () => {
  for (let i = 0; i < 512; i++) {
    const t = "sha256:" + createHash("sha256").update(`token-${i}`).digest("hex");
    assert.equal(encodeDigestToken(decodeDigestToken(t)), t);
  }
});

test("decode: every non-conforming lexical form REJECTS (throws, never null)", () => {
  const hex = MIXED.toString("hex");

  // Premise verification, not decoration. The first draft of this vector built mixed case as
  // hex.slice(0,63) + hex.slice(63).toUpperCase() -- and MIXED's hex[63] is "9", so the
  // "mutation" was the identity and the token stayed validly lowercase. The test demanded a
  // throw for a conforming token and failed. A case mutation must land on a LETTER, and the
  // fixture must prove it mutated rather than assume it: that assumption is precisely the
  // S7.19 defect, one layer down.
  const letterIdx = [...hex].findIndex((c) => /[a-f]/.test(c));
  assert.notEqual(letterIdx, -1, "premise: the vector's hex must contain at least one a-f");
  const mixedCaseHex =
    hex.slice(0, letterIdx) + hex[letterIdx].toUpperCase() + hex.slice(letterIdx + 1);
  assert.notEqual(mixedCaseHex, hex, "premise: the case mutation must actually change a byte");

  const rejects = {
    uppercase_scheme: "SHA256:" + hex,
    uppercase_hex: "sha256:" + hex.toUpperCase(),
    mixed_case_hex: "sha256:" + mixedCaseHex,
    missing_prefix: hex,
    zero_x_prefix: "sha256:0x" + hex.slice(2),
    short_sixty_three: "sha256:" + hex.slice(0, 63),
    long_sixty_five: "sha256:" + hex + "a",
    trailing_newline: "sha256:" + hex + "\n",
    leading_space: " sha256:" + hex,
    trailing_space: "sha256:" + hex + " ",
    empty: "",
    prefix_only: "sha256:",
    wrong_scheme: "sha512:" + hex,
    embedded: "x sha256:" + hex + " y",
    non_hex_char: "sha256:" + "g".repeat(64),
  };
  for (const [name, bad] of Object.entries(rejects)) {
    assert.throws(() => decodeDigestToken(bad), `expected REJECT for ${name}`);
  }
});

test("decode: non-string inputs REJECT", () => {
  for (const bad of [null, undefined, 42, {}, [], Buffer.alloc(32), true]) {
    assert.throws(() => decodeDigestToken(bad));
  }
});

test("encode: wrong-width and non-buffer inputs REJECT", () => {
  for (const bad of [Buffer.alloc(31), Buffer.alloc(33), Buffer.alloc(0)]) {
    assert.throws(() => encodeDigestToken(bad));
  }
  for (const bad of [null, undefined, "sha256:" + "00".repeat(32), 42, {}]) {
    assert.throws(() => encodeDigestToken(bad));
  }
  // a Uint8Array of correct width is accepted (Buffer is a Uint8Array subclass)
  assert.equal(encodeDigestToken(new Uint8Array(32)), "sha256:" + "00".repeat(32));
});

test("negative-fixture law: case mutations prove they mutated AND changed the property", () => {
  const hex = MIXED.toString("hex");
  const validToken = "sha256:" + hex;
  const letterIdx = [...hex].findIndex((c) => /[a-f]/.test(c));
  assert.notEqual(letterIdx, -1, "premise: the vector's hex must contain at least one a-f");

  assertNegativeVector({
    name: "mixed_case_hex",
    valid: validToken,
    mutated:
      "sha256:" + hex.slice(0, letterIdx) + hex[letterIdx].toUpperCase() + hex.slice(letterIdx + 1),
    accept: decodeDigestToken,
    property: containsUppercaseAscii,
    propertyName: "contains_uppercase_ascii",
  });

  assertNegativeVector({
    name: "uppercase_hex",
    valid: validToken,
    mutated: "sha256:" + hex.toUpperCase(),
    accept: decodeDigestToken,
    property: containsUppercaseAscii,
    propertyName: "contains_uppercase_ascii",
  });

  assertNegativeVector({
    name: "uppercase_scheme",
    valid: validToken,
    mutated: "SHA256:" + hex,
    accept: decodeDigestToken,
    property: containsUppercaseAscii,
    propertyName: "contains_uppercase_ascii",
  });
});

test("the law itself REJECTS an identity mutation (it must catch the S7.19 shape)", () => {
  // Reintroduce the exact defect: a case "mutation" landing on a digit. The law must fail on the
  // PREMISE, not on the implementation -- proving the guard works rather than asserting it does.
  const digitEndingHex = "0".repeat(63) + "9";
  assert.equal(
    digitEndingHex.slice(63).toUpperCase(),
    digitEndingHex.slice(63),
    "setup: digit is case-invariant"
  );
  assert.throws(
    () =>
      assertNegativeVector({
        name: "identity_mutation",
        valid: "sha256:" + digitEndingHex,
        mutated: "sha256:" + digitEndingHex.slice(0, 63) + digitEndingHex.slice(63).toUpperCase(),
        accept: decodeDigestToken,
      }),
    /PREMISE FAILED — the mutation did not change the input/,
    "the law must reject an identity mutation before testing the implementation"
  );
});

test("codec failure is a CATCHABLE SYNCHRONOUS throw — a verdict, never a crash", () => {
  // A throw is the right internal behaviour, but it is only a protocol verdict if the verifier
  // boundary can convert it deterministically:
  //     try { raw = decodeDigestToken(token) } catch { REJECT }
  // That boundary is only sound if the throw is SYNCHRONOUS. An async throw would escape a sync
  // try/catch and surface as an unhandled rejection -- verifier termination, not rejection.
  assert.notEqual(
    decodeDigestToken.constructor.name,
    "AsyncFunction",
    "an async decoder would escape the verifier's try/catch and terminate it"
  );
  assert.notEqual(encodeDigestToken.constructor.name, "AsyncFunction");

  let caught = null;
  try {
    decodeDigestToken("not-a-token");
  } catch (e) {
    caught = e;
  }
  assert.ok(caught instanceof Error, "failure must be a catchable Error");

  // deterministic: the same malformed input yields the same verdict every time, never a
  // partial result, a fallback decode, or a null that flows downstream
  const verdicts = new Set();
  for (let i = 0; i < 64; i++) {
    try {
      decodeDigestToken("sha256:" + "Z".repeat(64));
      verdicts.add("ACCEPTED");
    } catch (e) {
      verdicts.add(`REJECT:${e.message}`);
    }
  }
  assert.equal(verdicts.size, 1, "the same malformed token must produce one deterministic verdict");
  assert.ok([...verdicts][0].startsWith("REJECT:"), "malformed input must never be accepted");
});

test("cross-check: 5K's grammar is INDEPENDENTLY implemented here, never imported", () => {
  // Stage 5K states the same lexical grammar inside a private helper. This asserts the grammars
  // AGREE -- it does not import 5K, and Stage 5O's authority comes from A27, not from 5K.
  const merkle = readFileSync(
    new URL("../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs", import.meta.url),
    "utf8"
  );
  assert.ok(
    merkle.includes("/^sha256:([0-9a-f]{64})$/"),
    "5K's grammar changed; the compatibility claim must be re-measured, not assumed"
  );
  const codec = readFileSync(
    new URL(
      "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs",
      import.meta.url
    ),
    "utf8"
  );
  assert.ok(codec.includes("/^sha256:([0-9a-f]{64})$/"), "5O must state the same grammar");
  assert.ok(
    !/from\s+["'][^"']*stage5k/.test(codec),
    "Stage 5O must NOT import stage5k: prior art is not authority"
  );
});
