// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 5 — the identity bank (spec §2.6).
//
// Three properties carry the stage:
//   Law 7 atomicity  — a failed attachment leaves the bank BYTE-identical, asserted byte-for-byte.
//   Law 4 delta      — attach may raise only within prior JOIN ceiling, and never lowers.
//   no pooling       — evidence for principal A never touches principal B's vector.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IDENTITY_BANK_TYPE,
  emptyBank,
  attachEvidence,
  bankCanonicalBytes,
  attachDelegationEdge,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityBank.mjs";
import {
  makeResolverProfile,
  RESOLVER_PROFILE_TYPE,
} from "../../../../tools/simurgh-attestation/stage5p/core/resolverProfile.mjs";
import {
  makeResolverEvidence,
  RESOLVER_EVIDENCE_TYPE,
} from "../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";
import { PRINCIPAL_TYPE } from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";
import {
  DELEGATION_EDGE_TYPE,
  LOGICAL_VALIDITY_TYPE,
} from "../../../../tools/simurgh-attestation/stage5p/core/delegationEdge.mjs";

const alice = {
  type: PRINCIPAL_TYPE,
  kind: "account",
  namespace_id: "simurgh.synthetic.oidc-subject.v1",
  subject_id: "a".repeat(64),
};
const acme = {
  type: PRINCIPAL_TYPE,
  kind: "organisation",
  namespace_id: "simurgh.synthetic.organisation.v1",
  subject_id: "b".repeat(64),
};
const FLOOR = {
  binding: "unbound",
  resolution: "unresolved",
  continuity: "ephemeral",
  role: "unproven",
};

const oidcProfile = makeResolverProfile({
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
  namespace_map: { sub: "simurgh.synthetic.oidc-subject.v1" },
});
// Continuity-only: this profile is deliberately incompetent on role — the S2.1 attack surface.
const registryProfile = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.registry.v1",
  trust_root_fpr: "2".repeat(64),
  permitted_claim_types: ["principal"],
  ceiling: {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "unproven",
  },
  namespace_map: { lei: "simurgh.synthetic.organisation.v1" },
});
const roleProfile = makeResolverProfile({
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.role_authority.v1",
  trust_root_fpr: "3".repeat(64),
  permitted_claim_types: ["principal"],
  ceiling: {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "ephemeral",
    role: "accountable_role_bound",
  },
  namespace_map: { role: "simurgh.synthetic.organisation.v1" },
});

const ev = (principal, profile, delta, digest = "c".repeat(64)) =>
  makeResolverEvidence({
    type: RESOLVER_EVIDENCE_TYPE,
    profile_id: profile.profile_id,
    claim: { principal },
    asserted_strength_delta: delta,
    evidence_digest: digest,
    submission_digest_binding: "d".repeat(64),
    signature: "ab12",
  });

test("an empty bank is well formed with explicit empty arrays", () => {
  const b = emptyBank();
  assert.equal(b.type, IDENTITY_BANK_TYPE);
  assert.deepEqual(b.principals, []);
  assert.deepEqual(b.delegation_edges, [], "empty arrays are explicit, never omitted");
});

test("a valid attachment banks the principal with verifier-derived strength", () => {
  const r = attachEvidence(emptyBank(), ev(alice, oidcProfile, oidcProfile.ceiling), oidcProfile);
  assert.equal(r.ok, true);
  assert.equal(r.bank.principals.length, 1);
  assert.deepEqual({ ...r.bank.principals[0].strength }, { ...oidcProfile.ceiling });
  assert.deepEqual(r.bank.principals[0].supporting_evidence_digests, ["c".repeat(64)]);
});

// ---- Law 4: the ceiling bounds the DELTA -----------------------------------------------------

test("S2.1 in miniature: a continuity resolver cannot raise role", () => {
  const wants = {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "accountable_role_bound",
  };
  const r = attachEvidence(emptyBank(), ev(acme, registryProfile, wants), registryProfile);
  assert.equal(r.ok, false, "asserting beyond the ceiling must not silently clamp");
  assert.match(r.reason, /ceiling/);
});

test("attaching NEVER lowers an axis another resolver already established", () => {
  // role_authority establishes role; then the continuity-only registry adds durability.
  const first = attachEvidence(
    emptyBank(),
    ev(acme, roleProfile, roleProfile.ceiling),
    roleProfile
  );
  assert.equal(first.ok, true);
  assert.equal(first.bank.principals[0].strength.role, "accountable_role_bound");

  const second = attachEvidence(
    first.bank,
    ev(acme, registryProfile, registryProfile.ceiling, "e".repeat(64)),
    registryProfile
  );
  assert.equal(second.ok, true);
  const s = second.bank.principals[0].strength;
  assert.equal(
    s.role,
    "accountable_role_bound",
    "a role-incompetent resolver must not erase a proven role"
  );
  assert.equal(s.continuity, "durable", "and it does add what it IS competent for");
});

// ---- Law 7: atomicity, byte-for-byte ---------------------------------------------------------

test("a failed attachment leaves the bank BYTE-IDENTICAL", () => {
  const seeded = attachEvidence(
    emptyBank(),
    ev(alice, oidcProfile, oidcProfile.ceiling),
    oidcProfile
  ).bank;
  const before = bankCanonicalBytes(seeded);
  const overreach = {
    binding: "unbound",
    resolution: "provider_asserted",
    continuity: "durable",
    role: "accountable_role_bound",
  };
  const failed = attachEvidence(seeded, ev(acme, registryProfile, overreach), registryProfile);
  // PREMISE: the attachment really did fail.
  assert.equal(failed.ok, false, "PREMISE FAILED: attachment unexpectedly succeeded");
  assert.deepEqual(
    bankCanonicalBytes(seeded),
    before,
    "no partial axis update, no digest harvested"
  );
});

// ---- no pooling ------------------------------------------------------------------------------

test("evidence for one principal never contributes to another's vector", () => {
  const b1 = attachEvidence(
    emptyBank(),
    ev(alice, oidcProfile, oidcProfile.ceiling),
    oidcProfile
  ).bank;
  const b2 = attachEvidence(
    b1,
    ev(acme, registryProfile, registryProfile.ceiling, "e".repeat(64)),
    registryProfile
  ).bank;
  const aliceEntry = b2.principals.find((p) => p.principal.subject_id === alice.subject_id);
  const acmeEntry = b2.principals.find((p) => p.principal.subject_id === acme.subject_id);
  assert.equal(
    aliceEntry.strength.continuity,
    "ephemeral",
    "acme's durability must not leak to alice"
  );
  assert.equal(acmeEntry.strength.binding, "unbound", "alice's binding must not leak to acme");
  assert.deepEqual(aliceEntry.supporting_evidence_digests, ["c".repeat(64)]);
  assert.deepEqual(acmeEntry.supporting_evidence_digests, ["e".repeat(64)]);
});

// ---- ordering and dedup ----------------------------------------------------------------------

test("insertion order does not affect canonical bytes", () => {
  const a = attachEvidence(
    emptyBank(),
    ev(alice, oidcProfile, oidcProfile.ceiling),
    oidcProfile
  ).bank;
  const ab = attachEvidence(
    a,
    ev(acme, registryProfile, registryProfile.ceiling, "e".repeat(64)),
    registryProfile
  ).bank;
  const b = attachEvidence(
    emptyBank(),
    ev(acme, registryProfile, registryProfile.ceiling, "e".repeat(64)),
    registryProfile
  ).bank;
  const ba = attachEvidence(b, ev(alice, oidcProfile, oidcProfile.ceiling), oidcProfile).bank;
  assert.deepEqual(bankCanonicalBytes(ab), bankCanonicalBytes(ba));
});

test("supporting evidence digests are sorted and unique", () => {
  let bank = emptyBank();
  for (const d of ["f".repeat(64), "0".repeat(64), "f".repeat(64)]) {
    const r = attachEvidence(bank, ev(alice, oidcProfile, oidcProfile.ceiling, d), oidcProfile);
    assert.equal(r.ok, true);
    bank = r.bank;
  }
  assert.deepEqual(bank.principals[0].supporting_evidence_digests, [
    "0".repeat(64),
    "f".repeat(64),
  ]);
});

test("a profile may not speak about a namespace it does not map", () => {
  const r = attachEvidence(emptyBank(), ev(acme, oidcProfile, oidcProfile.ceiling), oidcProfile);
  assert.equal(r.ok, false);
  assert.match(r.reason, /namespace/);
});

// ---- delegation edges are carried, and change no vector --------------------------------------

test("attaching a delegation edge alters NO principal strength vector", () => {
  const seeded = attachEvidence(
    emptyBank(),
    ev(alice, oidcProfile, oidcProfile.ceiling),
    oidcProfile
  ).bank;
  const strengthBefore = { ...seeded.principals[0].strength };
  const r = attachDelegationEdge(seeded, {
    type: DELEGATION_EDGE_TYPE,
    actor_principal: alice,
    represented_principal: acme,
    role_id: "simurgh.synthetic.submitter-role.v1",
    scope_id: "simurgh.synthetic.evidence-submission-scope.v1",
    validity: { type: LOGICAL_VALIDITY_TYPE, not_before_epoch: "7", not_after_epoch: "12" },
  });
  assert.equal(r.ok, true);
  assert.equal(r.bank.delegation_edges.length, 1);
  assert.deepEqual(
    { ...r.bank.principals[0].strength },
    strengthBefore,
    "A3: no axis transfers across an edge"
  );
  assert.equal(r.bank.principals.length, 1, "a delegation edge does not mint a principal entry");
});
