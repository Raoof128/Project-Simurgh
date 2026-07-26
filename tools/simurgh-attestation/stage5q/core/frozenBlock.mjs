// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — frozen-block extraction and digest.
//
// §§2-5 of the 5Q design spec are the four frozen objects (function closure, release-tag closure,
// attack taxonomy, finding-ledger schema). This module is the mechanical definition of "frozen":
// it pins exactly which bytes are covered, so that "these sections are frozen" is a command anyone
// can re-run rather than an assertion anyone must believe.
//
// Two design points carry the weight:
//
//   * The block is delimited by SECTION ANCHORS, not line numbers. Line numbers move whenever
//     anything above §2 is edited, and a freeze whose scope drifts with unrelated edits is not a
//     freeze. The anchors are the literal section headings.
//
//   * The freeze RECEIPT (freeze_commit, freeze_digest) lives OUTSIDE the block, in §16's freeze
//     block. That is what makes the two-commit convention possible: commit 1 freezes the content,
//     commit 2 records a digest OF that content. Were the receipt inside the frozen span, writing
//     the digest down would change the thing the digest describes.
//
// Canonicalisation here is byte-level only, matching spec §2.5: line endings normalised, one
// trailing newline, and NO semantic normalisation. We do not strip comments or collapse whitespace,
// because doing that textually across five languages corrupts string literals and regexes — the
// spec removed that rule deliberately and this module must not reintroduce it.

import { createHash } from "node:crypto";

/** The sections covered by the freeze, in document order. */
export const FROZEN_SECTION_IDS = Object.freeze(["§2", "§3", "§4", "§5"]);

/** Domain separation tag — a digest must mean "5Q frozen block", not merely "these bytes". */
export const FROZEN_BLOCK_DOMAIN = "simurgh.vsr.frozen-block.v1";

/** Literal heading that opens the frozen span. */
const OPEN_ANCHOR = "## §2 FROZEN OBJECT 1";

/** Literal heading that terminates it. The terminator is exclusive. */
const CLOSE_ANCHOR = "## §6 ";

/**
 * Normalise to canonical source bytes per spec §2.5.
 *
 * BOM is REJECTED rather than stripped: a byte-order mark is a content difference, and silently
 * removing it would let two materially different files digest identically.
 *
 * @param {string} text
 * @returns {string}
 */
export function canonicalSourceText(text) {
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("frozen block: BOM present; canonical source bytes reject a BOM");
  }
  const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return lf.endsWith("\n") ? lf : `${lf}\n`;
}

/**
 * Extract the frozen span (§2 through the end of §5) from the spec document.
 *
 * Fails closed on a missing opening anchor or a missing terminator. A silently-empty block would be
 * the worst possible outcome: the digest would be stable, the gate would be green, and it would be
 * describing nothing — precisely the false-green defect this stage exists to hunt.
 *
 * @param {string} specText full markdown of the design spec
 * @returns {string} canonical bytes of the frozen span
 */
export function extractFrozenBlock(specText) {
  if (typeof specText !== "string" || specText.length === 0) {
    throw new Error("frozen block: spec text must be a non-empty string");
  }
  const start = specText.indexOf(OPEN_ANCHOR);
  if (start === -1) {
    throw new Error(`frozen block: opening anchor not found (${OPEN_ANCHOR})`);
  }
  const end = specText.indexOf(CLOSE_ANCHOR, start);
  if (end === -1) {
    throw new Error(`frozen block: terminator not found (${CLOSE_ANCHOR}); §6 must follow §5`);
  }
  const span = specText.slice(start, end);
  // Trim the trailing separator/blank lines that belong to the boundary rather than to §5, so that
  // editing §6's preamble spacing cannot move the digest.
  return canonicalSourceText(span.replace(/\s*(?:---\s*)?$/, ""));
}

/**
 * Domain-separated digest of an extracted frozen block.
 *
 * @param {string} blockText output of extractFrozenBlock
 * @returns {string} lowercase hex sha256
 */
export function frozenBlockDigest(blockText) {
  if (typeof blockText !== "string" || blockText.length === 0) {
    throw new Error("frozen block: cannot digest an empty block");
  }
  return createHash("sha256")
    .update(Buffer.from(FROZEN_BLOCK_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(canonicalSourceText(blockText), "utf8"))
    .digest("hex");
}

/**
 * Convenience: extract and digest in one call.
 *
 * @param {string} specText
 * @returns {{ digest: string, bytes: number, block: string }}
 */
export function freezeReceipt(specText) {
  const block = extractFrozenBlock(specText);
  return {
    digest: frozenBlockDigest(block),
    bytes: Buffer.byteLength(block, "utf8"),
    block,
  };
}
