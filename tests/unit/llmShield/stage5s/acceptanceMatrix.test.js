// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 20 — the acceptance matrix, pinned twice.
//
// WHY TWICE (§13, B5). Each pin fails in a way the other cannot.
//
//   IDENTITY ALONE lets a row keep its name while its meaning drifts underneath. `5S-XP-MET-
//   INCOMPLETE` goes on existing, the id set still matches, and the row now expects a clean
//   comparison where it used to expect a finding. The pin is green and the claim has been reversed.
//
//   SEMANTICS ALONE moves the digest and says nothing about what moved. A reviewer is left choosing
//   between trusting a diff and re-deriving twenty-one rows by hand, which in practice means
//   trusting the diff.
//
// Together they cover each other: the id set says WHICH rows exist, the digest says whether any of
// them changed, and the field-level drift says which case, which column, from what to what.
//
// SET-PINNED, NEVER COUNTED (Q1-F002). `added` and `removed` are computed and reported separately,
// because one deletion plus one addition balances every count and is exactly what a quiet
// substitution looks like.
//
// AND THE SORT IS CODE-UNIT, NEVER `localeCompare`. Q1's `::` / `-` disagreement was a locale-aware
// sort ordering two ids differently on two machines — a "byte-stable" pin that depended on the
// reader's locale.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MATRIX_REFUSALS,
  caseIdSet,
  checkMatrix,
  compareIdentity,
  fieldDrift,
  semanticDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/acceptanceMatrix.mjs";
import {
  ACCEPTANCE_COLUMNS,
  CASES,
} from "../../../../tools/simurgh-attestation/stage5s/fixtures/cases.mjs";

const PIN_PATH = "docs/research/llm-shield/evidence/stage-5s/acceptance-matrix-pin.json";
const PIN = JSON.parse(readFileSync(PIN_PATH, "utf8"));

/** The matrix as the corpus currently defines it — authored expectations, never computed. */
const rowsNow = () =>
  CASES.map((c) => ({ case_id: c.case_id, family: c.family, denies: c.denies, ...c.expect }));

const COLUMNS = PIN.columns;

// ------------------------------------------------------------------ the two pins

test("[5s-t20] the committed pin covers the eleven acceptance columns plus family and denies", () => {
  for (const column of ACCEPTANCE_COLUMNS) {
    assert.ok(COLUMNS.includes(column), `${column} is not pinned`);
  }
  assert.ok(COLUMNS.includes("denies"), "the denied adversary win is part of a row's meaning");
  assert.ok(COLUMNS.includes("family"), "the family is part of a row's meaning");
});

test("[5s-t20] the matrix matches BOTH pins", () => {
  const result = checkMatrix(PIN, rowsNow(), COLUMNS);
  assert.equal(
    result.ok,
    true,
    `the matrix drifted from ${PIN_PATH}:\n${result.refusals
      .map((r) => `  ${r.reason} — ${r.detail}`)
      .join("\n")}`
  );
  assert.deepEqual(result.identity.added, []);
  assert.deepEqual(result.identity.removed, []);
  assert.equal(result.semantic.ok, true);
});

test("[5s-t20] the pin is not vacuous — it pins real rows over real columns", () => {
  assert.ok(PIN.case_ids.length >= 20, `only ${PIN.case_ids.length} cases pinned`);
  assert.equal(PIN.case_ids.length, PIN.rows.length);
  assert.equal(new Set(PIN.case_ids).size, PIN.case_ids.length, "a case id is pinned twice");
  assert.match(PIN.semantic_digest, /^[0-9a-f]{64}$/);
  // Every pinned row carries every pinned column: a pin with holes commits to less than it claims.
  for (const row of PIN.rows) {
    for (const column of COLUMNS) {
      assert.ok(column in row, `${row.case_id} pins no ${column}`);
    }
  }
});

// ------------------------------------------------------------------ identity drift

test("[5s-t20] a REMOVED case is reported as removed, not as a count", () => {
  const short = rowsNow().filter((r) => r.case_id !== "5S-XP-MET-INCOMPLETE");
  const result = checkMatrix(PIN, short, COLUMNS);
  assert.equal(result.ok, false);
  assert.deepEqual(result.identity.removed, ["5S-XP-MET-INCOMPLETE"]);
  assert.deepEqual(result.identity.added, []);
});

test("[5s-t20] an ADDED case is reported as added", () => {
  const extra = [...rowsNow(), { ...rowsNow()[0], case_id: "5S-A-NEW-CASE" }];
  const result = checkMatrix(PIN, extra, COLUMNS);
  assert.equal(result.ok, false);
  assert.deepEqual(result.identity.added, ["5S-A-NEW-CASE"]);
  assert.deepEqual(result.identity.removed, []);
});

test("[5s-t20] one deletion plus one addition does NOT balance out", () => {
  // The whole reason the pin is a set. A count of twenty-one is satisfied by swapping a case for a
  // different one, which is what a quiet substitution looks like from the outside.
  const swapped = rowsNow()
    .filter((r) => r.case_id !== "5S-A-F3-ANCESTRY-UNPROVABLE")
    .concat({ ...rowsNow()[0], case_id: "5S-A-SUBSTITUTE" });
  assert.equal(swapped.length, rowsNow().length, "the fixture does not actually keep the count");

  const result = checkMatrix(PIN, swapped, COLUMNS);
  assert.equal(result.ok, false);
  assert.deepEqual(result.identity.added, ["5S-A-SUBSTITUTE"]);
  assert.deepEqual(result.identity.removed, ["5S-A-F3-ANCESTRY-UNPROVABLE"]);
});

// ------------------------------------------------------------------ semantic drift

test("[5s-t20] a row whose MEANING drifts under an unchanged id is caught", () => {
  // The failure the identity pin cannot see: the id set is byte-identical and the claim is reversed.
  const reversed = rowsNow().map((r) =>
    r.case_id === "5S-XP-MET-INCOMPLETE"
      ? { ...r, comparison_status: "no_conflict_in_committed_comparison_set" }
      : r
  );
  assert.deepEqual(caseIdSet(reversed), PIN.case_ids, "the id set must be unchanged for this test");

  const result = checkMatrix(PIN, reversed, COLUMNS);
  assert.equal(result.ok, false);
  assert.equal(result.identity.ok, true, "identity alone would have passed this");
  assert.equal(result.semantic.ok, false);
});

test("[5s-t20] semantic drift names the case, the column, and both values", () => {
  const drifted = rowsNow().map((r) =>
    r.case_id === "5S-A-F2-FORK-SAME-EPOCH" ? { ...r, verifier_exit: 496 } : r
  );
  const result = checkMatrix(PIN, drifted, COLUMNS);
  const refusal = result.refusals.find((x) => x.reason === MATRIX_REFUSALS.SEMANTIC_DRIFT);
  assert.ok(refusal, "no semantic refusal was raised");
  assert.deepEqual(refusal.drift, [
    {
      case_id: "5S-A-F2-FORK-SAME-EPOCH",
      column: "verifier_exit",
      pinned: 0,
      actual: 496,
    },
  ]);
  assert.match(refusal.detail, /5S-A-F2-FORK-SAME-EPOCH\.verifier_exit: 0 → 496/);
});

test("[5s-t20] drift is reported per COLUMN, not as one opaque row difference", () => {
  const drifted = rowsNow().map((r) =>
    r.case_id === "5S-A-F1-CLEAN-SAME-CHECKPOINT"
      ? { ...r, comparison_status: "equivocation_detected", intake_complete: false }
      : r
  );
  const drift = fieldDrift(PIN.rows, drifted, COLUMNS);
  assert.equal(drift.length, 2);
  assert.deepEqual(drift.map((d) => d.column).sort(), ["comparison_status", "intake_complete"]);
});

test("[5s-t20] field drift ignores added and removed rows — that is identity's job", () => {
  // Mixing the two is how a report ends up claiming everything changed when one row was inserted.
  const extra = [...rowsNow(), { case_id: "5S-A-BRAND-NEW", verifier_exit: 999 }];
  assert.deepEqual(fieldDrift(PIN.rows, extra, COLUMNS), []);
});

// ------------------------------------------------------------------ determinism and fail-closed

test("[5s-t20] the digest is order-independent and the sort is code-unit, not locale", () => {
  const forward = rowsNow();
  const reversed = [...forward].reverse();
  assert.equal(semanticDigest(forward, COLUMNS), semanticDigest(reversed, COLUMNS));

  // The ordering property, asserted DIRECTLY. The first version of this test asserted that
  // `localeCompare` disagrees with code-unit order on the `::` / `-` pair — which is itself a
  // machine-dependent claim, and it failed here because this machine's locale happens to agree. A
  // test that depends on the reader's locale to prove independence from the reader's locale is the
  // bug it is testing for.
  const ids = ["5S-A::b", "5S-A-b", "5S-A_b", "5S-A.b"];
  const codeUnit = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(caseIdSet(ids.map((case_id) => ({ case_id }))), codeUnit);
});

test("[5s-t20] the sort never calls localeCompare — checked over source", () => {
  // Source, because the behavioural test above can only observe the locale it happens to run under.
  // Q1's `::` / `-` disagreement passed on the machine that wrote it and failed on the next one.
  const code = readFileSync("tools/simurgh-attestation/stage5s/core/acceptanceMatrix.mjs", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  assert.ok(code.includes("byCodeUnit"), "the extracted source is not the module");
  assert.ok(!code.includes("localeCompare"), "the matrix sorts with a locale-aware comparison");
  assert.ok(!code.includes("Intl."), "the matrix reaches for a locale-aware collator");
});

test("[5s-t20] the same rows digest identically across repeated calls", () => {
  assert.equal(semanticDigest(rowsNow(), COLUMNS), semanticDigest(rowsNow(), COLUMNS));
  assert.equal(semanticDigest(rowsNow(), COLUMNS), PIN.semantic_digest);
});

test("[5s-t20] an EMPTY matrix is refused, never silently satisfied", () => {
  // Every set comparison and every digest over nothing is trivially consistent with itself, so the
  // empty case has to be refused explicitly or the pin passes hardest when it covers least.
  const result = checkMatrix(PIN, [], COLUMNS);
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === MATRIX_REFUSALS.EMPTY));
});

test("[5s-t20] malformed inputs fail closed", () => {
  for (const [pin, rows, columns] of [
    [null, rowsNow(), COLUMNS],
    [PIN, null, COLUMNS],
    [PIN, rowsNow(), null],
    [undefined, undefined, undefined],
  ]) {
    assert.equal(checkMatrix(pin, rows, columns).ok, false);
  }
  assert.deepEqual(caseIdSet(null), []);
  assert.deepEqual(compareIdentity(null, []).added, []);
});

test("[5s-t20] every corpus case appears in the pin, and the pin invents none", () => {
  // The pin and the corpus are two authorities and this is where they have to agree. If a case is
  // added to the corpus and the pin is not updated deliberately, this is the test that says so.
  assert.deepEqual(caseIdSet(rowsNow()), PIN.case_ids);
});
