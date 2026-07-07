import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bodyBytes,
  normaliseBody,
  checkNormalisation,
  checkSpanGeometry,
} from "../../../../tools/simurgh-attestation/stage4w/core/textCore.mjs";

const span = (id, s, e) => ({ span_id: id, start_byte: s, end_byte: e, type: "unverified_prose" });

test("normalisation: NFC, LF-only, no trailing whitespace — never auto-fixed", () => {
  assert.equal(checkNormalisation("clean line\nsecond line\n"), null);
  assert.equal(checkNormalisation("bad\r\nline\n").raw, 164); // CRLF
  assert.equal(checkNormalisation("trailing \nline\n").raw, 164); // trailing space
  // NFD é (e + combining acute) must be rejected, not silently normalised.
  assert.equal(checkNormalisation("café\n").raw, 164);
  assert.equal(checkNormalisation(normaliseBody("café\n")), null);
});

test("span geometry: overlap, bounds, order, empty, dup id, mid-code-point", () => {
  const body = "abcdef سیمرغ done\n"; // multi-byte region
  const bytes = bodyBytes(body);
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 3), span("s2", 3, 6)]), null);
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 4), span("s2", 3, 6)]).raw, 165); // overlap
  assert.equal(checkSpanGeometry(body, [span("s1", 3, 6), span("s2", 0, 3)]).raw, 165); // unsorted
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 0)]).raw, 165); // empty
  assert.equal(checkSpanGeometry(body, [span("s1", 0, bytes.length + 1)]).raw, 165); // OOB
  assert.equal(checkSpanGeometry(body, [span("s1", 0, 3), span("s1", 3, 6)]).raw, 165); // dup id
  // "abcdef " is 7 bytes; س starts at byte 7 (a valid boundary) and is 2 bytes, so byte 8
  // is a continuation byte — a span starting there splits a code point. (No magic numbers.)
  const mid = Buffer.byteLength("abcdef ") + 1;
  assert.equal(checkSpanGeometry(body, [span("s1", mid, mid + 2)]).raw, 165); // mid-UTF-8 code point
  assert.equal(checkSpanGeometry(body, [span("s1", -1, 3)]).raw, 165); // negative start (bounds-safe)
});
