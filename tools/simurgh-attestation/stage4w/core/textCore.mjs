// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W text canonical form + span geometry (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
//   164 vsn_normalisation_invalid   body != normalise(body) byte-for-byte — NEVER auto-fixed
//   165 vsn_span_geometry_invalid   overlap/unsorted/OOB/empty/mid-code-point/duplicate span_id
const ENC = new TextEncoder();
export const bodyBytes = (body) => ENC.encode(body);

export const normaliseBody = (body) =>
  body
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n");

export function checkNormalisation(body) {
  if (typeof body !== "string" || body.length === 0)
    return {
      raw: 164,
      reason: "vsn_normalisation_invalid",
      detail: { kind: "empty_or_not_string" },
    };
  if (body !== normaliseBody(body))
    return { raw: 164, reason: "vsn_normalisation_invalid", detail: { kind: "not_canonical" } };
  return null;
}

// A UTF-8 continuation byte is 0b10xxxxxx; offsets must land on code-point starts.
// Explicitly bounds-safe (reviewer P2 #13): a negative or out-of-range offset is
// never a boundary, so callers cannot be fooled by an under/overflow offset.
export const isCodePointBoundary = (bytes, offset) =>
  Number.isInteger(offset) &&
  offset >= 0 &&
  offset <= bytes.length &&
  (offset === bytes.length || (bytes[offset] & 0xc0) !== 0x80);

export function checkSpanGeometry(body, spanMap) {
  const bytes = bodyBytes(body);
  const bad = (kind, span_id) => ({
    raw: 165,
    reason: "vsn_span_geometry_invalid",
    detail: { kind, ...(span_id ? { span_id } : {}) },
  });
  const seen = new Set();
  let prevEnd = 0;
  let prevStart = -1;
  for (const s of spanMap ?? []) {
    if (!Number.isInteger(s.start_byte) || !Number.isInteger(s.end_byte))
      return bad("non_integer_offsets", s.span_id);
    if (seen.has(s.span_id)) return bad("duplicate_span_id", s.span_id);
    seen.add(s.span_id);
    if (s.start_byte < prevStart || s.start_byte < prevEnd)
      return bad("unsorted_or_overlap", s.span_id);
    if (s.end_byte <= s.start_byte) return bad("empty_span", s.span_id);
    if (s.end_byte > bytes.length) return bad("out_of_bounds", s.span_id);
    if (!isCodePointBoundary(bytes, s.start_byte) || !isCodePointBoundary(bytes, s.end_byte))
      return bad("mid_code_point", s.span_id);
    prevStart = s.start_byte;
    prevEnd = s.end_byte;
  }
  return null;
}
