// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 13, gate G10: no 5R document prints a predecessor-band raw-code literal.
//
// 5Q broke its predecessor twice by writing raw-code literals into documentation — the second time
// into prose ABOUT the rule against them. This spec's first draft did it a third time, in the very
// subsection prohibiting it, and it passed the predecessor's census BY ACCIDENT: that census fires
// only when a band literal AND a stage-mention pattern both appear, and the draft happened to write
// the stage id without the word completing the pattern. A check that passes because of a phrasing
// accident is not a check that passed. So G10 matches literals REGARDLESS OF ADJACENT PHRASING.
//
// THE BAND IS READ, NOT IMPORTED. §2.4 forbids importing a stage5{a..q} module in the primary
// worktree, so the allocator's SOURCE TEXT is parsed for its exported bound. Reading a predecessor's
// file as data is not importing it, and the distinction is exactly the one F003 is about: an import
// executes, a read does not.

/** Where the closed band's upper bound is declared, and the constant that declares it. */
export const ALLOCATOR_PATH = "tools/simurgh-attestation/stage5p/core/rawCodeAllocator.mjs";
const HI_PATTERN = /export const VSI_ALLOCATED_HI\s*=\s*(\d+)\s*;/;

/**
 * Parse the closed band's upper bound out of the allocator's source.
 *
 * @param {string} allocatorSource
 * @returns {number}
 */
export function readAllocatedHi(allocatorSource) {
  const m = HI_PATTERN.exec(String(allocatorSource));
  if (!m) {
    throw new Error(
      "raw-code scan: could not read the allocated band from the allocator source; " +
        "refusing to guess, because a scanner with the wrong band is worse than none"
    );
  }
  return Number(m[1]);
}

/**
 * The band 5R documents must never print: every allocated code up to and including the bound.
 *
 * @param {number} hi
 * @param {number} [lo] the first code of the predecessor band
 * @returns {number[]}
 */
export function bandValues(hi, lo = 464) {
  const out = [];
  for (let v = lo; v <= hi; v += 1) out.push(v);
  return out;
}

/** Strip block and line comments, so a scanner cannot match its own explanation. */
export function stripComments(text) {
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1 ");
}

/**
 * Mask long hexadecimal runs before scanning.
 *
 * Found by this scanner firing on 5R's own spec: `466` sits inside the attack-taxonomy digest
 * `…c466c77…`, and a digit-boundary check cannot see that because the neighbours are hex LETTERS,
 * not digits. This repository is made of digests, so an unmasked scanner would report a hit on
 * almost any document and quickly be switched off — which is how a real gate dies.
 *
 * Sixteen is the threshold: no raw code is written as sixteen characters, and every digest here is
 * longer.
 *
 * @param {string} text
 * @returns {string}
 */
export function maskHexRuns(text) {
  return String(text).replace(/\b[0-9a-fA-F]{16,}\b/g, (run) => " ".repeat(run.length));
}

/**
 * Variants a literal can hide in: plain, underscored, zero-padded, spaced.
 *
 * @param {number} v
 * @returns {RegExp[]}
 */
export function literalVariants(v) {
  const d = String(v).split("");
  // The boundary rejects adjacent hex letters as well as digits, so a code cannot be "found" inside
  // a digest even when maskHexRuns has not been applied.
  const L = "(?<![0-9a-fA-F.])";
  const R = "(?![0-9a-fA-F.])";
  return [
    new RegExp(`${L}${v}${R}`),
    new RegExp(`${L}${d.join("_")}${R}`),
    new RegExp(`${L}0+${v}${R}`),
    new RegExp(`${L}${d.join("\\s")}${R}`),
  ];
}

/**
 * Scan one document for band literals.
 *
 * @param {{text: string, path: string, band: number[]}} input
 * @returns {{ok: boolean, hits: Array<{value: number, variant: string}>}}
 */
export function scanDocument({ text, path, band }) {
  const stripped = maskHexRuns(stripComments(text));
  const hits = [];
  for (const v of band) {
    for (const re of literalVariants(v)) {
      if (re.test(stripped)) {
        hits.push({ path, value: v, variant: re.source });
        break;
      }
    }
  }
  return { ok: hits.length === 0, hits };
}

/**
 * Scan a set of documents, with the anti-vacuity assertion that makes stripping safe.
 *
 * Stripping comments could make a scan vacuous — a scanner that strips everything finds nothing and
 * reports success. So the caller supplies a canary the raw text is KNOWN to contain, and the scan
 * fails loudly if stripping removed it.
 *
 * @param {{documents: Array<{path: string, text: string}>, band: number[], canary?: string}} input
 * @returns {{ok: boolean, hits: Array<object>, scanned: number, vacuity_check: string}}
 */
export function scanDocuments({ documents, band, canary = null }) {
  const hits = [];
  for (const doc of documents) {
    if (canary && doc.text.includes(canary) && !stripComments(doc.text).includes(canary)) {
      throw new Error(
        `raw-code scan: stripping removed the canary from ${doc.path}; the scan would have been vacuous`
      );
    }
    hits.push(...scanDocument({ ...doc, band }).hits);
  }
  return {
    ok: hits.length === 0,
    hits,
    scanned: documents.length,
    vacuity_check: canary ? "canary survived comment stripping" : "no canary supplied",
  };
}
