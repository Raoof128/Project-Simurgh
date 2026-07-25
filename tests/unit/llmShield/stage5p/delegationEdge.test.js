// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 4 — the delegation edge (spec §2.5), STRUCTURE ONLY.
//
// A3's ruling is the reason this module is deliberately incapable: a delegation proves a
// relationship between two principals, never that they are the same principal, and it never
// transfers identity-strength axes. Section 2 validates and canonicalises the edge; it does NOT
// decide authority-to-act. That boundary is asserted structurally at the bottom of this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as edgeModule from "../../../../tools/simurgh-attestation/stage5p/core/delegationEdge.mjs";
import {
  DELEGATION_EDGE_TYPE,
  LOGICAL_VALIDITY_TYPE,
  makeDelegationEdge,
  delegationEdgeCanonicalBytes,
  delegationEdgeId,
} from "../../../../tools/simurgh-attestation/stage5p/core/delegationEdge.mjs";
import { PRINCIPAL_TYPE } from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";

const ACTOR = {
  type: PRINCIPAL_TYPE,
  kind: "person",
  namespace_id: "simurgh.synthetic.person.v1",
  subject_id: "a".repeat(64),
};
const ORG = {
  type: PRINCIPAL_TYPE,
  kind: "organisation",
  namespace_id: "simurgh.synthetic.organisation.v1",
  subject_id: "b".repeat(64),
};
const OK = {
  type: DELEGATION_EDGE_TYPE,
  actor_principal: ACTOR,
  represented_principal: ORG,
  role_id: "simurgh.synthetic.submitter-role.v1",
  scope_id: "simurgh.synthetic.evidence-submission-scope.v1",
  validity: { type: LOGICAL_VALIDITY_TYPE, not_before_epoch: "7", not_after_epoch: "12" },
};

test("a valid edge round-trips, freezes, and derives a bare 64-hex id", () => {
  const e = makeDelegationEdge(OK);
  assert.ok(Object.isFrozen(e));
  const id = delegationEdgeId(e);
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.startsWith("sha256:"));
});

test("the edge carries NO self-referential id field", () => {
  assert.throws(() => makeDelegationEdge({ ...OK, edge_id: "c".repeat(64) }), /unknown key/);
});

test("actor and represented principals must differ", () => {
  assert.throws(() => makeDelegationEdge({ ...OK, represented_principal: ACTOR }), /must differ/);
});

test("role_id and scope_id are pinned identifiers, never free text", () => {
  assert.throws(() => makeDelegationEdge({ ...OK, role_id: "Head of Compliance" }), /role_id/);
  assert.throws(() => makeDelegationEdge({ ...OK, scope_id: "all submissions" }), /scope_id/);
});

// ---- epochs: canonical unsigned decimal STRINGS, logical, never wall-clock -------------------

test("epochs must be strings, not JSON numbers", () => {
  assert.throws(
    () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_before_epoch: 7 } }),
    /decimal string/
  );
});

test('no leading zeroes except "0" itself', () => {
  assert.throws(
    () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_before_epoch: "07" } }),
    /leading zero|decimal string/
  );
  assert.ok(makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_before_epoch: "0" } }));
});

test("bounds must be finite and ordered", () => {
  assert.throws(
    () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_after_epoch: "6" } }),
    /not_before_epoch <= not_after_epoch|ordered/
  );
  assert.ok(
    makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_after_epoch: "7" } }),
    "equal bounds are valid"
  );
  for (const bad of ["", "-1", "1.5", "1e3", "Infinity", " 7"]) {
    assert.throws(
      () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, not_before_epoch: bad } }),
      /decimal string/,
      `expected rejection for ${JSON.stringify(bad)}`
    );
  }
});

test("epoch comparison is NUMERIC, not lexicographic", () => {
  // "9" > "10" lexicographically; a string compare would wrongly reject this valid edge.
  assert.ok(
    makeDelegationEdge({
      ...OK,
      validity: { ...OK.validity, not_before_epoch: "9", not_after_epoch: "10" },
    })
  );
});

test("validity is an exact-key object with its own type literal", () => {
  assert.throws(
    () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, extra: 1 } }),
    /unknown key/
  );
  assert.throws(
    () => makeDelegationEdge({ ...OK, validity: { ...OK.validity, type: "other.v1" } }),
    /type/
  );
});

// ---- canonical bytes and id -------------------------------------------------------------------

test("canonical bytes ignore key insertion order; the id follows the bytes", () => {
  const shuffled = {
    validity: OK.validity,
    scope_id: OK.scope_id,
    role_id: OK.role_id,
    represented_principal: ORG,
    actor_principal: ACTOR,
    type: DELEGATION_EDGE_TYPE,
  };
  assert.deepEqual(
    delegationEdgeCanonicalBytes(makeDelegationEdge(shuffled)),
    delegationEdgeCanonicalBytes(makeDelegationEdge(OK))
  );
  assert.equal(delegationEdgeId(shuffled), delegationEdgeId(OK));
});

test("a different role or scope yields a different edge id", () => {
  const base = delegationEdgeId(OK);
  assert.notEqual(delegationEdgeId({ ...OK, role_id: "simurgh.synthetic.reviewer-role.v1" }), base);
  assert.notEqual(delegationEdgeId({ ...OK, scope_id: "simurgh.synthetic.other-scope.v1" }), base);
});

// ---- the Section 2 boundary, enforced structurally --------------------------------------------

test("the module exposes NO authority-to-act evaluation — that is not Section 2's job", () => {
  for (const name of Object.keys(edgeModule)) {
    assert.ok(
      !/authoris|authoriz|satisf|permit|grant|entitle/i.test(name),
      `Section 2 boundary violation — delegation policy export found: ${name}`
    );
  }
});
