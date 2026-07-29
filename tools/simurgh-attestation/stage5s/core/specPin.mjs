// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the spec pin, as pure functions.
//
// Ruling 2: `core/` reads no file. These take text and return values; the caller does the I/O.
//
// WHY A FROZEN RANGE AND NOT JUST A FILE DIGEST. §§1-7 are frozen; annexes are amendable. A
// whole-file digest is therefore EXPECTED to move, which makes it useless as evidence that nothing
// frozen moved. The range digest is the one that carries that guarantee, and it is computed over a
// boundary defined here rather than described in prose:
//
//   start   the line `## §1 Identity, laws, and the blade`
//   end     the first `## Annex ` heading — annexes are amendable by construction
//   trim    trailing whitespace and the `---` rule that introduces the annex, because a separator
//           belongs to the annex that follows it, not to the section that precedes it
//
// Getting that trim wrong is not hypothetical: the first extraction reported §§1-7 as CHANGED when
// only the separator had been added, which would have made every future run a false positive.

import { createHash } from "node:crypto";

/** sha256 of a UTF-8 string, lowercase hex. */
export function sha256Hex(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

const FROZEN_START = "## §1 Identity";
const ANNEX_HEADING = /^## Annex /m;

/**
 * Extract the frozen §§1-7 range from the spec text.
 *
 * @param {string} specText
 * @returns {string} the range, separator-trimmed, newline-terminated
 */
export function frozenRange(specText) {
  const text = String(specText ?? "");
  const start = text.indexOf(FROZEN_START);
  if (start === -1) throw new Error("frozen range start heading not found");
  const rest = text.slice(start);
  const m = ANNEX_HEADING.exec(rest);
  const body = m ? rest.slice(0, m.index) : rest;
  // Trim trailing whitespace, then the separator rule, then whitespace again: `\n\n---\n\n`.
  return `${body
    .replace(/\s+$/, "")
    .replace(/-{3,}$/, "")
    .replace(/\s+$/, "")}\n`;
}

const PIN_FIELDS = Object.freeze({
  commit: /^post_task0_commit\s+([0-9a-f]{40})/m,
  digest: /^post_task0_digest\s+([0-9a-f]{64})/m,
  bytes: /^post_task0_bytes\s+(\d+)/m,
  frozen_range_digest: /^frozen_range_digest\s+([0-9a-f]{64})/m,
  frozen_range_bytes: /^frozen_range_bytes\s+(\d+)/m,
});

/**
 * Parse the plan's §0 pin block. Absent fields come back undefined rather than throwing, so the
 * test can report exactly which one is missing instead of a parse failure.
 *
 * @param {string} planText
 * @returns {{commit?: string, digest?: string, bytes?: string,
 *            frozen_range_digest?: string, frozen_range_bytes?: string}}
 */
export function parsePinBlock(planText) {
  const text = String(planText ?? "");
  const out = {};
  for (const [key, re] of Object.entries(PIN_FIELDS)) {
    const m = re.exec(text);
    if (m) out[key] = m[1];
  }
  return out;
}
