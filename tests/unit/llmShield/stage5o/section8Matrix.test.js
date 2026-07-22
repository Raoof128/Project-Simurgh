// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.5 — the opening-verifier first-failure matrix + the "No Unbudgeted Unzip" budget.
//
// Each row is a single-defect mutation of a valid opening case; the reason returned is the FIRST
// check to fail (prefix-satisfaction). The valid case runs the REAL §7 acceptance (production
// verifier + real Bitcoin chain) through the sealed adapter, then a real committed universe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  verifySection8Relation,
  evaluateSection8Safe,
  SECTION8_FIRST_FAILURE_ORDER,
} from "../../../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import { RAW_VERIFIER_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import { buildValidSection8Case } from "./section8Fixture.mjs";

const rawWith = (bundle) => canonicalJson(bundle);
const clone = (b) => JSON.parse(JSON.stringify(b));

test("S8.1 valid opening -> ACCEPT", () => {
  const c = buildValidSection8Case();
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, c.raw), { accept: true });
});

test("S8 oversize -> s8_opening_package_oversize (check 1)", () => {
  const c = buildValidSection8Case({
    policyOverride: {
      max_opening_package_transport_bytes: 32,
      max_opening_package_canonical_bytes: 32,
    },
  });
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, c.raw), {
    reject: "s8_opening_package_oversize",
  });
});

test("S8 noncanonical -> s8_noncanonical (check 2)", () => {
  const c = buildValidSection8Case();
  const noncanon = JSON.stringify(
    Object.fromEntries(Object.entries(clone(c.openingBundle)).reverse())
  );
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, noncanon), { reject: "s8_noncanonical" });
});

test("S8 canonical over the canonical ceiling -> s8_resource_limit (check 3)", () => {
  const c = buildValidSection8Case({
    policyOverride: { max_opening_package_canonical_bytes: 100 }, // < the real opening size
  });
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, c.raw), { reject: "s8_resource_limit" });
});

test("S8 too many history entries -> s8_resource_limit (check 3)", () => {
  const c = buildValidSection8Case({ policyOverride: { max_presented_history_entries: 1 } });
  const b = clone(c.openingBundle);
  b.presented_history = [
    { challenge_record_digest: "a".repeat(64), disclosed_indices: [] },
    { challenge_record_digest: "b".repeat(64), disclosed_indices: [] },
  ]; // 2 > 1
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_resource_limit",
  });
});

test("S8 missing bundle key -> s8_opening_shape (check 4)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  delete b.presented_history;
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_opening_shape",
  });
});

test("S8 uppercase salt token -> s8_bytes32_token_grammar (check 5)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.openings[0].salt = "A".repeat(64); // width 64, not lowercase hex
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_bytes32_token_grammar",
  });
});

test("S8 wrong challenge_record_digest -> s8_disclosure_policy_binding (check 6)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.challenge_record_digest = "b".repeat(64);
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_disclosure_policy_binding",
  });
});

test("S8 opened set != §7 selection -> s8_indices_mismatch (check 7)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.openings = b.openings.slice(0, -1); // drop one selected index
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_indices_mismatch",
  });
});

test("S8 tampered case (case-link breaks) -> s8_case_link_invalid (check 8)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.openings[0].case = { i: 999999 }; // different case -> different case_digest -> link mismatch
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_case_link_invalid",
  });
});

test("S8 tampered auth path -> s8_merkle_inclusion_invalid (check 9)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.openings[0].auth_path[0] = { sibling: "c".repeat(64), side: b.openings[0].auth_path[0].side };
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_merkle_inclusion_invalid",
  });
});

test("S8 re-audit of this challenge in history -> s8_presented_history_invalid (check 10)", () => {
  const c = buildValidSection8Case();
  const b = clone(c.openingBundle);
  b.presented_history = [
    { challenge_record_digest: c.acceptedCtx.challenge_record_digest, disclosed_indices: [] },
  ];
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_presented_history_invalid",
  });
});

test("S8 budget exceeded -> s8_budget_exhausted (check 11)", () => {
  const c = buildValidSection8Case({ budget: 7 }); // k = 8 > B = 7
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, c.raw), { reject: "s8_budget_exhausted" });
});

// ---- the budget law ("No Unbudgeted Unzip").

test("budget: reopening already-disclosed indices consumes no budget (idempotent)", () => {
  const c = buildValidSection8Case({ budget: 8 }); // exactly k
  const b = clone(c.openingBundle);
  // a prior DIFFERENT challenge that disclosed the SAME indices; the union is still k -> accept.
  b.presented_history = [
    { challenge_record_digest: "d".repeat(64), disclosed_indices: c.selected.map(String) },
  ];
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), { accept: true });
});

test("budget: prior history disclosing NEW indices consumes budget", () => {
  const c = buildValidSection8Case({ budget: 9 }); // k=8 current
  const b = clone(c.openingBundle);
  // two new indices not in the current selection push the union to 10 > 9 -> reject.
  const newOnes = [0, 1].filter((i) => !c.selected.includes(i)).map(String);
  b.presented_history = [{ challenge_record_digest: "e".repeat(64), disclosed_indices: newOnes }];
  assert.deepEqual(verifySection8Relation(c.acceptedCtx, rawWith(b)), {
    reject: "s8_budget_exhausted",
  });
});

// ---- coverage + safe wrapper + context gate.

test("matrix: every one of the eleven §8 reasons has a live witness", () => {
  const witnessed = new Set([
    "s8_opening_package_oversize",
    "s8_noncanonical",
    "s8_resource_limit",
    "s8_opening_shape",
    "s8_bytes32_token_grammar",
    "s8_disclosure_policy_binding",
    "s8_indices_mismatch",
    "s8_case_link_invalid",
    "s8_merkle_inclusion_invalid",
    "s8_presented_history_invalid",
    "s8_budget_exhausted",
  ]);
  for (const r of SECTION8_FIRST_FAILURE_ORDER) assert.ok(witnessed.has(r), `unwitnessed ${r}`);
  assert.equal(SECTION8_FIRST_FAILURE_ORDER.length, 11);
});

test("safe wrapper: an unaccepted context fails closed to raw 29, never a §8 reason", () => {
  const c = buildValidSection8Case();
  assert.throws(() => verifySection8Relation({ N: 256 }, c.raw), /unaccepted_context/);
  assert.deepEqual(evaluateSection8Safe({ N: 256 }, c.raw), {
    fail_closed: true,
    raw_code: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED,
  });
});

test("safe wrapper: an ordinary opening rejection stays symbolic", () => {
  const c = buildValidSection8Case({ budget: 7 });
  assert.deepEqual(evaluateSection8Safe(c.acceptedCtx, c.raw), { reject: "s8_budget_exhausted" });
});
