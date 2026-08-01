// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 29 — the claim gate (511), and the frozen non-claim set.
//
// EVERY BANNED PHRASE HAS A POSITIVE FIXTURE. A denylist nobody has watched fire is a denylist that
// may not fire: a regex with a typo, an anchor that never matches, a pattern shadowed by an earlier
// one. Each entry below is proved to catch its own phrase AND to leave the honest phrasing alone.
//
// THE EXCLUSIONS ARE THE LOAD-BEARING HALF. §2.9 scopes the gate to Stage 5S-authored claim
// surfaces and explicitly not to arbitrary prose, quoted prior art, test attack strings or
// historical stage documents. A gate that scanned everything would fire on its own denylist, and
// the first fix anybody reached for would be deleting the list.
//
// AND IT IS LEXICAL, NOT SEMANTIC. The signed non-claim says so. This gate catches the phrases it
// knows; it is not a proof that no paraphrase of an overclaim survives, and 4X's bound is inherited
// rather than re-argued.

import assert from "node:assert/strict";
import test from "node:test";

import {
  BANNED_PATTERNS,
  CLAIM_REFUSALS,
  NON_CLAIM_IDS,
  scanClaimSurfaces,
} from "../../../../tools/simurgh-attestation/stage5s/core/claimGate.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";

/** One phrase per banned id that MUST trip it, and one honest phrase that must not. */
const FIXTURES = Object.freeze({
  global_non_equivocation: {
    red: "The evidence shows the producer did not equivocate.",
    green: "No conflict in the committed comparison set.",
  },
  no_fork_occurred: {
    red: "We conclude that no fork occurred.",
    green: "No conflict was demonstrated within the compared views.",
  },
  expensive: {
    red: "Equivocation is expensive for a producer.",
    green: "Equivocation is detectable and attributable once compared.",
  },
  independently_witnessed: {
    red: "The checkpoint carries an independently witnessed quorum.",
    green: "The checkpoint carries a witnessed quorum, independence unproven.",
  },
  proves_honesty: {
    red: "The attestation proves the producer is honest.",
    green: "The compared checkpoints are compatible under the committed authority.",
  },
  anchor_as_witness: {
    red: "Three anchors witness the checkpoint.",
    green: "Three anchors corroborate the checkpoint envelope digest.",
  },
  model_safe: {
    red: "After this run the model is safe.",
    green: "After this run the boundary held, verifiably.",
  },
});

test("[5s-t29] the gate allocates 511, and nothing else does", () => {
  assert.equal(codeFor("NONEQUIVOCATION_OVERCLAIM"), 511);
});

test("[5s-t29] EVERY banned pattern has a fixture that trips it", () => {
  // The set relation, so a pattern added without a fixture is a failure rather than a silent gap.
  const ids = BANNED_PATTERNS.map((b) => b.id).sort();
  assert.deepEqual(ids, Object.keys(FIXTURES).sort(), "a banned pattern has no positive fixture");
});

for (const [id, fixture] of Object.entries(FIXTURES)) {
  test(`[5s-t29] ${id} — the banned phrase is caught`, () => {
    const result = scanClaimSurfaces([{ id: "surface", text: fixture.red }]);
    assert.equal(result.ok, false, `"${fixture.red}" passed the gate`);
    assert.ok(
      result.refusals.some((r) => r.banned_id === id),
      `caught by ${result.refusals.map((r) => r.banned_id)} rather than ${id}`
    );
  });

  test(`[5s-t29] ${id} — the honest phrasing passes`, () => {
    // Without this, a pattern of `/./` would catch every banned phrase and be useless.
    const result = scanClaimSurfaces([{ id: "surface", text: fixture.green }]);
    assert.equal(
      result.ok,
      true,
      `the honest phrasing was refused: ${JSON.stringify(result.refusals)}`
    );
  });
}

test("[5s-t29] every banned pattern says WHY and what to write instead", () => {
  // A denylist that says only "no" teaches nothing and gets worked around rather than understood.
  for (const banned of BANNED_PATTERNS) {
    assert.ok(banned.why.length > 30, `${banned.id} gives no reason`);
    assert.ok(banned.instead.length > 10, `${banned.id} offers no replacement`);
  }
});

test("[5s-t29] an EMPTY surface set is a refusal, never a pass", () => {
  // A gate over nothing passes hardest when it covers least.
  for (const empty of [[], null, undefined]) {
    const result = scanClaimSurfaces(empty);
    assert.equal(result.ok, false, `${JSON.stringify(empty)} passed`);
    assert.ok(result.refusals.some((r) => r.reason === CLAIM_REFUSALS.EMPTY_SURFACE_SET));
  }
});

test("[5s-t29] an unreadable surface is a refusal, never skipped", () => {
  const result = scanClaimSurfaces([{ id: "ok", text: "clean text" }, { id: "bad" }]);
  assert.equal(result.ok, false);
  assert.ok(result.refusals.some((r) => r.reason === CLAIM_REFUSALS.SURFACE_UNREADABLE));
});

test("[5s-t29] the scan reports WHICH surfaces it read", () => {
  // Anti-vacuity: a gate that returns ok without naming what it scanned cannot be distinguished
  // from a gate that scanned nothing.
  const result = scanClaimSurfaces([
    { id: "readme", text: "clean" },
    { id: "closeout", text: "also clean" },
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.scanned, ["closeout", "readme"]);
});

test("[5s-t29] the signed non-claim ID set is frozen and non-empty", () => {
  assert.ok(Object.isFrozen(NON_CLAIM_IDS));
  assert.ok(NON_CLAIM_IDS.length >= 6, `only ${NON_CLAIM_IDS.length} non-claims`);
  assert.equal(new Set(NON_CLAIM_IDS).size, NON_CLAIM_IDS.length, "a non-claim id is repeated");
  // The four the rest of the stage leans on hardest, named so a deletion is a test failure.
  for (const id of [
    "comparison_bounded_detection",
    "independence_unproven",
    "anchors_carry_no_witness_weight",
    "lexical_not_semantic_claim_gate",
  ]) {
    assert.ok(NON_CLAIM_IDS.includes(id), `${id} is not in the signed set`);
  }
});

test("[5s-t29] the gate is LEXICAL, and the non-claim set says so", () => {
  // The bound this gate cannot exceed, declared rather than discovered by a reviewer. A paraphrase
  // it does not know passes, and that is a property of the mechanism, not a bug in the list.
  assert.ok(NON_CLAIM_IDS.includes("lexical_not_semantic_claim_gate"));
  const paraphrase = "the comparison establishes that forking did not take place at all";
  assert.equal(scanClaimSurfaces([{ id: "s", text: paraphrase }]).ok, true);
});

test("[5s-t29] one surface's overclaim is reported against THAT surface", () => {
  const result = scanClaimSurfaces([
    { id: "clean-readme", text: "no conflict in the committed comparison set" },
    { id: "dirty-closeout", text: "the producer never equivocated" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.refusals.length, 1);
  assert.equal(result.refusals[0].surface, "dirty-closeout");
});
