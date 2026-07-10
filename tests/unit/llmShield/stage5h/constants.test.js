// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — constants: tier/consequence lattices, typed warrant, domains, policy.
import test from "node:test";
import assert from "node:assert/strict";
import {
  TIER,
  CONSEQUENCE,
  tierGte,
  consequenceGt,
  SUPPORT_QUALITY,
  MAX_CONSEQUENCE,
  warrant,
  DOMAIN,
  VSD_SCHEMAS,
  JUSTIFICATION_TYPES,
  DEFAULT_POLICY,
  VSD_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5h/constants.mjs";

test("tier lattice is ordinal restricted<controlled<public", () => {
  assert.deepEqual(TIER.order, ["restricted", "controlled", "public"]);
  assert.equal(TIER.index("restricted"), 0);
  assert.equal(TIER.index("public"), 2);
  assert.ok(tierGte("public", "controlled"));
  assert.ok(tierGte("controlled", "controlled"));
  assert.ok(!tierGte("restricted", "controlled"));
  assert.throws(() => tierGte("bogus", "public"));
});

test("consequence lattice is ordinal contextual<supporting<threshold_crossing", () => {
  assert.deepEqual(CONSEQUENCE.order, ["contextual", "supporting", "threshold_crossing"]);
  assert.ok(consequenceGt("threshold_crossing", "contextual"));
  assert.ok(consequenceGt("supporting", "contextual"));
  assert.ok(!consequenceGt("contextual", "contextual"));
  assert.throws(() => consequenceGt("bogus", "contextual"));
});

test("warrant is the typed pair, matching the spec table", () => {
  assert.deepEqual(warrant("restricted"), {
    max_consequence: "contextual",
    support_quality: "descriptive",
  });
  assert.deepEqual(warrant("controlled"), {
    max_consequence: "threshold_crossing",
    support_quality: "qualified",
  });
  assert.deepEqual(warrant("public"), {
    max_consequence: "threshold_crossing",
    support_quality: "full",
  });
  assert.throws(() => warrant("bogus"));
  assert.equal(SUPPORT_QUALITY.controlled, "qualified");
  assert.equal(MAX_CONSEQUENCE.public, "threshold_crossing");
});

test("DOMAIN separators are the six consumed domains, each newline-terminated", () => {
  const keys = [
    "claim_inventory",
    "claim",
    "review_receipt",
    "recompute_recipe",
    "disclosure_attestation",
    "inventory_census",
  ];
  assert.deepEqual(Object.keys(DOMAIN).sort(), [...keys].sort());
  for (const k of keys) {
    assert.equal(DOMAIN[k], `simurgh.vsd.${k}.v1\n`);
    assert.equal(VSD_SCHEMAS[k], `simurgh.vsd.${k}.v1`);
  }
});

test("DEFAULT_POLICY equals the structural warrant (honest no-op)", () => {
  assert.deepEqual(DEFAULT_POLICY.min_tier_for, {
    contextual: "restricted",
    supporting: "controlled",
    threshold_crossing: "controlled",
  });
});

test("justification types + reserved slots frozen", () => {
  assert.deepEqual(JUSTIFICATION_TYPES, [
    "safety_hazard",
    "third_party_confidential",
    "security_sensitive",
  ]);
  assert.ok(Object.isFrozen(VSD_RESERVED_SLOTS));
  assert.ok(VSD_RESERVED_SLOTS.includes("secure_review_host_independence_deferred"));
  assert.equal(VSD_RESERVED_SLOTS.length, 5);
});
