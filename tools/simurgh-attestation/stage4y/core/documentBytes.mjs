// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — 183 intrinsic document-byte checks (spec §2, plan Task 3).
// Motto: AnthropicSafe First, then ReviewerSafe.
// INTRINSIC ONLY: no 4W/4X imports (import-order rule — nothing bound runs before 184).
// Validates raw UTF-8 bytes, NFC equality (never silently normalises), the declared
// redaction manifest, and scans for undeclared redaction markers.
import { VDR_REDACTION_MARKERS } from "../constants.mjs";

const fail = (detail) => ({ raw: 183, reason: "vdr_document_bytes_invalid", detail });

// A UTF-8 continuation byte is 0b10xxxxxx; a code-point starts anywhere else (or at EOF).
const isBoundary = (bytes, off) => off === bytes.length || (bytes[off] & 0xc0) !== 0x80;

// The literal marker tokens, pre-encoded to bytes so the scan stays in byte space.
const ENC = new TextEncoder();
const FULL_BLOCK = ENC.encode("█"); // U+2588 → 0xE2 0x96 0x88
const REDACTED_LITERAL = ENC.encode("[REDACTED]");

const startsWith = (bytes, at, needle) => {
  if (at + needle.length > bytes.length) return false;
  for (let i = 0; i < needle.length; i++) if (bytes[at + i] !== needle[i]) return false;
  return true;
};

// Byte ranges [start,end) of every marker occurrence: runs of U+2588 and [REDACTED] literals.
function markerRanges(bytes) {
  const ranges = [];
  for (let i = 0; i < bytes.length; ) {
    if (startsWith(bytes, i, FULL_BLOCK)) {
      const start = i;
      while (startsWith(bytes, i, FULL_BLOCK)) i += FULL_BLOCK.length;
      ranges.push([start, i]);
    } else if (startsWith(bytes, i, REDACTED_LITERAL)) {
      ranges.push([i, i + REDACTED_LITERAL.length]);
      i += REDACTED_LITERAL.length;
    } else {
      i++;
    }
  }
  return ranges;
}

// checkDocumentBytes(bytes, manifest) → null | {raw:183, reason, detail}.
// bytes: Uint8Array of the raw document. manifest: [{offset,length}] declared redactions.
export function checkDocumentBytes(bytes, manifest = []) {
  if (!bytes || bytes.length === 0) return fail("empty_body");

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("invalid_utf8");
  }
  if (text !== text.normalize("NFC")) return fail("not_nfc_normalised");

  // Manifest: per-region well-formedness, then boundaries, then cross-region overlap.
  const regions = manifest ?? [];
  for (const r of regions) {
    if (
      !Number.isInteger(r.offset) ||
      !Number.isInteger(r.length) ||
      r.offset < 0 ||
      r.length <= 0 ||
      r.offset + r.length > bytes.length
    )
      return fail("manifest_offset_malformed");
    if (!isBoundary(bytes, r.offset) || !isBoundary(bytes, r.offset + r.length))
      return fail("manifest_mid_code_point");
  }
  const sorted = [...regions].sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].offset < sorted[i - 1].offset + sorted[i - 1].length)
      return fail("manifest_overlap");

  // A marker occurrence is declared iff fully inside some declared region.
  const declared = ([s, e]) => sorted.some((r) => r.offset <= s && e <= r.offset + r.length);
  for (const range of markerRanges(bytes))
    if (!declared(range)) return fail("undeclared_redaction_marker");

  return null;
}

export { VDR_REDACTION_MARKERS };
