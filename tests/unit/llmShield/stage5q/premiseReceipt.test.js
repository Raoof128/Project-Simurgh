// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 9 — the premise gate (spec §4.4), inherited from 5P.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  makePremiseReceipt,
  verifyPremise,
  registryIsTotal,
  PREDICATES,
} from "../../../../tools/simurgh-attestation/stage5q/core/premiseReceipt.mjs";
import { PREDICATE_REGISTRY } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const bytesOf = (obj) => Buffer.from(JSON.stringify(obj), "utf8");
const digestOf = (obj) => createHash("sha256").update(bytesOf(obj)).digest("hex");

/** A fixture store that behaves like a real one: it returns the bytes for a digest, or throws. */
const store = (...fixtures) => {
  const map = new Map(fixtures.map((f) => [digestOf(f), bytesOf(f)]));
  return {
    readFixture: (d) => {
      if (!map.has(d)) throw new Error(`no fixture for ${d}`);
      return map.get(d);
    },
  };
};

const receiptFor = (fixture, predicate_id, predicate_args = {}) =>
  makePremiseReceipt({
    pack_id: "5q-5a-r1-01",
    closure_digest: "c".repeat(64),
    target_function_id: "5a:x.mjs:f",
    fixture_digest: digestOf(fixture),
    predicate_id,
    predicate_args,
  });

// ---------------------------------------------------------------------------------------------
// THE 5P DEFECT, REPRODUCED AS A FIXTURE SO IT CAN NEVER RECUR SILENTLY
// ---------------------------------------------------------------------------------------------

test("a pack claiming CONTRADICTION whose two vectors merely DIFFER is REJECTED", () => {
  // The literal 5P defect. A negative fixture claimed "contradictory assertions" while its two
  // vectors merely differed — which made contradiction geometrically impossible. The fixture tested
  // an easier rule than it claimed, it passed, and the pass meant nothing.
  const merelyDifferent = {
    vectors: [
      { subject: "artifact-A", tier: "strict" },
      { subject: "artifact-B", tier: "loose" },
    ],
  };
  const r = verifyPremise(receiptFor(merelyDifferent, "contradicts"), store(merelyDifferent));
  assert.equal(r.ok, false);
  assert.equal(r.recomputed, false);
  assert.match(r.reason, /different subjects/);
  assert.equal(r.problems[0].kind, "premise_does_not_hold");
  assert.match(r.problems[0].reason, /vacuous|inadmissible/);
});

test("two vectors about the same subject that share NO assigned key also merely differ", () => {
  // The subtler half of the same defect: same subject, but nothing they both assign.
  const f = {
    vectors: [
      { subject: "A", tier: "strict" },
      { subject: "A", colour: "red" },
    ],
  };
  const r = verifyPremise(receiptFor(f, "contradicts"), store(f));
  assert.equal(r.ok, false);
  assert.match(r.reason, /share no assigned key|5P defect/);
});

test("a GENUINE contradiction — same subject, conflicting value for a shared key — is admitted", () => {
  const f = {
    vectors: [
      { subject: "A", tier: "strict" },
      { subject: "A", tier: "loose" },
    ],
  };
  const r = verifyPremise(receiptFor(f, "contradicts"), store(f));
  assert.equal(r.ok, true);
  assert.equal(r.recomputed, true);
  assert.match(r.reason, /conflicting assignment of tier/);
});

test("two vectors that AGREE on every shared key are not a contradiction either", () => {
  const f = {
    vectors: [
      { subject: "A", tier: "strict" },
      { subject: "A", tier: "strict" },
    ],
  };
  assert.equal(verifyPremise(receiptFor(f, "contradicts"), store(f)).ok, false);
});

// ---------------------------------------------------------------------------------------------
// The receipt binds BYTES, not claims (gauntlet P1-20)
// ---------------------------------------------------------------------------------------------

test("a producer-supplied assertion CANNOT satisfy the gate", () => {
  // The defect P1-20 names: `generatedCase`/`assertion` had no schema and the receipt bound
  // nothing, so `assertion: true` would have satisfied it completely. Here the fixture says so as
  // loudly as it likes and the recomputation still governs.
  const f = {
    assertion: true,
    generatedCase: true,
    premise_holds: true,
    vectors: [
      { subject: "A", tier: "x" },
      { subject: "B", tier: "y" },
    ],
  };
  const r = verifyPremise(receiptFor(f, "contradicts"), store(f));
  assert.equal(r.ok, false, "the declaration is not evidence; the recomputation is");
});

test("a fixture whose bytes do not hash to the receipt's digest is REFUSED", () => {
  // Without this the receipt names a fixture and the verifier reads whatever it was handed — the
  // difference between evidence and a label.
  const real = {
    vectors: [
      { subject: "A", tier: "x" },
      { subject: "A", tier: "y" },
    ],
  };
  const swapped = {
    vectors: [
      { subject: "A", tier: "x" },
      { subject: "A", tier: "z" },
    ],
  };
  const receipt = receiptFor(real, "contradicts");
  const r = verifyPremise(receipt, { readFixture: () => bytesOf(swapped) });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "fixture_digest_mismatch");
});

test("an unreadable fixture fails CLOSED", () => {
  const f = {
    vectors: [
      { subject: "A", tier: "x" },
      { subject: "A", tier: "y" },
    ],
  };
  const r = verifyPremise(receiptFor(f, "contradicts"), store());
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "fixture_unreadable");
});

test("a fixture missing the shape the predicate needs fails CLOSED, never silently true", () => {
  // An unevaluable premise is not a satisfied premise.
  const f = { nothing: "useful" };
  const r = verifyPremise(receiptFor(f, "omitsMember"), store(f));
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "predicate_unevaluable");
  assert.match(r.reason, /missing 'universe'/);
});

// ---------------------------------------------------------------------------------------------
// The registry is CLOSED and TOTAL
// ---------------------------------------------------------------------------------------------

test("the registry is closed at fifteen and every named predicate has an implementation", () => {
  // Second gauntlet B8: six predicates could not express the premises the sixteen trays and three
  // campaigns require, and a pack with no way to state its premise has no way to prove it.
  const t = registryIsTotal();
  assert.equal(t.ok, true, `missing=${t.missing} extra=${t.extra}`);
  assert.equal(PREDICATE_REGISTRY.length, 15);
  assert.deepEqual(t.missing, []);
  assert.deepEqual(t.extra, [], "an implementation with no registry entry is an unnamed predicate");
});

test("makePremiseReceipt REFUSES a predicate outside the registry", () => {
  assert.throws(
    () => receiptFor({}, "looksAboutRight"),
    /registry is CLOSED|open registry is not a registry/
  );
});

test("verifyPremise refuses an unregistered predicate even if the fixture would satisfy it", () => {
  const f = {
    vectors: [
      { subject: "A", t: 1 },
      { subject: "A", t: 2 },
    ],
  };
  const r = verifyPremise({ predicate_id: "vibes", fixture_digest: digestOf(f) }, store(f));
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].kind, "unknown_predicate");
});

test("makePremiseReceipt requires every binding field and a 64-hex fixture digest", () => {
  assert.throws(
    () =>
      makePremiseReceipt({
        pack_id: "",
        closure_digest: "c".repeat(64),
        target_function_id: "x",
        fixture_digest: "a".repeat(64),
        predicate_id: "contradicts",
      }),
    /requires pack_id/
  );
  assert.throws(
    () =>
      makePremiseReceipt({
        pack_id: "p",
        closure_digest: "c".repeat(64),
        target_function_id: "x",
        fixture_digest: "short",
        predicate_id: "contradicts",
      }),
    /binds BYTES/
  );
});

test("the receipt digest covers the predicate args — changing an arg changes the receipt", () => {
  const f = {
    vectors: [
      { subject: "A", t: 1 },
      { subject: "A", t: 2 },
    ],
  };
  const a = receiptFor(f, "contradicts", { field: "t" });
  const b = receiptFor(f, "contradicts", { field: "other" });
  assert.notEqual(a.receipt_digest, b.receipt_digest);
});

// ---------------------------------------------------------------------------------------------
// Every predicate is exercised in BOTH directions — a predicate that only ever returns true is
// not a predicate, it is a constant.
// ---------------------------------------------------------------------------------------------

const CASES = {
  contradicts: [
    {
      vectors: [
        { subject: "A", t: 1 },
        { subject: "A", t: 2 },
      ],
    },
    {
      vectors: [
        { subject: "A", t: 1 },
        { subject: "B", t: 2 },
      ],
    },
  ],
  violatesGrammar: [
    { schema: { required: ["a"] }, object: {} },
    { schema: { required: ["a"] }, object: { a: 1 } },
  ],
  exceedsCeiling: [
    { ceiling: 10, observed: 11 },
    { ceiling: 10, observed: 10 },
  ],
  replaysAcross: [
    { artifact_digest: "d", accepted_in: ["5a", "5b"] },
    { artifact_digest: "d", accepted_in: ["5a"] },
  ],
  omitsMember: [
    { universe: ["a", "b"], produced: ["a"] },
    { universe: ["a"], produced: ["a", "b"] },
  ],
  divergesAcrossRuntimes: [
    { results: { node: 1, python: 2 } },
    { results: { node: 1, python: 1 } },
  ],
  signatureValidWrongObject: [
    { signature_valid: true, signed_object_digest: "x", presented_object_digest: "y" },
    { signature_valid: true, signed_object_digest: "x", presented_object_digest: "x" },
  ],
  trustRootSubstituted: [
    { declared_root: "a", verifying_root: "b", verified: true },
    { declared_root: "a", verifying_root: "a", verified: true },
  ],
  firstFailureInverted: [
    {
      check_order: [
        { check_id: "c1", failed: true },
        { check_id: "c2", failed: true },
      ],
      reported_first: "c2",
    },
    {
      check_order: [
        { check_id: "c1", failed: true },
        { check_id: "c2", failed: true },
      ],
      reported_first: "c1",
    },
  ],
  executionFabricated: [
    { claimed_steps: ["s1", "s2"], execution_records: ["s1"] },
    { claimed_steps: ["s1"], execution_records: ["s1"] },
  ],
  quorumNotDistinct: [{ participants: ["p1", "p1", "p2"] }, { participants: ["p1", "p2"] }],
  appendOrderViolated: [
    { chain: [{ seq: 5 }], accepted: { seq: 4 } },
    { chain: [{ seq: 5 }], accepted: { seq: 6 } },
  ],
  authorityFromUntrusted: [
    { authority_source: "model_output", trusted_sources: ["operator"] },
    { authority_source: "operator", trusted_sources: ["operator"] },
  ],
  temporalWindowMismatch: [
    { window: { not_before: 10, not_after: 20 }, receipt_at: 25 },
    { window: { not_before: 10, not_after: 20 }, receipt_at: 15 },
  ],
  mutuallyExclusive: [
    {
      artifacts: [
        { verifies: true, claim: { subject: "A", state: "held" } },
        { verifies: true, claim: { subject: "A", state: "breached" } },
      ],
    },
    {
      artifacts: [
        { verifies: true, claim: { subject: "A", state: "held" } },
        { verifies: true, claim: { subject: "B", state: "breached" } },
      ],
    },
  ],
};

for (const predicate of PREDICATE_REGISTRY) {
  test(`${predicate} holds on its positive fixture and NOT on its negative one`, () => {
    const [yes, no] = CASES[predicate];
    assert.ok(yes && no, `${predicate} has no both-directions fixture in this file`);
    assert.equal(PREDICATES[predicate](yes).holds, true, `${predicate} must hold on the positive`);
    assert.equal(
      PREDICATES[predicate](no).holds,
      false,
      `${predicate} must NOT hold on the negative — a predicate that only ever returns true is a constant`
    );
    // and both directions carry a stated reason a reviewer can disagree with
    assert.ok(PREDICATES[predicate](yes).reason.length > 10);
    assert.ok(PREDICATES[predicate](no).reason.length > 10);
  });
}

test("divergesAcrossRuntimes REFUSES a single runtime rather than reporting agreement", () => {
  // One runtime cannot agree with itself in any interesting sense, and calling that 'no divergence'
  // would let a pack claim parity it never tested.
  assert.throws(() => PREDICATES.divergesAcrossRuntimes({ results: { node: 1 } }), /at least two/);
});
