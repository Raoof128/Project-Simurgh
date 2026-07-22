// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.8 — the S9.* first-failure matrix.
//
// Each row carries ONE defect and must first-fail at ITS check, which means every earlier check
// SUCCEEDED on that row (prefix satisfaction). A row that fails early for an unintended reason is a
// fixture that tests an easier rule than it claims to.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifySection9Relation,
  evaluateSection9Safe,
  SECTION9_FIRST_FAILURE_ORDER,
  SECTION9_CHECK_IDS,
} from "../../../../tools/simurgh-attestation/stage5o/core/section9Verifier.mjs";
import { makeSection9Fixture, authorityWith, canonicalJson } from "./section9Fixture.mjs";
import { RAW_VERIFIER_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";

const witnessed = new Set();
function expectReject(authority, raw, reason, check) {
  const v = verifySection9Relation(authority, raw);
  assert.equal(v.accept, false, `expected reject for ${reason}`);
  assert.equal(v.reason, reason, `wrong reason (got ${v.reason})`);
  assert.equal(v.check, check, `${reason} must first-fail at check ${check}, got ${v.check}`);
  witnessed.add(reason);
}

test("S9.0 the valid case ACCEPTS (the matrix means nothing without it)", () => {
  const f = makeSection9Fixture();
  const v = verifySection9Relation(f.authority, f.raw);
  assert.equal(v.accept, true, JSON.stringify(v));
});

test("S9.1 transport oversize -> s9_policy_package_transport_oversize (check 1)", () => {
  const f = makeSection9Fixture({
    policyOverride: {
      max_probability_package_transport_bytes: 8,
      max_probability_package_canonical_bytes: 8,
    },
  });
  expectReject(f.authority, f.raw, "s9_policy_package_transport_oversize", 1);
});

test("S9.2 non-canonical bytes -> s9_noncanonical (check 2)", () => {
  const f = makeSection9Fixture();
  expectReject(f.authority, f.raw + " ", "s9_noncanonical", 2);
});

test("S9.3 canonical oversize -> s9_policy_package_canonical_oversize (check 3)", () => {
  // transport ceiling generous, canonical ceiling tight: only check 3 can catch it.
  const f = makeSection9Fixture({
    policyOverride: {
      max_probability_package_transport_bytes: 65536,
      max_probability_package_canonical_bytes: 16,
    },
  });
  expectReject(f.authority, f.raw, "s9_policy_package_canonical_oversize", 3);
});

test("S9.4 unknown key -> s9_probability_claim_shape (check 4)", () => {
  const f = makeSection9Fixture();
  const raw = canonicalJson({ ...f.claim, unexpected: "1" });
  expectReject(f.authority, raw, "s9_probability_claim_shape", 4);
});

test("S9.5 non-canonical decimal -> s9_rational_grammar (check 5)", () => {
  const f = makeSection9Fixture();
  const claim = { ...f.claim, detection_probability: { numerator: "01", denominator: "2" } };
  expectReject(f.authority, canonicalJson(claim), "s9_rational_grammar", 5);
});

test("S9.6 zero denominator -> s9_denominator_not_positive (check 6)", () => {
  const f = makeSection9Fixture();
  // "0" is lexically valid, so check 5 passes and check 6 owns the rejection.
  const claim = { ...f.claim, detection_probability: { numerator: "1", denominator: "0" } };
  expectReject(f.authority, canonicalJson(claim), "s9_denominator_not_positive", 6);
});

test("S9.7 not lowest terms -> s9_rational_not_lowest_terms (check 7)", () => {
  const f = makeSection9Fixture();
  const claim = { ...f.claim, detection_probability: { numerator: "2", denominator: "4" } };
  expectReject(f.authority, canonicalJson(claim), "s9_rational_not_lowest_terms", 7);
});

test("S9.8 wrong challenge binding -> s9_policy_binding_mismatch (check 8)", () => {
  const f = makeSection9Fixture();
  const claim = { ...f.claim, challenge_record_digest: "a".repeat(64) };
  expectReject(f.authority, canonicalJson(claim), "s9_policy_binding_mismatch", 8);
});

test("S9.9 J* > N -> s9_parameter_domain_violation (check 9)", () => {
  const f = makeSection9Fixture({
    N: 256,
    policyOverride: { target_defect_count: "99999" },
  });
  expectReject(f.authority, f.raw, "s9_parameter_domain_violation", 9);
});

test("S9.10 term bound exceeded -> s9_evaluation_bound_exceeded (check 10)", () => {
  const f = makeSection9Fixture();
  // A valid claim judged under a tightened, self-consistent policy: only the bound can fire here.
  const tight = authorityWith(f.section7AcceptedContext, {
    max_probability_evaluation_terms: 1,
  });
  expectReject(tight, f.raw, "s9_evaluation_bound_exceeded", 10);
});

test("S9.11 claim_type disagrees with the precommitted policy -> s9_claim_type_mismatch (check 11)", () => {
  const f = makeSection9Fixture();
  const claim = { ...f.claim, claim_type: "at_least" };
  expectReject(f.authority, canonicalJson(claim), "s9_claim_type_mismatch", 11);
});

test("S9.12 active pair ratio omitted -> s9_pair_ratio_activation_mismatch (check 12)", () => {
  const f = makeSection9Fixture({ N: 256, k: 8 });
  assert.equal(f.active, true, "N>=2 and k>=2, so the ratio is active");
  const claim = { ...f.claim };
  delete claim.pair_ratio;
  expectReject(f.authority, canonicalJson(claim), "s9_pair_ratio_activation_mismatch", 12);
});

test("S9.13 presented detection probability != computed -> s9_detection_claim_value_mismatch (13)", () => {
  const f = makeSection9Fixture();
  // The label says 9/10 while the computation says otherwise: the floor alone would not catch this.
  const claim = { ...f.claim, detection_probability: { numerator: "9", denominator: "10" } };
  expectReject(f.authority, canonicalJson(claim), "s9_detection_claim_value_mismatch", 13);
});

test("S9.14 presented pair ratio != computed -> s9_pair_ratio_value_mismatch (check 14)", () => {
  const f = makeSection9Fixture();
  const claim = { ...f.claim, pair_ratio: { numerator: "1", denominator: "3" } };
  expectReject(f.authority, canonicalJson(claim), "s9_pair_ratio_value_mismatch", 14);
});

test("S9.15 computed P_detect < p_min -> s9_detection_floor_unmet (check 15) — the T3.5 rejection", () => {
  const f = makeSection9Fixture({
    policyOverride: { minimum_detection_bound: { numerator: "99", denominator: "100" } },
  });
  expectReject(f.authority, f.raw, "s9_detection_floor_unmet", 15);
});

test("§9.6 an at_least claim presents p_min itself, and passes only when computed >= p_min", () => {
  const ok = makeSection9Fixture({
    policyOverride: {
      claim_type: "at_least",
      minimum_detection_bound: { numerator: "1", denominator: "10" },
    },
  });
  assert.equal(verifySection9Relation(ok.authority, ok.raw).accept, true);
  // an at_least claim quoting something OTHER than p_min is a value mismatch, not a free choice
  const wrong = canonicalJson({
    ...ok.claim,
    detection_probability: { numerator: "1", denominator: "20" },
  });
  expectReject(ok.authority, wrong, "s9_detection_claim_value_mismatch", 13);
});

test("§9.3 an inactive pair ratio must be ABSENT, and k<2 is NOT a domain violation", () => {
  // At k=1 the exact P_detect is 5/256, so p_min must be below it or this row would silently be
  // testing the floor instead of activation.
  const f = makeSection9Fixture({
    N: 256,
    k: 1,
    policyOverride: { minimum_detection_bound: { numerator: "1", denominator: "100" } },
  });
  assert.equal(f.active, false, "k < 2 makes the ratio inactive");
  assert.equal(verifySection9Relation(f.authority, f.raw).accept, true, "k=1 still accepts");
  const claim = { ...f.claim, pair_ratio: { numerator: "1", denominator: "2" } };
  expectReject(f.authority, canonicalJson(claim), "s9_pair_ratio_activation_mismatch", 12);
});

test("matrix: every one of the fifteen §9 reasons has a live witness", () => {
  assert.deepEqual(
    [...witnessed].sort(),
    [...SECTION9_FIRST_FAILURE_ORDER].sort(),
    "some ruled reason has no fixture"
  );
  assert.equal(SECTION9_FIRST_FAILURE_ORDER.length, SECTION9_CHECK_IDS.length);
});

test("safe wrapper: an unbranded context fails closed to raw 29, never to a §9 reason", () => {
  const v = evaluateSection9Safe({ N: 256, k: 8 }, "{}");
  assert.equal(v.accept, false);
  assert.equal(v.raw, RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED);
  assert.equal(v.reason, undefined);
});

test("safe wrapper: an ordinary rejection stays symbolic", () => {
  const f = makeSection9Fixture();
  const v = evaluateSection9Safe(f.authority, f.raw + " ");
  assert.equal(v.accept, false);
  assert.equal(v.reason, "s9_noncanonical");
  assert.equal(v.raw, undefined);
});
