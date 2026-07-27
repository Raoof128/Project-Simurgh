// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 13, gate G7: no 5R artifact attributes a post-5Q figure to 5Q.
//
// §0.1's two sentences govern everything downstream: nothing in 5R changes the published 5Q result,
// and no sentence may say 5Q itself reached the later percentage. §6 makes the first mechanical by
// giving the ledger no field able to express a revised 5Q figure. This makes the second mechanical.
//
// THE GATE WILL SCAN A FILE IT LIVES INSIDE. Three separate 5Q guards did exactly that and went
// vacuously green — the Lean escape scan reading "sorry" from its own comment, the browser parity
// check finding its failure token in the branch that sets it, K7-A's bare-existence scan matching its
// own explanation. So this strips comments FIRST and then asserts the raw file still contains the
// pattern, because stripping that made the scan vacuous would be the same bug wearing a fourth hat.

/** The one figure 5Q published, and the only one that may be attributed to it. */
export const Q0_PUBLISHED_PERCENT = "6.2";

/** Strip comments so the gate does not match its own explanation. */
export function stripComments(text) {
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1 ");
}

/**
 * Sentence shapes that attribute a coverage percentage to 5Q.
 *
 * Deliberately narrow: it looks for 5Q named within a short span of a percentage, which is the shape
 * of the forbidden claim. A figure discussed far from any mention of 5Q is outside the pattern, and
 * saying so is more honest than implying the gate reads meaning.
 */
const ATTRIBUTION_PATTERNS = Object.freeze([
  /5Q[^.\n]{0,80}?(\d+\.\d+)\s*%/gi,
  /(\d+\.\d+)\s*%[^.\n]{0,40}?\b(?:for|by|of)\s+5Q\b/gi,
]);

/**
 * Scan one document for post-5Q figures attributed to 5Q.
 *
 * @param {{text: string, path: string}} doc
 * @returns {{ok: boolean, violations: Array<{path: string, percent: string, excerpt: string}>}}
 */
export function scanProse({ text, path }) {
  const stripped = stripComments(text);
  const violations = [];
  for (const pattern of ATTRIBUTION_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const percent = m[1];
      if (percent === Q0_PUBLISHED_PERCENT) continue;
      violations.push({
        path,
        percent,
        excerpt: m[0].replace(/\s+/g, " ").trim().slice(0, 120),
      });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Scan a set of documents, with the anti-vacuity assertion.
 *
 * @param {{documents: Array<{path: string, text: string}>, canary?: string}} input
 * @returns {{ok: boolean, violations: Array<object>, scanned: number, vacuity_check: string}}
 */
export function scanAll({ documents, canary = null }) {
  const violations = [];
  for (const doc of documents) {
    if (canary && doc.text.includes(canary) && !stripComments(doc.text).includes(canary)) {
      throw new Error(
        `prose gate: stripping removed the canary from ${doc.path}; the scan would have been vacuous`
      );
    }
    violations.push(...scanProse(doc).violations);
  }
  return {
    ok: violations.length === 0,
    violations,
    scanned: documents.length,
    vacuity_check: canary ? "canary survived comment stripping" : "no canary supplied",
  };
}
