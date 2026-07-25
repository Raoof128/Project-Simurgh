// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 3 — the resolver evidence envelope (spec §2.11).
//
// Two load-bearing properties: the claim is a discriminated union whose inactive alternative is
// ABSENT (never null), and replay identity EXCLUDES profile_id — without that exclusion, a replay
// upgrade renames itself into invisibility and S2.C4 can never catch it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RESOLVER_EVIDENCE_TYPE,
  makeResolverEvidence,
  evidenceReplayIdentity,
  evidenceCanonicalBytes,
} from "../../../../tools/simurgh-attestation/stage5p/core/resolverEvidence.mjs";
import { PRINCIPAL_TYPE } from "../../../../tools/simurgh-attestation/stage5p/core/canonicalPrincipal.mjs";

const P = {
  type: PRINCIPAL_TYPE,
  kind: "account",
  namespace_id: "simurgh.synthetic.oidc-subject.v1",
  subject_id: "a".repeat(64),
};
const DELTA = {
  binding: "cryptographically_bound",
  resolution: "provider_asserted",
  continuity: "ephemeral",
  role: "unproven",
};
const OK = {
  type: RESOLVER_EVIDENCE_TYPE,
  profile_id: "simurgh.synthetic.oidc.v1",
  claim: { principal: P },
  asserted_strength_delta: DELTA,
  evidence_digest: "c".repeat(64),
  submission_digest_binding: "d".repeat(64),
  signature: "ab12",
};

test("a valid envelope round-trips and freezes", () => {
  const e = makeResolverEvidence(OK);
  assert.equal(e.profile_id, OK.profile_id);
  assert.ok(Object.isFrozen(e));
});

// ---- discriminated union: ABSENT, not null ---------------------------------------------------

test("exactly one claim alternative — both present is rejected", () => {
  assert.throws(
    () => makeResolverEvidence({ ...OK, claim: { principal: P, delegation: { x: 1 } } }),
    /exactly one/
  );
});

test("the inactive alternative must be ABSENT, not null — a null key is a statement", () => {
  assert.throws(
    () => makeResolverEvidence({ ...OK, claim: { principal: P, delegation: null } }),
    /absent/
  );
});

test("an empty claim object is rejected", () => {
  assert.throws(() => makeResolverEvidence({ ...OK, claim: {} }), /exactly one/);
  assert.throws(() => makeResolverEvidence({ ...OK, claim: { unknown: 1 } }), /claim/);
});

test("a principal claim is validated as a real principal", () => {
  assert.throws(
    () =>
      makeResolverEvidence({ ...OK, claim: { principal: { ...P, subject_id: "A".repeat(64) } } }),
    /subject_id/
  );
});

// ---- field hardening ---------------------------------------------------------------------------

test("digests are bare 64-hex; a sha256: prefix is rejected", () => {
  assert.throws(
    () => makeResolverEvidence({ ...OK, evidence_digest: `sha256:${"c".repeat(64)}` }),
    /evidence_digest/
  );
  assert.throws(
    () => makeResolverEvidence({ ...OK, submission_digest_binding: "d".repeat(63) }),
    /submission/
  );
});

test("asserted_strength_delta must be a complete four-axis vector", () => {
  const { role, ...partial } = DELTA;
  assert.throws(
    () => makeResolverEvidence({ ...OK, asserted_strength_delta: partial }),
    /missing axis/
  );
  assert.throws(
    () => makeResolverEvidence({ ...OK, asserted_strength_delta: "strong" }),
    /asserted_strength_delta/
  );
});

test("signature must be lowercase hex of even length", () => {
  assert.throws(() => makeResolverEvidence({ ...OK, signature: "abc" }), /signature/);
  assert.throws(() => makeResolverEvidence({ ...OK, signature: "AB12" }), /signature/);
});

test("rejects unknown and missing keys", () => {
  assert.throws(() => makeResolverEvidence({ ...OK, extra: 1 }), /unknown key/);
  const { signature, ...missing } = OK;
  assert.throws(() => makeResolverEvidence(missing), /missing key "signature"/);
});

// ---- replay identity: the S2.C4 mechanism ----------------------------------------------------

test("replay identity is STABLE across a stronger profile — the S2.3 attack stays visible", () => {
  const original = makeResolverEvidence(OK);
  const replayed = makeResolverEvidence({
    ...OK,
    profile_id: "simurgh.synthetic.role_authority.v1",
    asserted_strength_delta: { ...DELTA, role: "accountable_role_bound" },
  });
  // PREMISE: the two envelopes really do differ, and really do carry the same underlying evidence.
  assert.notDeepEqual(evidenceCanonicalBytes(original), evidenceCanonicalBytes(replayed));
  assert.equal(original.evidence_digest, replayed.evidence_digest);
  assert.equal(
    evidenceReplayIdentity(original),
    evidenceReplayIdentity(replayed),
    "profile_id and asserted delta must NOT enter replay identity, or the upgrade hides itself"
  );
});

test("replay identity CHANGES when the underlying evidence or its submission binding changes", () => {
  const base = evidenceReplayIdentity(makeResolverEvidence(OK));
  assert.notEqual(
    evidenceReplayIdentity(makeResolverEvidence({ ...OK, evidence_digest: "e".repeat(64) })),
    base
  );
  assert.notEqual(
    evidenceReplayIdentity(
      makeResolverEvidence({ ...OK, submission_digest_binding: "f".repeat(64) })
    ),
    base
  );
  assert.notEqual(
    evidenceReplayIdentity(
      makeResolverEvidence({ ...OK, claim: { principal: { ...P, subject_id: "b".repeat(64) } } })
    ),
    base
  );
});

test("replay identity is bare 64-hex", () => {
  assert.match(evidenceReplayIdentity(makeResolverEvidence(OK)), /^[0-9a-f]{64}$/);
});
