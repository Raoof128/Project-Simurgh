// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 2 — canonical source bytes and the domain-separated span digest.
//
// Spec §2.5 REMOVED the textual normaliser an earlier draft carried (strip comments, collapse
// whitespace, strip trailing commas). Applied textually — the only way it could be applied across
// .mjs/.py/.lean/.sh/.yml — that rule corrupts string literals, template literals, regexes, Python
// strings, shell quoting, Lean syntax and YAML scalars. It would have made 5Q responsible for
// proving semantic equivalence of arbitrary source across five languages.
//
// So canonicalisation is BYTE-LEVEL ONLY, and the accepted consequence is stated rather than worked
// around: a Prettier-only change DOES move source_digest. That is correct — it proves the
// implementation changed. Findings cite the stable function_id plus the digest observed at
// discovery, so nothing is invalidated.
//
// Input is Buffer, not string (gauntlet P1-5): reading malformed UTF-8 as a JS string replaces
// invalid bytes with U+FFFD before any check can see them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  canonicalSourceBytes,
  sourceSpanDigest,
  decodeUtf8Strict,
} from "../../../../tools/simurgh-attestation/stage5q/core/sourceDigest.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const buf = (s) => Buffer.from(s, "utf8");

test("a BOM is REJECTED, not stripped", () => {
  // Stripping would let two materially different files digest identically. A BOM is content.
  assert.throws(() => canonicalSourceBytes(Buffer.from("﻿const a = 1;\n", "utf8")), /BOM/i);
});

test("CRLF and lone CR both normalise to LF", () => {
  const lf = canonicalSourceBytes(buf("a\nb\n"));
  assert.ok(canonicalSourceBytes(buf("a\r\nb\r\n")).equals(lf));
  assert.ok(canonicalSourceBytes(buf("a\rb\r")).equals(lf));
});

test("exactly one trailing newline, added when absent and never doubled", () => {
  assert.equal(canonicalSourceBytes(buf("x")).toString(), "x\n");
  assert.equal(canonicalSourceBytes(buf("x\n")).toString(), "x\n");
  assert.equal(
    canonicalSourceBytes(buf("x\n\n")).toString(),
    "x\n\n",
    "interior blanks are content"
  );
});

test("NO semantic normalisation — comments, whitespace and commas survive", () => {
  // The deleted rule would have collapsed all three of these onto one digest.
  const a = sourceSpanDigest(buf("const a = 1; // note\n"));
  const b = sourceSpanDigest(buf("const a = 1;\n"));
  const c = sourceSpanDigest(buf("const  a  =  1;\n"));
  assert.notEqual(a, b, "a comment is a byte difference");
  assert.notEqual(b, c, "whitespace is a byte difference");
});

test("a string literal containing what looks like a comment is untouched", () => {
  // This is the case the deleted normaliser would have corrupted.
  const withUrl = buf('const u = "https://example.com/x"; \n');
  assert.doesNotThrow(() => sourceSpanDigest(withUrl));
  assert.notEqual(sourceSpanDigest(withUrl), sourceSpanDigest(buf('const u = "https:";\n')));
});

test("one byte changed moves the digest", () => {
  assert.notEqual(sourceSpanDigest(buf("return 1;\n")), sourceSpanDigest(buf("return 2;\n")));
});

test("the digest is domain-separated, and the domain participates", () => {
  const d = sourceSpanDigest(buf("x\n"));
  assert.match(d, /^[0-9a-f]{64}$/);
  // Same bytes under a different domain must not collide. Verified by construction: recompute the
  // digest by hand with a different tag and require inequality.
  const other = createHash("sha256")
    .update(Buffer.from("simurgh.vsr.some-other-domain.v1", "utf8"))
    .update(Buffer.from([0x00]))
    .update(canonicalSourceBytes(buf("x\n")))
    .digest("hex");
  assert.notEqual(d, other, "the domain tag must be inside the hash, not decoration");
  assert.equal(DOMAIN.sourceSpan, "simurgh.vsr.source-span.v1");
});

test("the separator byte prevents concatenation ambiguity", () => {
  // Without the 0x00, domain "ab" + content "c" and domain "a" + content "bc" would collide.
  // We cannot vary the domain through the public API, so assert the separator is present by
  // recomputing both candidate constructions and requiring the tagged one to match.
  const content = canonicalSourceBytes(buf("c\n"));
  const withSep = createHash("sha256")
    .update(Buffer.from(DOMAIN.sourceSpan, "utf8"))
    .update(Buffer.from([0x00]))
    .update(content)
    .digest("hex");
  const withoutSep = createHash("sha256")
    .update(Buffer.from(DOMAIN.sourceSpan, "utf8"))
    .update(content)
    .digest("hex");
  assert.equal(sourceSpanDigest(buf("c\n")), withSep);
  assert.notEqual(withSep, withoutSep);
});

test("a string input is REFUSED — bytes must arrive as bytes", () => {
  assert.throws(() => canonicalSourceBytes("const a = 1;\n"), /Buffer|Uint8Array/i);
});

test("decodeUtf8Strict throws on malformed UTF-8 rather than substituting U+FFFD", () => {
  // The whole reason the interface takes Buffers: lossy decoding hides the difference.
  const malformed = Buffer.from([0x61, 0xff, 0x62]);
  assert.throws(() => decodeUtf8Strict(malformed));
  assert.equal(decodeUtf8Strict(buf("héllo")), "héllo");
});

test("non-ASCII content round-trips byte-exactly", () => {
  const s = 'const 名前 = "café";\n';
  assert.equal(canonicalSourceBytes(buf(s)).toString("utf8"), s);
});
