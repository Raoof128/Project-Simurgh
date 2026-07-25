// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Tasks 6+7 — the S2.* matrix and tamper net.
//
// The expectations in this file are transcribed from the SPEC's frozen §2.4 matrix, not read off
// the implementation. Where the two disagree, the implementation is wrong.
//
// PREMISE GATE (mandatory, §2.4): a negative fixture must first prove it generated a negative case.
// For every row we assert the mutation actually applied, the ancestor is genuinely accepted, and
// only then that the mutant is rejected at the expected check. A premise failure reports as
// PREMISE FAILED, distinctly from an implementation failure.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifySection2,
  SECTION2_CHECK_IDS,
  POLICY_OUTCOMES,
} from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import { compareStrength } from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";
import {
  cleanAncestor,
  S2_FIXTURES,
  PINNED,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs";

// The frozen order, transcribed from spec §2.3.
const FROZEN_ORDER = [
  "S2.C1",
  "S2.C2",
  "S2.C3",
  "S2.C4",
  "S2.C5",
  "S2.C6",
  "S2.C7",
  "S2.C8",
  "S2.C9",
];

// The frozen matrix, transcribed from spec §2.4.
const FROZEN_MATRIX = [
  ["S2.1", "S2.C7", "accountable_role_unproven"],
  ["S2.2", "S2.C5", "identity_principal_mismatch"],
  ["S2.3", "S2.C4", "identity_replay_upgrade_attempted"],
  ["S2.4", "S2.C8", "identity_strength_incomparable"],
  ["S2.5", "S2.C3", "identity_provider_untrusted"],
  ["S2.6", "S2.C6", "identity_claim_mismatch"],
];

test("the verifier's check order matches the frozen spec order exactly", () => {
  assert.deepEqual([...SECTION2_CHECK_IDS], FROZEN_ORDER);
});

test("the ancestor is genuinely ACCEPTED — without this every fixture below is meaningless", () => {
  const r = verifySection2(cleanAncestor(), PINNED);
  assert.equal(r.ok, true, `PREMISE FAILED: clean ancestor rejected — ${JSON.stringify(r)}`);
  assert.deepEqual([...r.checks_satisfied], FROZEN_ORDER, "a clean run satisfies all nine checks");
});

test("the fixture register matches the frozen §2.4 matrix row for row", () => {
  assert.deepEqual(
    S2_FIXTURES.map((f) => [f.fixture_id, f.expected_check_id, f.expected_policy_outcome]),
    FROZEN_MATRIX
  );
});

for (const [fixtureId, expectedCheck, expectedOutcome] of FROZEN_MATRIX) {
  const fixture = S2_FIXTURES.find((f) => f.fixture_id === fixtureId);

  test(`${fixtureId} — ${fixture.single_defect_description}`, () => {
    const ancestor = cleanAncestor();
    const mutant = fixture.build();

    // PREMISE 1: the mutation actually applied.
    assert.notDeepEqual(mutant, ancestor, `PREMISE FAILED: ${fixtureId} produced no mutation`);
    // PREMISE 2: the base really is accepted.
    assert.equal(
      verifySection2(ancestor, PINNED).ok,
      true,
      "PREMISE FAILED: ancestor not accepted"
    );

    const r = verifySection2(mutant, PINNED);
    assert.equal(r.ok, false, `${fixtureId} was accepted but must be rejected`);
    assert.equal(
      r.check_id,
      expectedCheck,
      `${fixtureId} first-failed at ${r.check_id}, expected ${expectedCheck}`
    );
    assert.equal(r.outcome, expectedOutcome);
    assert.ok(
      POLICY_OUTCOMES.includes(r.outcome),
      "outcome is one of the nine frozen symbolic values"
    );
  });
}

test("S2.6's premise: the two asserted vectors are genuinely INCOMPARABLE, not merely different", () => {
  const mutant = S2_FIXTURES.find((f) => f.fixture_id === "S2.6").build();
  const [a, b] = mutant.evidences.map((e) => e.asserted_strength_delta);
  assert.equal(
    compareStrength(a, b),
    "incomparable",
    "PREMISE FAILED: S2.6 must contradict, not merely differ"
  );
});

test("S2.3's premise: the replayed evidence carries the SAME underlying evidence digest", () => {
  const mutant = S2_FIXTURES.find((f) => f.fixture_id === "S2.3").build();
  const [first, second] = mutant.evidences;
  assert.equal(first.evidence_digest, second.evidence_digest, "PREMISE FAILED: not a replay");
  assert.notEqual(first.profile_id, second.profile_id, "PREMISE FAILED: profile was not upgraded");
});

test("no later check shadows an earlier defect: each rejection names a check no later than expected", () => {
  for (const [fixtureId, expectedCheck] of FROZEN_MATRIX) {
    const fixture = S2_FIXTURES.find((f) => f.fixture_id === fixtureId);
    const r = verifySection2(fixture.build(), PINNED);
    const reportedIdx = FROZEN_ORDER.indexOf(r.check_id);
    const expectedIdx = FROZEN_ORDER.indexOf(expectedCheck);
    assert.equal(
      reportedIdx,
      expectedIdx,
      `${fixtureId}: first failure must be exactly at ${expectedCheck}`
    );
  }
});

test("every frozen check id and every frozen outcome is a stable symbol, never a number", () => {
  for (const id of SECTION2_CHECK_IDS) assert.match(id, /^S2\.C[1-9]$/);
  for (const o of POLICY_OUTCOMES)
    assert.match(o, /^[a-z][a-z_]*$/, "symbolic outcomes only — no raw codes in Lane A");
});
