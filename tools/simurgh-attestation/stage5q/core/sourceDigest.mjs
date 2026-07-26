// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — canonical source bytes and the domain-separated span digest (spec §2.5).
//
// WHAT THIS DELIBERATELY DOES NOT DO
//
// An earlier draft of §2.5 specified a textual normaliser: strip comments, collapse whitespace,
// strip trailing commas. Applied textually — the only way it could be applied across .mjs, .py,
// .lean, .sh and .yml — that rule alters or collides inside string literals, template literals,
// regular expressions, Python strings, shell quoting, Lean syntax and YAML scalars. It would have
// made this stage responsible for proving semantic equivalence of arbitrary source across five
// languages, which is a research programme, not a census field.
//
// So canonicalisation here is BYTE-LEVEL ONLY. The consequence is accepted rather than worked
// around: a Prettier-only change DOES move `source_digest`. That is correct and useful — it proves
// the implementation changed. A finding cites the stable `function_id` AND the digest observed at
// discovery, so a reformat invalidates nothing.
//
// Input is Buffer, never string. Reading malformed UTF-8 into a JS string substitutes U+FFFD before
// any validity check can see it, which would silently launder a difference into an equality.

import { createHash } from "node:crypto";
import { DOMAIN } from "./constants.mjs";

const BOM = 0xfeff;

function requireBytes(input) {
  if (!Buffer.isBuffer(input) && !(input instanceof Uint8Array)) {
    throw new TypeError(
      "source digest: input must be a Buffer or Uint8Array — a string has already lost the " +
        "distinction between malformed UTF-8 and U+FFFD"
    );
  }
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

/**
 * Canonical source bytes, per spec §2.5.
 *
 * - UTF-8 in, UTF-8 out
 * - BOM **rejected**, not stripped: a byte-order mark is content, and removing it would let two
 *   materially different files digest identically
 * - CRLF and lone CR normalised to LF
 * - exactly one trailing LF, added when absent (interior blank lines are content and survive)
 * - no comment removal, no whitespace collapsing, no punctuation removal
 *
 * @param {Buffer|Uint8Array} input
 * @returns {Buffer}
 */
export function canonicalSourceBytes(input) {
  const bytes = requireBytes(input);

  // Detect a UTF-8 BOM (EF BB BF) without decoding the whole buffer.
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error("source digest: BOM present; canonical source bytes reject a BOM");
  }
  const text = bytes.toString("utf8");
  if (text.charCodeAt(0) === BOM) {
    throw new Error("source digest: BOM present; canonical source bytes reject a BOM");
  }

  const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return Buffer.from(lf.endsWith("\n") ? lf : `${lf}\n`, "utf8");
}

/**
 * Strict UTF-8 decode, for the parsing paths that genuinely need text.
 *
 * Throws on malformed input rather than substituting U+FFFD, so a census cannot silently proceed
 * over bytes it did not actually understand.
 *
 * @param {Buffer|Uint8Array} input
 * @returns {string}
 */
export function decodeUtf8Strict(input) {
  const bytes = requireBytes(input);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/**
 * Domain-separated digest of a source span.
 *
 *   SHA256( UTF8("simurgh.vsr.source-span.v1") || 0x00 || canonical_source_bytes )
 *
 * The 0x00 separator is not decoration: without it, a domain ending in "ab" over content "c" would
 * hash identically to a domain ending in "a" over content "bc".
 *
 * @param {Buffer|Uint8Array} input
 * @returns {string} lowercase hex
 */
export function sourceSpanDigest(input) {
  return createHash("sha256")
    .update(Buffer.from(DOMAIN.sourceSpan, "utf8"))
    .update(Buffer.from([0x00]))
    .update(canonicalSourceBytes(input))
    .digest("hex");
}
