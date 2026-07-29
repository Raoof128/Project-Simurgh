// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 1 — the spec pin.
//
// The plan is written against one exact spec. Amending the spec without re-pinning the plan must
// turn CI red, or the plan silently describes a document that no longer exists.
//
// TWO DIGESTS, NOT ONE. The whole-file digest moves whenever an amendable section changes — that is
// expected and legal. It therefore cannot distinguish "Annex M was added" from "Annex M was added
// and §4 was quietly reworded". The frozen-range digest over §§1-7 can, and it must NEVER move.
//
// The pin is PARSED FROM THE PLAN, never re-declared here: two copies of a declaration are two
// chances to disagree, and the one that disagrees silently is the one nobody is looking at.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  frozenRange,
  parsePinBlock,
  sha256Hex,
} from "../../../../tools/simurgh-attestation/stage5s/core/specPin.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";
const PLAN = "docs/superpowers/plans/2026-07-29-stage-5s-vwq-implementation-plan.md";

const specText = readFileSync(SPEC, "utf8");
const pin = parsePinBlock(readFileSync(PLAN, "utf8"));

test("[5s-t1] the plan carries a complete pin block", () => {
  for (const k of ["commit", "digest", "bytes", "frozen_range_digest", "frozen_range_bytes"]) {
    assert.ok(pin[k], `plan §0 is missing ${k}`);
  }
  assert.match(pin.digest, /^[0-9a-f]{64}$/);
  assert.match(pin.frozen_range_digest, /^[0-9a-f]{64}$/);
  assert.match(pin.commit, /^[0-9a-f]{40}$/);
});

test("[5s-t1] the live spec matches the pinned whole-file digest", () => {
  assert.equal(sha256Hex(specText), pin.digest, "spec changed without re-pinning the plan");
  assert.equal(Buffer.byteLength(specText, "utf8"), Number(pin.bytes));
});

test("[5s-t1] the FROZEN RANGE §§1-7 matches, and this digest may never move", () => {
  const fr = frozenRange(specText);
  assert.equal(sha256Hex(fr), pin.frozen_range_digest, "a frozen section was modified");
  assert.equal(Buffer.byteLength(fr, "utf8"), Number(pin.frozen_range_bytes));
});

test("[5s-t1] a mutated spec is REFUSED by both digests", () => {
  // The negative witness. Without it the test proves only that two equal things are equal.
  const mutated = specText.replace("No Self-Witness", "No Self-Witnessing");
  assert.notEqual(mutated, specText, "the mutation did not apply — the test would be vacuous");
  assert.notEqual(sha256Hex(mutated), pin.digest);
  assert.notEqual(sha256Hex(frozenRange(mutated)), pin.frozen_range_digest);
});

test("[5s-t1] the frozen range excludes the annex, so an amendment does not move it", () => {
  const amended = specText + "\n\n## Annex Z — a later amendment\n\nnew text\n";
  assert.notEqual(sha256Hex(amended), pin.digest, "whole-file digest must move");
  assert.equal(
    sha256Hex(frozenRange(amended)),
    pin.frozen_range_digest,
    "frozen range must NOT move when an amendable annex is added"
  );
});
