// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — stage-root constants: domains, profiles, rung lattice, reserved slots, re-exports.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOMAINS,
  PROFILES,
  RUNG,
  rungGte,
  RESERVED_ARTIFACT_SLOTS,
  MINTED_SOCKETS,
  VTCQ_RAW_CODES,
  VTCQ_PUBLIC_CHECK_ORDER,
  VTCQ_POLICY_CODES,
} from "../../../../tools/simurgh-attestation/stage5l/constants.mjs";

test("DOMAINS carry the 8 frozen simurgh.vtcq.* construction tags", () => {
  for (const k of [
    "commitmentSession",
    "verifiedAnchorSet",
    "startCapabilityRoot",
    "releaseCapability",
    "releaseSlot",
    "ceremonyId",
    "gateIdentity",
    "scittStatement",
  ]) {
    assert.match(DOMAINS[k], /^simurgh\.vtcq\.[a-z_]+\.v1$/, k);
  }
  assert.equal(DOMAINS.commitmentSession, "simurgh.vtcq.commitment_session.v1");
  assert.equal(DOMAINS.verifiedAnchorSet, "simurgh.vtcq.verified_anchor_set.v1");
});

test("PROFILES: core (publication optional) vs quorum (confirmed publication, threshold 2)", () => {
  assert.equal(PROFILES.vtc_core.min_bounded_authorities, 1);
  assert.equal(PROFILES.vtc_core.require_publication, false);
  assert.equal(PROFILES.vtc_quorum.min_bounded_authorities, 1);
  assert.equal(PROFILES.vtc_quorum.require_publication, true);
  assert.equal(PROFILES.vtc_quorum.threshold, 2);
  assert.equal(PROFILES.vtc_quorum.required_confirmed_publication, true);
});

test("RUNG lattice ordinal only; externally_anchored is the top", () => {
  assert.deepEqual(RUNG.order, ["distinct_key_only", "challenge_bound", "externally_anchored"]);
  assert.equal(rungGte("externally_anchored", "challenge_bound"), true);
  assert.equal(rungGte("challenge_bound", "externally_anchored"), false);
  assert.throws(() => RUNG.index("bogus"));
});

test("RESERVED_ARTIFACT_SLOTS = capstone + 3 minted debts; MINTED_SOCKETS names them", () => {
  assert.deepEqual(RESERVED_ARTIFACT_SLOTS, [
    "campaign_composition_root",
    "minimum_elapsed_review_binding",
    "third_trust_ecology",
    "hiding_scope_commitment",
  ]);
  assert.deepEqual(MINTED_SOCKETS, [
    "minimum_elapsed_review_binding",
    "third_trust_ecology",
    "hiding_scope_commitment",
  ]);
});

test("re-exports the global VTCQ code arrays", () => {
  assert.equal(VTCQ_RAW_CODES.VTCQ_SCHEMA_INVALID, 364);
  assert.equal(VTCQ_PUBLIC_CHECK_ORDER[0], 364);
  assert.deepEqual(VTCQ_POLICY_CODES, [382]);
});
