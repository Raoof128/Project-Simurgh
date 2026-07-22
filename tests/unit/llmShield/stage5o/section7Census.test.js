// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.5 / §7.3.7 — static completeness and authority-mirror censuses.
//
// Runtime code cannot prove its own coverage, so these build-time censuses carry the guarantee: the
// five roots are exactly consumed, the first-failure order matches its normative owner, the mirror
// constants equal the descriptor authorities, and the verifier's domains/limits come from one home.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_IDS,
  PROFILE_IDS,
  MAX_CHALLENGE_PACKAGE_TRANSPORT_BYTES,
} from "../../../../tools/simurgh-attestation/stage5o/core/constants.mjs";
import {
  PROFILE_DESCRIPTORS,
  SCHEMA_DESCRIPTORS,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7AuthorityDescriptors.mjs";
import { CHALLENGE_RECORD_KEYS } from "../../../../tools/simurgh-attestation/stage5o/core/challengeArtifactShape.mjs";
import {
  SECTION7_FIRST_FAILURE_ORDER,
  SECTION7_CHECK1_ENFORCED_LIMITS,
  SECTION7_CHECK_IDS,
  SECTION7_CHECK_CATALOG,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs";
import { generateMaxima } from "../../../../tools/simurgh-attestation/stage5o/node/measureChallengeMaxima.mjs";
import { generateAuthorityRegistry } from "../../../../tools/simurgh-attestation/stage5o/node/measureStage5oAuthorityRegistry.mjs";

const PAIR22 = PROFILE_DESCRIPTORS.challenge_protocol_profile;
const ruleOf = (id) => PAIR22.rules.find((r) => r.rule_id === id);

test("five-root census: the record's root fields are exactly the five frozen roots (once each)", () => {
  const roots = ruleOf("five_root_completeness").roots;
  assert.equal(roots.length, 5);
  const expectedRootFields = roots.map((r) => `${r}_digest`).sort();
  // the record's *_digest fields that are ROOTS = all _digest fields minus schema/profile identity.
  const identity = new Set(["schema_digest", "challenge_protocol_profile_digest"]);
  const recordRootFields = CHALLENGE_RECORD_KEYS.filter(
    (k) => k.endsWith("_digest") && !identity.has(k)
  ).sort();
  assert.deepEqual(
    recordRootFields,
    expectedRootFields,
    "record roots must equal the five frozen roots"
  );
});

test("first-failure census: the verifier order is the pair-22 order — eleven unique reasons", () => {
  const owner = ruleOf("first_failure_order").order;
  assert.deepEqual([...SECTION7_FIRST_FAILURE_ORDER], [...owner]);
  assert.equal(SECTION7_FIRST_FAILURE_ORDER.length, 11);
  assert.equal(new Set(SECTION7_FIRST_FAILURE_ORDER).size, 11, "reasons are unique");
});

test("check-id census: pair-22 check ids run parallel to reasons — 11 each, unique, 1:1 catalog", () => {
  const ids = ruleOf("check_identifiers").ids;
  assert.equal(ids.length, 11);
  assert.equal(new Set(ids).size, 11, "check ids are unique");
  assert.deepEqual([...SECTION7_CHECK_IDS], [...ids]);
  assert.equal(SECTION7_CHECK_CATALOG.length, 11);
  for (let i = 0; i < 11; i++) {
    assert.equal(SECTION7_CHECK_CATALOG[i].ordinal, i + 1, "each id -> exactly one ordinal");
    assert.equal(SECTION7_CHECK_CATALOG[i].check_id, ids[i]);
    assert.equal(SECTION7_CHECK_CATALOG[i].reason, SECTION7_FIRST_FAILURE_ORDER[i]);
  }
  assert.equal(
    new Set(SECTION7_CHECK_CATALOG.map((c) => c.reason)).size,
    11,
    "each id -> exactly one reason"
  );
});

test("mirror census: SCHEMA_IDS/PROFILE_IDS equal the descriptor authorities", () => {
  assert.equal(SCHEMA_IDS.beacon_contract, SCHEMA_DESCRIPTORS.beacon_contract.schema_id);
  assert.equal(SCHEMA_IDS.beacon_suffix, SCHEMA_DESCRIPTORS.beacon_suffix.schema_id);
  assert.equal(
    SCHEMA_IDS.ordered_selected_indices,
    SCHEMA_DESCRIPTORS.ordered_selected_indices.schema_id
  );
  assert.equal(SCHEMA_IDS.challenge_record, SCHEMA_DESCRIPTORS.challenge_record.schema_id);
  assert.equal(PROFILE_IDS.beacon_contract, PROFILE_DESCRIPTORS.beacon_contract_profile.profile_id);
  assert.equal(PROFILE_IDS.beacon_suffix, PROFILE_DESCRIPTORS.beacon_suffix_profile.profile_id);
  assert.equal(
    PROFILE_IDS.ordered_selected_indices,
    PROFILE_DESCRIPTORS.ordered_selected_indices_profile.profile_id
  );
  assert.equal(
    PROFILE_IDS.challenge_protocol,
    PROFILE_DESCRIPTORS.challenge_protocol_profile.profile_id
  );
});

test("mirror census: each schema's self-declared schema_id const_value equals SCHEMA_IDS", () => {
  for (const [key, id] of Object.entries(SCHEMA_IDS)) {
    const d = SCHEMA_DESCRIPTORS[key];
    assert.equal(d.fields.schema_id.const_value, id, `${key}.schema_id const_value`);
  }
});

test("check-1 census: enforced byte limits equal the pair-23 *_bytes entries exactly", () => {
  const pair23 = PROFILE_DESCRIPTORS.challenge_resource_limits_profile;
  const byteRules = pair23.rules
    .filter((r) => r.rule_id.endsWith("_bytes"))
    .map((r) => r.rule_id)
    .sort();
  assert.deepEqual(
    [...SECTION7_CHECK1_ENFORCED_LIMITS].sort(),
    byteRules,
    "no implementation-only limit, no descriptor byte-limit left unenforced"
  );
});

test("check-1 census: the transport ceiling is >= the canonical package maximum", () => {
  assert.ok(
    MAX_CHALLENGE_PACKAGE_TRANSPORT_BYTES >= generateMaxima().MAX_CHALLENGE_PACKAGE_BYTES_V1,
    "transport must not be below canonical"
  );
});

test("limits census: the verifier's ceilings come from one generator (pair 23 mirror)", () => {
  const fromRegistry = generateAuthorityRegistry().maxima;
  const direct = generateMaxima();
  assert.deepEqual(
    { ...fromRegistry },
    { ...direct },
    "one maxima source feeds pair 23 and check 1"
  );
});

test("runtime-input census: pair 12 runtime inputs are typed accepted-context fields", () => {
  const subject = PROFILE_DESCRIPTORS.challenge_subject_profile;
  assert.ok(Array.isArray(subject.runtime_inputs) && subject.runtime_inputs.length > 0);
  for (const ri of subject.runtime_inputs) {
    assert.equal(typeof ri.field, "string");
    assert.equal(ri.source, "section6_accepted_context");
    assert.equal(ri.type, "digest_token");
  }
});

test("domain census: pair 22 owns the three scalar domains the verifier consumes", () => {
  assert.equal(ruleOf("challenge_seed").seed_domain, "simurgh.vsc.challenge_seed_digest_domain.v1");
  assert.equal(ruleOf("challenge_seed").draw_domain, "simurgh.vsc.challenge_index_draw.v1");
  assert.equal(
    ruleOf("checkpoint_instance_digest").domain,
    "simurgh.vsc.verified_closure_bitcoin_checkpoint_digest_domain.v1"
  );
  // the salt is pair 22's OWN digest — a symbolic self-reference, never a graph edge.
  assert.equal(ruleOf("challenge_seed").salt.source, "self_profile_digest");
});
