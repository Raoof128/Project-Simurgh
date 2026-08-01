// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 27 — the parity manifest, and why it is written first.
//
// A manifest written AFTER the mirrors describes whatever they happened to implement. Written
// before, it is a contract: a surface a mirror skipped is a set difference the test reports, not an
// omission somebody has to notice while reading four files in three languages.

import assert from "node:assert/strict";
import test from "node:test";

import {
  OUT_OF_PARITY_SCOPE,
  PARITY_IDS,
  PARITY_SURFACES,
  checkCoverage,
} from "../../../../tools/simurgh-attestation/stage5s/core/parityManifest.mjs";

test("[5s-t27] the manifest lists the shared surface of the plan", () => {
  for (const id of [
    "canonical_json",
    "checkpoint_body_digest",
    "checkpoint_envelope_digest",
    "compatibility_relation",
    "ancestry",
    "quorum_arithmetic",
    "typed_status_rendering",
  ]) {
    assert.ok(PARITY_IDS.includes(id), `${id} is not in the manifest`);
  }
  assert.equal(PARITY_SURFACES.length, PARITY_IDS.length);
});

test("[5s-t27] every surface names a symbol and states what it must agree about", () => {
  // A manifest row that named only an id would let two runtimes agree on a label while disagreeing
  // about the thing the label refers to.
  for (const surface of PARITY_SURFACES) {
    assert.ok(surface.symbol, `${surface.id} names no symbol`);
    assert.ok(surface.statement.length > 20, `${surface.id} states nothing checkable`);
  }
});

test("[5s-t27] a missing surface is a set difference, and an unknown one is too", () => {
  assert.equal(checkCoverage(PARITY_IDS).ok, true);
  const short = checkCoverage(PARITY_IDS.filter((id) => id !== "ancestry"));
  assert.equal(short.ok, false);
  assert.deepEqual(short.missing, ["ancestry"]);

  const invented = checkCoverage([...PARITY_IDS, "something_new"]);
  assert.equal(invented.ok, false);
  assert.deepEqual(invented.extra, ["something_new"]);
});

test("[5s-t27] an EMPTY report is refused, never read as full coverage", () => {
  const empty = checkCoverage([]);
  assert.equal(empty.ok, false);
  assert.equal(empty.missing.length, PARITY_IDS.length);
});

test("[5s-t27] what is OUT of parity scope is declared, with a reason each", () => {
  // The gaps are named rather than discovered. A parity claim whose boundary is implicit gets read
  // as covering everything.
  const ids = OUT_OF_PARITY_SCOPE.map((s) => s.id);
  for (const id of ["signature_verification", "ordered_evaluator", "ceremony", "file_io"]) {
    assert.ok(ids.includes(id), `${id} is neither in parity nor declared out of it`);
  }
  for (const entry of OUT_OF_PARITY_SCOPE) {
    assert.ok(
      entry.reason.length > 30,
      `${entry.id} is excluded with no reason that names a mechanism`
    );
  }
  // And the two sets are disjoint: nothing may be both promised and excused.
  for (const entry of OUT_OF_PARITY_SCOPE) {
    assert.ok(!PARITY_IDS.includes(entry.id), `${entry.id} is both in and out of parity scope`);
  }
});
