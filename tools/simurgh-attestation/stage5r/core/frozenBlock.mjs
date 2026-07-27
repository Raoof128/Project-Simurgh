// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — frozen-block extraction and digest.
//
// §§2-5 of the 5R design spec are the four frozen objects (`vpf_inherited_commitment`,
// `vpf_family_contract`, `vpf_admissibility_rules`, `vpf_role_archetypes`). This module is the
// mechanical definition of "frozen": it pins exactly which bytes are covered, so that "these
// sections are frozen" is a command anyone can re-run rather than an assertion anyone must believe.
//
// Three design points carry the weight.
//
//   * The block is delimited by SECTION ANCHORS, not line numbers. Line numbers move whenever
//     anything above §2 is edited, and a freeze whose scope drifts with unrelated edits is not a
//     freeze.
//
//   * The freeze RECEIPT (freeze_commit, freeze_digest) lives OUTSIDE the block. That is what makes
//     the two-commit ceremony possible: commit 1 freezes the content, commit 2 records a digest OF
//     that content. Were the receipt inside the span, writing the digest down would change the thing
//     the digest describes.
//
//   * The boundary is VALIDATED, not merely located. 5Q's extractor used `indexOf` on an opening
//     anchor and a terminator, which accepts three documents it should refuse: §3 present twice,
//     §3 and §4 swapped, §4 deleted outright. In each case the digest is stable and the gate is
//     green while covering something other than the four objects it names. So this extractor
//     enumerates every frozen heading, requires each exactly once, in document order, carrying its
//     own object number — and refuses the document otherwise. Refusing is always safe; a
//     silently-wrong span is the false-green defect this stage exists to hunt.
//
// Canonicalisation is byte-level only: line endings normalised, one trailing newline, and NO
// semantic normalisation. Comments are not stripped and whitespace is not collapsed, because doing
// that textually across five languages corrupts string literals and regexes — the 5Q ruling removed
// that rule deliberately and this module must not reintroduce it.

import { createHash } from "node:crypto";

/** The sections covered by the freeze, in document order. */
export const FROZEN_SECTION_IDS = Object.freeze(["§2", "§3", "§4", "§5"]);

/** The section that terminates the span. Exclusive: §6's heading is not part of the block. */
export const TERMINATOR_SECTION_ID = "§6";

/** Domain separation tag — a digest must mean "5R frozen block", not merely "these bytes". */
export const FROZEN_BLOCK_DOMAIN = "simurgh.vpf.frozen-block.v1";

/** A frozen heading, at line start, exactly two hashes and one space. */
const HEADING_RE = /^## (§[2-6]) (.*)$/;

/** A fence opens or closes on any line whose first non-space run is three or more backticks. */
const FENCE_RE = /^\s*```/;

/**
 * Normalise to canonical source bytes.
 *
 * A BOM is REJECTED rather than stripped: a byte-order mark is a content difference, and silently
 * removing it would let two materially different files digest identically.
 *
 * @param {string} text
 * @returns {string}
 */
export function canonicalSourceText(text) {
  if (typeof text !== "string") {
    throw new TypeError("frozen block: canonical source text requires a string");
  }
  if (text.charCodeAt(0) === 0xfeff) {
    throw new Error("frozen block: BOM present; canonical source bytes reject a BOM");
  }
  const lf = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return lf.endsWith("\n") ? lf : `${lf}\n`;
}

/**
 * Locate every frozen-section heading, ignoring headings quoted inside fenced code blocks.
 *
 * @param {string[]} lines canonical lines of the document
 * @returns {Map<string, {line: number, title: string}[]>} section id → occurrences
 */
function findHeadings(lines) {
  const found = new Map();
  let inFence = false;
  lines.forEach((line, index) => {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const m = HEADING_RE.exec(line);
    if (!m) return;
    const [, id, title] = m;
    if (!found.has(id)) found.set(id, []);
    found.get(id).push({ line: index, title });
  });
  return found;
}

/**
 * Validate the boundary and return the line range of the frozen span.
 *
 * @param {string[]} lines
 * @returns {{ start: number, end: number }} start inclusive, end exclusive
 */
function frozenSpan(lines) {
  const found = findHeadings(lines);
  const required = [...FROZEN_SECTION_IDS, TERMINATOR_SECTION_ID];

  for (const id of required) {
    const hits = found.get(id) ?? [];
    if (hits.length === 0) {
      throw new Error(`frozen block: section ${id} heading is missing; the boundary is not intact`);
    }
    if (hits.length > 1) {
      const at = hits.map((h) => h.line + 1).join(", ");
      throw new Error(
        `frozen block: duplicate ${id} heading at lines ${at}; the span it names is ambiguous`
      );
    }
  }

  const at = (id) => found.get(id)[0];

  // Each frozen section must carry its own object number, so a renumbered or swapped object is
  // caught even when the headings themselves are in order.
  FROZEN_SECTION_IDS.forEach((id, i) => {
    const expected = `FROZEN OBJECT ${i + 1}`;
    if (!at(id).title.startsWith(expected)) {
      throw new Error(
        `frozen block: ${id} must be "${expected}"; found "${at(id).title.slice(0, 40)}"`
      );
    }
  });

  for (let i = 1; i < required.length; i += 1) {
    const prev = required[i - 1];
    const next = required[i];
    if (at(next).line <= at(prev).line) {
      throw new Error(
        `frozen block: sections out of document order — ${next} precedes ${prev} ` +
          `(lines ${at(next).line + 1} and ${at(prev).line + 1})`
      );
    }
  }

  return { start: at(FROZEN_SECTION_IDS[0]).line, end: at(TERMINATOR_SECTION_ID).line };
}

/**
 * Extract the frozen span (§2 through the end of §5) from the spec document.
 *
 * @param {string} specText full markdown of the design spec
 * @returns {string} canonical bytes of the frozen span
 */
export function extractFrozenBlock(specText) {
  if (typeof specText !== "string" || specText.length === 0) {
    throw new Error("frozen block: spec text must be a non-empty string");
  }
  const lines = canonicalSourceText(specText).split("\n");
  const { start, end } = frozenSpan(lines);

  // Drop the trailing blank lines and the horizontal rule that belong to the §5/§6 boundary rather
  // than to §5, so that editing §6's preamble spacing cannot move the digest.
  let last = end - 1;
  while (last >= start && (lines[last].trim() === "" || lines[last].trim() === "---")) last -= 1;

  return canonicalSourceText(lines.slice(start, last + 1).join("\n"));
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
 * Extract and digest in one call.
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
