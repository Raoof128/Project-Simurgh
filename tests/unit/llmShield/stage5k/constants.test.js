// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — constants (domains, Merkle profile, G13 belt, anchor enums, rung lattice, policy).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODES,
  DOMAINS,
  MERKLE,
  ADEQUACY_FORBIDDEN_KEYS,
  ANCHOR_STATE,
  VUC_RESERVED_ARTIFACT_SLOTS,
  VUC_MINTED_SOCKETS,
  RUNG,
  rungGte,
  POLICY_PROFILES,
} from "../../../../tools/simurgh-attestation/stage5k/constants.mjs";

test("codes re-export resolves from the stage root", () => {
  assert.equal(CODES.VUC_SCHEMA_INVALID, 348);
  assert.equal(CODES.INTERNAL_OR_ENV_UNAVAILABLE_VUC, 363);
  assert.equal(CODES.OK, 0);
});

test("domain-separation tags are the frozen simurgh.vuc.* set", () => {
  assert.equal(DOMAINS.leaf, "simurgh.vuc.leaf.v1");
  assert.equal(DOMAINS.node, "simurgh.vuc.node.v1");
  assert.equal(DOMAINS.section_subject, "simurgh.vuc.section_subject.v1");
  assert.equal(DOMAINS.commitment, "simurgh.vuc.commitment.v1");
  assert.equal(MERKLE.profile, "simurgh.vuc.merkle_set.v1");
  assert.equal(MERKLE.hash, "sha-256");
});

test("G13 adequacy belt screens the forbidden vocabulary", () => {
  for (const k of ["complete", "exhaustive", "all_risks_covered", "universe_adequate"])
    assert.ok(ADEQUACY_FORBIDDEN_KEYS.has(k), k);
  assert.equal(ADEQUACY_FORBIDDEN_KEYS.has("universe_root"), false);
});

test("two-axis anchor enums", () => {
  assert.ok(ANCHOR_STATE.ordering.includes("verified_immediate"));
  assert.ok(ANCHOR_STATE.ordering.includes("pending_unverified"));
  assert.ok(ANCHOR_STATE.finality.includes("confirmed"));
});

test("rung lattice is ordinal", () => {
  assert.ok(rungGte("challenge_bound", "distinct_key_only"));
  assert.ok(rungGte("externally_anchored", "challenge_bound"));
  assert.equal(rungGte("distinct_key_only", "externally_anchored"), false);
  assert.throws(() => RUNG.index("nonsense"));
});

test("reserved slots + minted sockets + policy profiles", () => {
  assert.deepEqual(VUC_RESERVED_ARTIFACT_SLOTS, [
    "review_window_binding",
    "campaign_composition_root",
  ]);
  assert.ok(VUC_MINTED_SOCKETS.includes("universe_adequacy_deferred"));
  assert.equal(POLICY_PROFILES.release.require_dual_equality, true);
  assert.equal(POLICY_PROFILES.release.min_leaves, 2);
  assert.equal(POLICY_PROFILES.test.min_leaves, 1);
});
