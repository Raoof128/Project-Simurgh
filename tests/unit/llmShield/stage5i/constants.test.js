import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOMAINS,
  RUNG,
  rungGte,
  POLICY_PROFILES,
  REDACTION_ENUM,
  ADEQUACY_FORBIDDEN_KEYS,
  VPC_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5i/constants.mjs";

test("DOMAINS: five domain separators, frozen", () => {
  assert.equal(DOMAINS.partition, "simurgh.vpc.partition.v1");
  assert.equal(DOMAINS.grant, "simurgh.vpc.grant.v1");
  assert.equal(DOMAINS.receipt, "simurgh.vpc.receipt.v1");
  assert.equal(DOMAINS.affiliation, "simurgh.vpc.affiliation.v1");
  assert.equal(DOMAINS.attestation, "simurgh.vpc.attestation.v1");
  assert.equal(DOMAINS.policy, "simurgh.vpc.policy.v1"); // B7 policy pin
  assert.throws(() => {
    DOMAINS.partition = "x";
  });
});

test("RUNG: monotone ordinal lattice, throws on unknown", () => {
  assert.equal(RUNG.index("distinct_key_only"), 0);
  assert.equal(RUNG.index("challenge_bound"), 1);
  assert.equal(RUNG.index("externally_anchored"), 2);
  assert.ok(rungGte("externally_anchored", "challenge_bound"));
  assert.ok(rungGte("challenge_bound", "challenge_bound"));
  assert.ok(!rungGte("distinct_key_only", "challenge_bound"));
  assert.throws(() => RUNG.index("below_floor"));
});

test("POLICY_PROFILES.release: exact frozen integer fields (S5)", () => {
  const r = POLICY_PROFILES.release;
  assert.equal(r.profile_id, "vpc-release-challenge-bound-v1");
  assert.equal(r.required_reviewer_separation, "challenge_bound");
  assert.equal(r.required_host_separation, "challenge_bound");
  assert.equal(r.min_reviewers, 2);
  assert.equal(r.min_distinct_hosts, 2);
  assert.equal(r.require_nontrivial_partition, true);
  assert.equal(r.require_distinct_anchor_lineage, true);
});

test("POLICY_PROFILES.test: rung-2 support fixture, disjoint", () => {
  assert.equal(POLICY_PROFILES.test.profile_id, "vpc-test-externally-anchored-v1");
  assert.equal(POLICY_PROFILES.test.required_reviewer_separation, "externally_anchored");
});

test("REDACTION_ENUM + ADEQUACY_FORBIDDEN_KEYS frozen", () => {
  assert.deepEqual([...REDACTION_ENUM].sort(), ["commercial_proprietary", "misuse_risk"]);
  assert.ok(ADEQUACY_FORBIDDEN_KEYS.has("adequate"));
  assert.ok(ADEQUACY_FORBIDDEN_KEYS.has("review_quality"));
  assert.ok(ADEQUACY_FORBIDDEN_KEYS.has("certified_safe"));
  assert.ok(!ADEQUACY_FORBIDDEN_KEYS.has("coverage_gap")); // legit field must not collide
});

test("VPC_RESERVED_SLOTS: mints 2, ledger-flat", () => {
  assert.ok(VPC_RESERVED_SLOTS.includes("reviewer_assessment_contest_deferred"));
  assert.ok(VPC_RESERVED_SLOTS.includes("uncommitted_section_universe_deferred"));
});
