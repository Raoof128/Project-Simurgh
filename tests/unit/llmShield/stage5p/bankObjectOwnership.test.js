// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — bank object ownership (post-validation integrity).
//
// The concern this file locks down: atomicity at INSERTION time is worthless if a caller can mutate
// a retained reference afterwards. The attachment would validate, and then the bank's bytes would
// quietly change underneath it.
//
// The implementation already satisfies "deep-clone into bank-owned canonical objects": makePrincipal
// constructs a FRESH frozen object from validated primitives rather than retaining its argument, and
// every nested member (principal, strength, validity, digest array) is likewise rebuilt and frozen.
// These tests exist so that ownership is ENFORCED rather than incidental — a refactor that starts
// retaining caller references turns them red.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyBank,
  attachEvidence,
  attachDelegationEdge,
  bankCanonicalBytes,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityBank.mjs";
import {
  delegationEdgeId,
  DELEGATION_EDGE_TYPE,
  LOGICAL_VALIDITY_TYPE,
} from "../../../../tools/simurgh-attestation/stage5p/core/delegationEdge.mjs";
import { PRINCIPAL_TYPE } from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";
import { RESOLVER_EVIDENCE_TYPE } from "../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";
import {
  makeResolverProfile,
  RESOLVER_PROFILE_TYPE,
} from "../../../../tools/simurgh-attestation/stage5p/core/resolverProfile.mjs";

const NS = "simurgh.synthetic.subject.v1";
const profile = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.oidc.v1",
  trust_root_fpr: "1".repeat(64),
  permitted_claim_types: ["principal"],
  ceiling: {
    binding: "cryptographically_bound",
    resolution: "provider_asserted",
    continuity: "ephemeral",
    role: "unproven",
  },
  namespace_map: { subject: NS },
});

// Deliberately CALLER-OWNED and mutable — the whole point of these tests.
const mutableActor = () => ({
  type: PRINCIPAL_TYPE,
  kind: "person",
  namespace_id: NS,
  subject_id: "a".repeat(64),
});
const mutableOrg = () => ({
  type: PRINCIPAL_TYPE,
  kind: "organisation",
  namespace_id: NS,
  subject_id: "b".repeat(64),
});

const seed = (principal, digest = "c".repeat(64)) =>
  attachEvidence(
    emptyBank(),
    {
      type: RESOLVER_EVIDENCE_TYPE,
      profile_id: profile.profile_id,
      claim: { principal },
      asserted_strength_delta: profile.ceiling,
      evidence_digest: digest,
      submission_digest_binding: "d".repeat(64),
      signature: "ab12",
    },
    profile
  );

const edgeOver = (actor, org) => ({
  type: DELEGATION_EDGE_TYPE,
  actor_principal: actor,
  represented_principal: org,
  role_id: "simurgh.synthetic.submitter-role.v1",
  scope_id: "simurgh.synthetic.evidence-submission-scope.v1",
  validity: { type: LOGICAL_VALIDITY_TYPE, not_before_epoch: "7", not_after_epoch: "12" },
});

test("mutating the caller-owned ACTOR after attachment cannot alter bank bytes or the edge id", () => {
  const actor = mutableActor();
  const org = mutableOrg();
  const bank = attachDelegationEdge(seed(actor).bank, edgeOver(actor, org)).bank;
  const bytesBefore = bankCanonicalBytes(bank);
  const idBefore = delegationEdgeId(bank.delegation_edges[0]);

  actor.subject_id = "9".repeat(64);
  actor.kind = "service";

  // PREMISE: the caller's object really did change.
  assert.equal(actor.subject_id, "9".repeat(64), "PREMISE FAILED: caller object not mutated");
  assert.deepEqual(bankCanonicalBytes(bank), bytesBefore);
  assert.equal(delegationEdgeId(bank.delegation_edges[0]), idBefore);
  assert.equal(bank.delegation_edges[0].actor_principal.subject_id, "a".repeat(64));
});

test("mutating the caller-owned REPRESENTED principal cannot alter bank bytes", () => {
  const actor = mutableActor();
  const org = mutableOrg();
  const bank = attachDelegationEdge(seed(actor).bank, edgeOver(actor, org)).bank;
  const bytesBefore = bankCanonicalBytes(bank);

  org.subject_id = "8".repeat(64);

  assert.equal(org.subject_id, "8".repeat(64), "PREMISE FAILED: caller object not mutated");
  assert.deepEqual(bankCanonicalBytes(bank), bytesBefore);
  assert.equal(bank.delegation_edges[0].represented_principal.subject_id, "b".repeat(64));
});

test("nested arrays cannot be mutated through a retained reference — the write THROWS", () => {
  const bank = seed(mutableActor()).bank;
  const bytesBefore = bankCanonicalBytes(bank);
  assert.throws(
    () => bank.principals[0].supporting_evidence_digests.push("f".repeat(64)),
    TypeError
  );
  assert.throws(() => bank.principals.push({}), TypeError);
  assert.throws(() => bank.delegation_edges.push({}), TypeError);
  assert.deepEqual(bankCanonicalBytes(bank), bytesBefore);
});

test("banked leaf objects reject writes — principal, strength and validity are all frozen", () => {
  const actor = mutableActor();
  const bank = attachDelegationEdge(seed(actor).bank, edgeOver(actor, mutableOrg())).bank;
  const entry = bank.principals[0];
  assert.throws(() => (entry.principal.subject_id = "7".repeat(64)), TypeError);
  assert.throws(() => (entry.strength.role = "accountable_role_bound"), TypeError);
  assert.throws(() => (bank.delegation_edges[0].validity.not_after_epoch = "99"), TypeError);
});

test("OWNERSHIP INVARIANT: no banked object is reference-identical to a caller-supplied one", () => {
  const actor = mutableActor();
  const org = mutableOrg();
  const bank = attachDelegationEdge(seed(actor).bank, edgeOver(actor, org)).bank;
  assert.notEqual(
    bank.principals[0].principal,
    actor,
    "bank retained the caller's principal object"
  );
  assert.notEqual(
    bank.delegation_edges[0].actor_principal,
    actor,
    "edge retained the caller's actor"
  );
  assert.notEqual(
    bank.delegation_edges[0].represented_principal,
    org,
    "edge retained the caller's org"
  );
});

test("DEEP-FREEZE INVARIANT: every reachable object in the bank is frozen", () => {
  const actor = mutableActor();
  const bank = attachDelegationEdge(seed(actor).bank, edgeOver(actor, mutableOrg())).bank;
  const unfrozen = [];
  const walk = (node, path) => {
    if (node === null || typeof node !== "object") return;
    if (!Object.isFrozen(node)) unfrozen.push(path);
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
  };
  walk(bank, "bank");
  assert.deepEqual(unfrozen, [], `unfrozen reachable objects: ${unfrozen.join(", ")}`);
});
