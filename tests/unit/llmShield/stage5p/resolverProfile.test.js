// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 2 — the resolver profile (spec §2.10).
//
// The profile is the carrier of Law 4's VECTOR ceiling. The load-bearing assertion in this file is
// that a scalar ceiling is structurally inexpressible: a resolver competent on continuity and
// incompetent on role must say so on all four axes, or it is not a profile.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RESOLVER_PROFILE_TYPE,
  CLAIM_TYPES,
  makeResolverProfile,
  profileCeiling,
  makeResolverRegistry,
} from "../../../../tools/simurgh-attestation/stage5p/core/resolverProfile.mjs";
import {
  leqV,
  makeStrength,
} from "../../../../tools/simurgh-attestation/stage5p/core/identityLattice.mjs";

const FPR = "b".repeat(64);
const SIGSTORE_LIKE_CEILING = {
  binding: "cryptographically_bound",
  resolution: "provider_asserted",
  continuity: "ephemeral",
  role: "unproven",
};
const OK = {
  type: RESOLVER_PROFILE_TYPE,
  profile_id: "simurgh.synthetic.oidc.v1",
  trust_root_fpr: FPR,
  permitted_claim_types: ["principal"],
  ceiling: SIGSTORE_LIKE_CEILING,
  namespace_map: { sub: "simurgh.synthetic.oidc-subject.v1" },
};

test("claim types are exactly the frozen set", () => {
  assert.deepEqual(CLAIM_TYPES, ["principal", "delegation"]);
});

test("a valid profile round-trips and its ceiling is a frozen four-axis vector", () => {
  const p = makeResolverProfile(OK);
  const c = profileCeiling(p);
  assert.deepEqual({ ...c }, SIGSTORE_LIKE_CEILING);
  assert.ok(Object.isFrozen(c));
});

// ---- Law 4's structural guard: the ceiling is a VECTOR ---------------------------------------

test("a SCALAR ceiling is structurally inexpressible", () => {
  assert.throws(() => makeResolverProfile({ ...OK, ceiling: "provider_asserted" }), /ceiling/);
  assert.throws(() => makeResolverProfile({ ...OK, ceiling: 3 }), /ceiling/);
});

test("a PARTIAL ceiling is rejected — silence on an axis is not permission", () => {
  const { role, ...partial } = SIGSTORE_LIKE_CEILING;
  assert.throws(() => makeResolverProfile({ ...OK, ceiling: partial }), /missing axis "role"/);
  assert.throws(
    () => makeResolverProfile({ ...OK, ceiling: { ...SIGSTORE_LIKE_CEILING, seniority: "high" } }),
    /unknown axis/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, ceiling: { ...SIGSTORE_LIKE_CEILING, role: "president" } }),
    /unknown value/
  );
});

test("a continuity-only registry profile genuinely cannot authorise role", () => {
  const registryProfile = makeResolverProfile({
    ...OK,
    profile_id: "simurgh.synthetic.registry.v1",
    ceiling: {
      binding: "unbound",
      resolution: "provider_asserted",
      continuity: "durable",
      role: "unproven",
    },
    namespace_map: { lei: "simurgh.synthetic.organisation.v1" },
  });
  const wantsRole = makeStrength({ ...SIGSTORE_LIKE_CEILING, role: "accountable_role_bound" });
  assert.equal(
    leqV(wantsRole, profileCeiling(registryProfile)),
    false,
    "role exceeds this ceiling"
  );
});

// ---- exact-object and field hardening --------------------------------------------------------

test("rejects unknown key, missing key, and a wrong type literal", () => {
  assert.throws(() => makeResolverProfile({ ...OK, extra: 1 }), /unknown key/);
  const { trust_root_fpr, ...missing } = OK;
  assert.throws(() => makeResolverProfile(missing), /missing key "trust_root_fpr"/);
  assert.throws(
    () => makeResolverProfile({ ...OK, type: "simurgh.vsi.resolver_profile.v2" }),
    /type/
  );
});

test("trust_root_fpr is BARE 64-hex — a sha256: prefix is rejected, never stripped", () => {
  assert.throws(
    () => makeResolverProfile({ ...OK, trust_root_fpr: `sha256:${FPR}` }),
    /trust_root_fpr/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, trust_root_fpr: "B".repeat(64) }),
    /trust_root_fpr/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, trust_root_fpr: "b".repeat(63) }),
    /trust_root_fpr/
  );
});

test("permitted_claim_types must be non-empty, unique, and from the frozen set", () => {
  assert.throws(
    () => makeResolverProfile({ ...OK, permitted_claim_types: [] }),
    /permitted_claim_types/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, permitted_claim_types: ["principal", "principal"] }),
    /permitted_claim_types/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, permitted_claim_types: ["role"] }),
    /permitted_claim_types/
  );
  assert.ok(makeResolverProfile({ ...OK, permitted_claim_types: ["principal", "delegation"] }));
});

test("namespace_map must be non-empty with canonical keys and canonical namespace values", () => {
  assert.throws(() => makeResolverProfile({ ...OK, namespace_map: {} }), /namespace_map/);
  assert.throws(
    () => makeResolverProfile({ ...OK, namespace_map: { Sub: "simurgh.x.v1" } }),
    /namespace_map/
  );
  assert.throws(
    () => makeResolverProfile({ ...OK, namespace_map: { sub: "Simurgh.X.v1" } }),
    /namespace_map/
  );
});

// ---- single-hat: a profile_id is not an identity universe ------------------------------------

test("profile_id may never equal a namespace_id it maps to", () => {
  assert.throws(
    () => makeResolverProfile({ ...OK, namespace_map: { sub: OK.profile_id } }),
    /single-hat|profile_id/
  );
});

// ---- the T10 registry guard -------------------------------------------------------------------

test("two profiles may share a canonical namespace from the IDENTICAL local key", () => {
  const a = makeResolverProfile(OK);
  const b = makeResolverProfile({
    ...OK,
    profile_id: "simurgh.synthetic.registry.v1",
    namespace_map: { sub: "simurgh.synthetic.oidc-subject.v1" },
  });
  const reg = makeResolverRegistry([a, b]);
  assert.equal(reg.size, 2);
});

test("T10: the same canonical namespace reached from DIFFERENT local keys is rejected", () => {
  const a = makeResolverProfile(OK); // sub -> oidc-subject
  const b = makeResolverProfile({
    ...OK,
    profile_id: "simurgh.synthetic.registry.v1",
    namespace_map: { upn: "simurgh.synthetic.oidc-subject.v1" }, // different local key, same universe
  });
  // PREMISE: both really do target the same canonical namespace.
  assert.equal(a.namespace_map.sub, b.namespace_map.upn, "PREMISE FAILED: not the same namespace");
  assert.throws(() => makeResolverRegistry([a, b]), /ambiguous|namespace/);
});

test("a registry rejects duplicate profile_ids", () => {
  const a = makeResolverProfile(OK);
  assert.throws(() => makeResolverRegistry([a, makeResolverProfile(OK)]), /duplicate/);
});
