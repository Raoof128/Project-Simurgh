// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 9 — the tamper net and the fail-closed wrapper.
//
// The matrix proves six NAMED defects are caught at their named checks. The tamper net proves the
// verifier does not accept ARBITRARY corruption: every single-field mutation of the accepted
// ancestor must be rejected, or be provably semantics-preserving. "It caught the six we thought of"
// is not the same claim as "it rejects what it should".
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifySection2,
  evaluateSection2Safe,
  SECTION2_CHECK_IDS,
  POLICY_OUTCOMES,
} from "../../../../tools/simurgh-attestation/stage5p/core/section2Verifier.mjs";
import {
  cleanAncestor,
  PINNED,
} from "../../../../tools/simurgh-attestation/stage5p/node/laneAFixtures.mjs";

const clone = (x) => JSON.parse(JSON.stringify(x));

test("PREMISE: the ancestor is accepted, so every rejection below is caused by the tamper", () => {
  assert.equal(verifySection2(cleanAncestor(), PINNED).ok, true, "PREMISE FAILED");
});

// Each entry mutates exactly one field of the accepted ancestor.
const TAMPERS = [
  [
    "subject swapped for an unrelated principal",
    (b) => {
      b.subject.subject_id = "9".repeat(64);
    },
  ],
  [
    "subject_id uppercased",
    (b) => {
      b.subject.subject_id = "A".repeat(64);
    },
  ],
  [
    "principal kind changed",
    (b) => {
      b.evidences[0].claim.principal.kind = "organisation";
    },
  ],
  [
    "namespace changed to one the profile does not map",
    (b) => {
      b.evidences[0].claim.principal.namespace_id = "simurgh.synthetic.other.v1";
    },
  ],
  [
    "profile_id points at an unpinned profile",
    (b) => {
      b.evidences[0].profile_id = "simurgh.synthetic.ghost.v1";
    },
  ],
  [
    "evidence_digest corrupted to a prefixed token",
    (b) => {
      b.evidences[0].evidence_digest = `sha256:${"c".repeat(64)}`;
    },
  ],
  [
    "submission binding truncated",
    (b) => {
      b.evidences[0].submission_digest_binding = "d".repeat(63);
    },
  ],
  [
    "signature emptied",
    (b) => {
      b.evidences[0].signature = "";
    },
  ],
  [
    "asserted delta given an unknown axis value",
    (b) => {
      b.evidences[0].asserted_strength_delta.role = "president";
    },
  ],
  [
    "asserted delta made partial",
    (b) => {
      delete b.evidences[0].asserted_strength_delta.continuity;
    },
  ],
  [
    "required made partial",
    (b) => {
      delete b.required.binding;
    },
  ],
  [
    "claim carries both alternatives",
    (b) => {
      b.evidences[0].claim.delegation = { any: "thing" };
    },
  ],
  [
    "claim inactive alternative set to null",
    (b) => {
      b.evidences[0].claim.delegation = null;
    },
  ],
  [
    "evidences emptied",
    (b) => {
      b.evidences = [];
    },
  ],
  [
    "an unknown key added to the envelope",
    (b) => {
      b.evidences[0].surprise = 1;
    },
  ],
];

for (const [name, mutate] of TAMPERS) {
  test(`tamper rejected: ${name}`, () => {
    const b = clone(cleanAncestor());
    const before = JSON.stringify(b);
    mutate(b);
    assert.notEqual(JSON.stringify(b), before, `PREMISE FAILED: "${name}" changed nothing`);

    const r = evaluateSection2Safe(b, PINNED);
    assert.equal(r.ok, false, `tamper accepted: ${name}`);
    assert.ok(SECTION2_CHECK_IDS.includes(r.check_id), `unknown check_id ${r.check_id}`);
    assert.ok(POLICY_OUTCOMES.includes(r.outcome), `untyped outcome ${r.outcome}`);
  });
}

// ---- the fail-closed wrapper -----------------------------------------------------------------

test("evaluateSection2Safe never throws — it converts any internal error into a typed rejection", () => {
  for (const hostile of [
    undefined,
    null,
    42,
    "bundle",
    [],
    { evidences: "nope" },
    { evidences: [null] },
  ]) {
    const r = evaluateSection2Safe(hostile, PINNED);
    assert.equal(r.ok, false, `hostile input accepted: ${JSON.stringify(hostile)}`);
    assert.ok(POLICY_OUTCOMES.includes(r.outcome));
  }
  // Missing pinned material must also fail closed rather than throwing.
  const r = evaluateSection2Safe(cleanAncestor(), undefined);
  assert.equal(r.ok, false);
});

test("the wrapper agrees with the raw verifier on well-formed input", () => {
  const ancestor = cleanAncestor();
  assert.equal(evaluateSection2Safe(ancestor, PINNED).ok, verifySection2(ancestor, PINNED).ok);
});

test("a rejection carries no partial bank — nothing is banked from a failed run", () => {
  const b = clone(cleanAncestor());
  b.evidences[0].asserted_strength_delta.role = "accountable_role_bound";
  const r = evaluateSection2Safe(b, PINNED);
  assert.equal(r.ok, false);
  assert.equal(r.bank, undefined, "a failed verification must not hand back a partial bank");
});
