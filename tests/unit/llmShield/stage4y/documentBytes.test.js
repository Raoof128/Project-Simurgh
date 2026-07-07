// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — 183 intrinsic document-byte checks (plan Task 3). No 4W/4X imports.
import test from "node:test";
import assert from "node:assert/strict";
import { checkDocumentBytes } from "../../../../tools/simurgh-attestation/stage4y/core/documentBytes.mjs";

const enc = (s) => new TextEncoder().encode(s);

test("valid NFC UTF-8 with no manifest passes", () => {
  assert.equal(checkDocumentBytes(enc("Revenue grew 42% in March."), []), null);
});

test("empty body → 183 empty_body", () => {
  const r = checkDocumentBytes(new Uint8Array(0), []);
  assert.equal(r.raw, 183);
  assert.equal(r.reason, "vdr_document_bytes_invalid");
  assert.equal(r.detail, "empty_body");
});

test("invalid UTF-8 (lone 0x80) → 183 invalid_utf8", () => {
  const r = checkDocumentBytes(new Uint8Array([0x41, 0x80, 0x42]), []);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "invalid_utf8");
});

test("non-NFC body (decomposed é) → 183 not_nfc_normalised, never silently fixed", () => {
  const decomposed = "café"; // e + combining acute
  const r = checkDocumentBytes(enc(decomposed), []);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "not_nfc_normalised");
});

test("CRLF body passes (VDR maps submitted bytes as-is — deliberate divergence from 4W)", () => {
  assert.equal(checkDocumentBytes(enc("line one\r\nline two"), []), null);
});

test("overlapping declared regions → 183 manifest_overlap", () => {
  const bytes = enc("aaaaaaaaaa");
  const r = checkDocumentBytes(bytes, [
    { offset: 0, length: 5 },
    { offset: 3, length: 4 },
  ]);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "manifest_overlap");
});

test("manifest offset off a code-point boundary → 183 manifest_mid_code_point", () => {
  const bytes = enc("a€b"); // € is 3 bytes at offset 1..4
  const r = checkDocumentBytes(bytes, [{ offset: 2, length: 1 }]);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "manifest_mid_code_point");
});

test("negative / non-integer manifest offset → 183 manifest_offset_malformed", () => {
  const bytes = enc("hello world");
  assert.equal(
    checkDocumentBytes(bytes, [{ offset: -1, length: 2 }]).detail,
    "manifest_offset_malformed"
  );
  assert.equal(
    checkDocumentBytes(bytes, [{ offset: 1.5, length: 2 }]).detail,
    "manifest_offset_malformed"
  );
  assert.equal(
    checkDocumentBytes(bytes, [{ offset: 8, length: 99 }]).detail,
    "manifest_offset_malformed"
  );
});

test("U+2588 run OUTSIDE any declared region → 183 undeclared_redaction_marker", () => {
  const bytes = enc("name: ████ here");
  const r = checkDocumentBytes(bytes, []);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "undeclared_redaction_marker");
});

test("the SAME U+2588 run INSIDE a declared region passes (declared redaction is legit)", () => {
  const bytes = enc("name: ████ here");
  // "████" is 4×3 = 12 bytes starting at byte offset 6 ("name: " is 6 bytes)
  assert.equal(checkDocumentBytes(bytes, [{ offset: 6, length: 12 }]), null);
});

test("literal [REDACTED] token as prose (undeclared) fails 183 — conservative detection non-claim", () => {
  const bytes = enc("The form showed [REDACTED] in the margin.");
  const r = checkDocumentBytes(bytes, []);
  assert.equal(r.raw, 183);
  assert.equal(r.detail, "undeclared_redaction_marker");
});
