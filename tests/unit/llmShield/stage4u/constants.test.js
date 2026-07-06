// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U constants tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMAS,
  DOMAINS,
  ATTACK_FAMILIES,
  VRTA_NON_CLAIMS,
  VRTA_KNOWN_LIMITATIONS,
  VRTA_RAILS,
  OUTCOME_CLASSES,
  FAMILY_COUNTS,
  CAMPAIGN_SEED,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

test("eight attack families in spec order", () => {
  assert.deepEqual(ATTACK_FAMILIES, [
    "ghost_hop",
    "structuring_budget",
    "scope_escalation",
    "crypto_signature",
    "structural_forgery",
    "fable_adaptive",
    "verifier_oracle",
    "differential",
  ]);
});
test("family counts sum to the declared 58", () => {
  assert.equal(
    Object.values(FAMILY_COUNTS).reduce((a, b) => a + b, 0),
    58,
  );
  assert.deepEqual(Object.keys(FAMILY_COUNTS), ATTACK_FAMILIES);
});
test("seven non-claims, five limitations, twelve rails", () => {
  assert.equal(VRTA_NON_CLAIMS.length, 7);
  assert.equal(VRTA_KNOWN_LIMITATIONS.length, 5);
  assert.equal(VRTA_RAILS.length, 12);
  assert.ok(VRTA_RAILS.includes("severity_of_any_confirmed_bypass_is_signed_into_known_limitations"));
});
test("outcome classes are frozen and exact (incl. lane_disabled)", () => {
  assert.deepEqual(OUTCOME_CLASSES, ["survived", "bypass", "model_refused", "lane_disabled"]);
  assert.throws(() => {
    OUTCOME_CLASSES.push("x");
  });
});
test("domains never collide", () => {
  assert.equal(new Set(Object.values(DOMAINS)).size, Object.values(DOMAINS).length);
  assert.equal(new Set(Object.values(SCHEMAS)).size, Object.values(SCHEMAS).length);
});
test("campaign seed is the spec value", () => {
  assert.equal(CAMPAIGN_SEED, "stage4u-vrta-seed-v1");
});
