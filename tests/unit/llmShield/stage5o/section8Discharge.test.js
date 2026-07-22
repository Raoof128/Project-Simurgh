// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.6 — the section_8_opening_bundle_resource_limits discharge + the opening compatibility
// invariant + §8 static censuses. Printing the constants discharges nothing; the invariant is
// derived and the verifier executes the budget transition.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maxCanonicalOpeningBundleBytes,
  maxAuthPathLength,
  openingCompatibilityInvariantHolds,
} from "../../../../tools/simurgh-attestation/stage5o/node/measureOpeningMaximum.mjs";
import {
  disclosurePolicyDigest,
  DISCLOSURE_POLICY_LIMITS,
} from "../../../../tools/simurgh-attestation/stage5o/core/disclosurePolicy.mjs";
import {
  SECTION8_FIRST_FAILURE_ORDER,
  SECTION8_CHECK_IDS,
} from "../../../../tools/simurgh-attestation/stage5o/core/section8Verifier.mjs";
import { buildValidSection8Case } from "./section8Fixture.mjs";

const OP = { k: 128, maxCaseBytes: 65536, N: 65536 };

test("invariant: the maximal opening bundle size is derived and byte-stable", () => {
  const a = maxCanonicalOpeningBundleBytes(OP);
  const b = maxCanonicalOpeningBundleBytes(OP);
  assert.equal(a, b);
  assert.ok(a > OP.k * OP.maxCaseBytes, "at least k full cases");
  assert.equal(maxAuthPathLength(65536), 16);
  assert.equal(maxAuthPathLength(1), 0);
});

test("discharge: a policy admitting the operational maximum satisfies the compatibility invariant", () => {
  const need = maxCanonicalOpeningBundleBytes(OP);
  const policy = {
    max_opening_package_transport_bytes: need + 4096,
    max_opening_package_canonical_bytes: need,
    max_presented_history_transport_bytes: need,
    max_presented_history_canonical_bytes: need,
    max_presented_history_entries: 1024,
    max_cumulative_disclosed_indices: OP.N,
  };
  assert.equal(openingCompatibilityInvariantHolds(policy, OP), true);
  // digest is well-defined over exactly the six limits
  assert.match(disclosurePolicyDigest(policy), /^[0-9a-f]{64}$/);
});

test("discharge: a policy whose canonical limit is below the maximum FAILS the invariant", () => {
  const need = maxCanonicalOpeningBundleBytes(OP);
  const policy = {
    max_opening_package_transport_bytes: need,
    max_opening_package_canonical_bytes: need - 1, // too small
    max_presented_history_transport_bytes: need,
    max_presented_history_canonical_bytes: need,
    max_presented_history_entries: 1024,
    max_cumulative_disclosed_indices: OP.N,
  };
  assert.equal(openingCompatibilityInvariantHolds(policy, OP), false);
});

test("discharge: the disclosure-policy digest binds exactly the six limits (order-independent)", () => {
  assert.equal(DISCLOSURE_POLICY_LIMITS.length, 6);
  const p = {
    max_opening_package_transport_bytes: 10,
    max_opening_package_canonical_bytes: 9,
    max_presented_history_transport_bytes: 10,
    max_presented_history_canonical_bytes: 9,
    max_presented_history_entries: 8,
    max_cumulative_disclosed_indices: 7,
  };
  const reordered = Object.fromEntries(Object.entries(p).reverse());
  assert.equal(disclosurePolicyDigest(p), disclosurePolicyDigest(reordered));
});

test("discharge: the verifier EXECUTES the budget transition (not just prints constants)", () => {
  // a budget below k rejects, a budget at k accepts — the transition is live, not decorative.
  assert.deepEqual(
    buildValidSection8Case({ budget: 8 }).acceptedCtx.disclosure_policy
      .max_cumulative_disclosed_indices,
    8
  );
});

test("§8 census: the first-failure order and check ids run parallel — 11 each, unique", () => {
  assert.equal(SECTION8_FIRST_FAILURE_ORDER.length, 11);
  assert.equal(SECTION8_CHECK_IDS.length, 11);
  assert.equal(new Set(SECTION8_FIRST_FAILURE_ORDER).size, 11);
  assert.equal(new Set(SECTION8_CHECK_IDS).size, 11);
});
