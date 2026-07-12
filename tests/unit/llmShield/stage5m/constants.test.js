// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — VTC-Quorum frozen constants (v2 envelope, member->anchor-type map, ecology classes, sockets).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENVELOPE_SCHEMA,
  PROFILE,
  QUORUM_RULE,
  REQUIRED_MEMBERS,
  MEMBER_TO_ANCHOR_TYPE,
  ECOLOGY_CLASSES,
  PINNED_INPUT_KEYS,
  MINTED_SOCKETS,
  RESERVED_ARTIFACT_SLOTS,
  ADEQUACY_FORBIDDEN_KEYS,
} from "../../../../tools/simurgh-attestation/stage5m/constants.mjs";

test("envelope / profile / quorum-rule frozen values", () => {
  assert.equal(ENVELOPE_SCHEMA, "vtc_quorum_confirmed.v2");
  assert.equal(PROFILE, "third_trust_ecology");
  assert.equal(QUORUM_RULE, "all_required");
});

test("required members are exactly the 3-set; OTS label maps to frozen bitcoin_ots (G-C)", () => {
  assert.deepEqual(REQUIRED_MEMBERS, [
    "rfc3161_tsa",
    "bitcoin_confirmed_publication",
    "transparency_log_inclusion",
  ]);
  assert.equal(MEMBER_TO_ANCHOR_TYPE.bitcoin_confirmed_publication, "bitcoin_ots");
  assert.equal(MEMBER_TO_ANCHOR_TYPE.rfc3161_tsa, "rfc3161_tsa");
  assert.equal(MEMBER_TO_ANCHOR_TYPE.transparency_log_inclusion, "transparency_log_seat");
});

test("ecology classes are three verifier-pinned constants", () => {
  assert.deepEqual([...ECOLOGY_CLASSES].sort(), ["bitcoin", "rekor", "rfc3161"]);
});

test("minted sockets I7 + I8 (strings, both non-debt); pinned-input keys present", () => {
  assert.deepEqual(MINTED_SOCKETS, [
    "keyless_submitter_identity_binding",
    "checkpoint_witness_cosigning",
  ]);
  for (const k of [
    "tsa_root_fpr",
    "tsa_verifier_pubkey_fpr",
    "bitcoin_min_confirmations",
    "rekor_log_pubkey_fpr",
    "expected_submitter_key_fpr",
    "vtcq_policy_digest",
    "accuracy_policy_s",
  ]) {
    assert.ok(PINNED_INPUT_KEYS.includes(k), `pinned input ${k}`);
  }
});

test("frozen collections are immutable and adequacy set re-exported", () => {
  assert.ok(Object.isFrozen(REQUIRED_MEMBERS));
  assert.ok(Object.isFrozen(MEMBER_TO_ANCHOR_TYPE));
  assert.ok(ADEQUACY_FORBIDDEN_KEYS.has("complete") && ADEQUACY_FORBIDDEN_KEYS.has("exhaustive"));
  assert.ok(Array.isArray(RESERVED_ARTIFACT_SLOTS));
});
