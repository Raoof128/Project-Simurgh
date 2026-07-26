// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 18.1 — the Lean core is bound to what it actually SAYS.
//
// NAMES ALONE ARE WORTHLESS (gauntlet P1-30). A file containing all seven theorem names, each
// proving `True`, passes a name-only check while proving nothing whatsoever. That is F001's disease
// wearing a formal hat: a gate that is green because it is looking at the wrong thing.
//
// So each theorem's STATEMENT is pinned by digest. Changing what a theorem says fails this gate
// even when the identifier is untouched. Statement changes are legitimate — they simply require
// updating the pinned digest deliberately, and deliberately is the entire point.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const RAW = readFileSync("proofs/stage5q/Vsr.lean", "utf8");

/**
 * Lean source with comments removed.
 *
 * The escape scan must read CODE, not prose. The first version scanned the whole file and failed on
 * this very test file's sibling — the proof's own doc comment says the words "sorry", "admit" and
 * "native_decide" while explaining why none of them appear. A gate that cannot tell a prohibition
 * from its own description fires on documentation and gets relaxed until it fires never.
 *
 * The risk of stripping is the opposite error — an escape hidden behind a comment marker — so the
 * stripper is asserted below to leave the code intact.
 */
export function stripComments(source) {
  return source.replace(/\/-[\s\S]*?-\//g, " ").replace(/--.*$/gm, " ");
}

const SOURCE = RAW;
const CODE = stripComments(RAW);

/** Statement = everything between `theorem <name>` and its proof marker, whitespace-normalised. */
export function statementOf(source, name) {
  const start = source.indexOf(`theorem ${name}`);
  if (start < 0) return null;
  const end = source.indexOf(":= by", start);
  if (end < 0) return null;
  return source.slice(start, end).replace(/\s+/g, " ").trim();
}

const digestOf = (name) => {
  const s = statementOf(SOURCE, name);
  return s === null ? null : createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
};

/**
 * The pinned statements. Regenerate deliberately when a theorem's meaning changes:
 *   node -e '…statementOf…'   and paste the new digest with the reason in the commit body.
 */
const PINNED = {
  delegationNonVacuous: "c557ed5fccdb862e283b598f64a772280e9fdfd4d30cb240a76c6972c90a32d9",
  delegationAcyclic: "248ca98f68575963e4623d00b5b06581937ddd6a4df95076e4de580add66011a",
  coverageTotality: "aaa81cab930e1cab36b99766ae745e55cacc960e3afd1406c5c1df6012ab44c0",
  ledgerAppendMonotone: "366e002dbf73e7d13a388aeeeed1a11c89b221f0cc3e57f43d01fd395adeff3d",
  admissibilityBlocks: "e54e2edfbf036525ad8fc967b1053488003c7429595583190022d8c5297de669",
  closureBindsResults: "dbb219cd474f1799abe987c76078998e4abe31a6000cc13f058eb131bfd92b0e",
  projectionSoundness: "668d7aefd948cde261267ff8497a45d54974232c4b3dd67dbfdadff0b3a80b29",
};

const NAMES = Object.keys(PINNED);

test("all seven 5Q theorems exist", () => {
  assert.equal(NAMES.length, 7);
  for (const n of NAMES) {
    assert.ok(SOURCE.includes(`theorem ${n}`), `${n} must be present`);
  }
});

test("ZERO escapes — no sorry, admit or native_decide", () => {
  // An escape hatch in a proof is the formal analogue of a vacuous gate: it type-checks, it is
  // green, and it establishes nothing.
  for (const escape of ["sorry", "admit", "native_decide"]) {
    assert.equal(
      new RegExp(`\\b${escape}\\b`).test(CODE),
      false,
      `${escape} present in CODE — the proof would be green and empty`
    );
  }
  // The stripper must not have eaten the proof along with the prose.
  for (const kept of ["theorem", "Status", "receiptValid", "simp"]) {
    assert.ok(CODE.includes(kept), `stripComments removed ${kept}; it is deleting code`);
  }
  // And it must genuinely strip: this proof's own comments DO contain the prohibited words.
  assert.ok(/\bsorry\b/.test(RAW), "the doc comment mentions the escapes it forbids");
});

test("each theorem's STATEMENT matches its pinned digest", () => {
  // The load-bearing test. Seven theorems named `delegationAcyclic` … each proving `True` would
  // satisfy the existence test above and prove nothing at all.
  for (const n of NAMES) {
    const actual = digestOf(n);
    assert.ok(actual, `${n} has an extractable statement`);
    assert.equal(
      actual,
      PINNED[n],
      `${n}'s statement changed. If that was deliberate, update the pin with the reason in the ` +
        `commit body — a pin updated silently is a pin that never fired.`
    );
  }
});

test("the statements are DISTINCT — seven names over one claim would be a false core", () => {
  const digests = NAMES.map(digestOf);
  assert.equal(new Set(digests).size, 7, "two theorems sharing a statement is a duplicated claim");
});

test("no theorem statement is trivially True", () => {
  for (const n of NAMES) {
    const s = statementOf(SOURCE, n);
    assert.ok(!/:\s*True\s*$/.test(s), `${n} proves True, which is the empty proof`);
    assert.ok(s.length > 40, `${n}'s statement is too short to be saying anything`);
  }
});

test("the theorems are 5Q's OWN invariants, not restatements of earlier stages", () => {
  // A formal core that re-proves what 5O already proved adds a file and no assurance.
  for (const required of [
    "dischargesByDelegation",
    "Status",
    "receiptValid",
    "boundToCommitment",
    "isConflict",
  ]) {
    assert.ok(SOURCE.includes(required), `${required} is a 5Q concept and must be defined here`);
  }
});
