// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 10 — ancestry, with MALFORMED and INCOMPLETE kept apart (§13, B4).
//
// The two classes look alike from a distance and must never be blended:
//
//   missing link, insufficient committed material   → unprovable  (ok, no refusal, no accusation)
//   cycle, contradictory link, false derivation     → invalid     (refusal, 509 through compare)
//
// A verifier that answered "invalid" to a short record would be accusing a producer of forging a
// proof when the truth is that we were handed less than we needed. A verifier that answered
// "unprovable" to a cycle would be excusing a proof that contradicts itself. The line between them
// is: does the committed material CONTRADICT the claim, or merely fail to reach it?

import assert from "node:assert/strict";
import test from "node:test";

import {
  ANCESTRY_VERDICTS,
  ancestryOracle,
  proveAncestry,
} from "../../../../tools/simurgh-attestation/stage5s/core/ancestry.mjs";
import {
  COMPATIBILITY_REFUSALS,
  compare,
} from "../../../../tools/simurgh-attestation/stage5s/core/compatibility.mjs";

const POL = "sha256:pol-1";

const node = (n, over = {}) => ({
  body_digest: `sha256:body-${n}`,
  predecessor: `sha256:body-${n - 1}`,
  epoch: n,
  policy_digest: POL,
  protocol_version: "vwq.1",
  ...over,
});

const view = (n, over = {}) => ({
  artifact_kind: "checkpoint",
  producer_identity: "producer-1",
  scope_id: "scope-1",
  epoch: n,
  checkpoint_body_digest: `sha256:body-${n}`,
  checkpoint_envelope_digest: `sha256:env-${n}`,
  history_root: `sha256:root-${n}`,
  ...over,
});

/** epochs 1..4, each linking to its predecessor. */
const straightChain = () => [node(1), node(2), node(3), node(4)];

test("[5s-t10] the verdict set is exactly the four the relation understands", () => {
  assert.deepEqual([...ANCESTRY_VERDICTS].sort(), [
    "invalid",
    "not_ancestor",
    "proven",
    "unprovable",
  ]);
  assert.ok(Object.isFrozen(ANCESTRY_VERDICTS));
});

test("[5s-t10] a complete transitive chain proves ancestry", () => {
  const r = proveAncestry(view(1), view(4), { chain: straightChain() });
  assert.equal(r.verdict, "proven");
});

test("[5s-t10] transitivity is REQUIRED — one hop is not the definition", () => {
  // Never `later.predecessor == earlier.body_digest`: that would refuse every legitimate multi-epoch
  // history and accept nothing else.
  const r = proveAncestry(view(1), view(4), { chain: straightChain() });
  assert.equal(r.verdict, "proven");
  assert.notEqual(view(4).checkpoint_body_digest, view(1).checkpoint_body_digest);
});

// --------------------------------------------------------------- incomplete: unprovable, ok

test("[5s-t10] a chain short one committed link is UNPROVABLE, and carries no refusal", () => {
  const chain = straightChain().filter((n) => n.epoch !== 3);
  const r = proveAncestry(view(1), view(4), { chain });
  assert.equal(r.verdict, "unprovable");
  assert.ok(!("refusal" in r), "an incomplete record must not produce a refusal");
});

test("[5s-t10] an empty committed chain is unprovable, never invalid", () => {
  assert.equal(proveAncestry(view(1), view(4), { chain: [] }).verdict, "unprovable");
  assert.equal(proveAncestry(view(1), view(4)).verdict, "unprovable");
});

test("[5s-t10] an epoch gap is unprovable without policy, proven with allow_epoch_gaps", () => {
  const chain = [node(1), node(4, { predecessor: "sha256:body-1" })];
  assert.equal(proveAncestry(view(1), view(4), { chain }).verdict, "unprovable");
  assert.equal(
    proveAncestry(view(1), view(4), { chain, policy: { allow_epoch_gaps: true } }).verdict,
    "proven"
  );
});

// --------------------------------------------------------------- contradictory: invalid

test("[5s-t10] a self-referencing predecessor is INVALID, not indeterminate", () => {
  const chain = [node(1), node(4, { predecessor: "sha256:body-4" })];
  const r = proveAncestry(view(1), view(4), { chain });
  assert.equal(r.verdict, "invalid");
  assert.match(r.detail, /cycle/i);
});

test("[5s-t10] a two-node loop is INVALID, not indeterminate", () => {
  const chain = [
    node(1),
    node(3, { predecessor: "sha256:body-4" }),
    node(4, { predecessor: "sha256:body-3" }),
  ];
  const r = proveAncestry(view(1), view(4), { chain });
  assert.equal(r.verdict, "invalid");
  assert.match(r.detail, /cycle/i);
});

test("[5s-t10] a link whose predecessor epoch does not decrease is contradictory", () => {
  const chain = [node(1), node(2), node(3), node(4, { predecessor: "sha256:body-9" }), node(9)];
  const r = proveAncestry(view(1), view(4), { chain });
  assert.equal(r.verdict, "invalid");
});

test("[5s-t10] a complete chain that never reaches the earlier view is NOT an ancestor", () => {
  // `predecessor: null` is the committed root. The walk terminates rather than running short, so the
  // answer is definite: this is not missing material, it is a different history.
  const chain = [node(2, { predecessor: null }), node(3), node(4)];
  const r = proveAncestry(view(1), view(4), { chain });
  assert.equal(r.verdict, "not_ancestor");
});

// --------------------------------------------------------------- authorised transitions

test("[5s-t10] a policy change with NO committed transition record is unprovable", () => {
  const chain = [node(1), node(2), node(3), node(4, { policy_digest: "sha256:pol-2" })];
  assert.equal(proveAncestry(view(1), view(4), { chain }).verdict, "unprovable");
});

test("[5s-t10] a policy change WITH an authorising record behaves as committed", () => {
  const chain = [node(1), node(2), node(3), node(4, { policy_digest: "sha256:pol-2" })];
  const policy = {
    transition_records: [{ kind: "policy", from: POL, to: "sha256:pol-2" }],
  };
  assert.equal(proveAncestry(view(1), view(4), { chain, policy }).verdict, "proven");
});

test("[5s-t10] a transition record for a DIFFERENT pair is a false derivation, INVALID", () => {
  // The record exists and contradicts the link it is offered for. That is not short material.
  const chain = [node(1), node(2), node(3), node(4, { policy_digest: "sha256:pol-2" })];
  const policy = {
    transition_records: [{ kind: "policy", from: "sha256:pol-7", to: "sha256:pol-8" }],
  };
  const r = proveAncestry(view(1), view(4), { chain, policy });
  assert.equal(r.verdict, "invalid");
});

test("[5s-t10] a protocol_version change is governed by the same rule", () => {
  const chain = [node(1), node(2), node(3), node(4, { protocol_version: "vwq.2" })];
  assert.equal(proveAncestry(view(1), view(4), { chain }).verdict, "unprovable");
  const policy = {
    transition_records: [{ kind: "protocol", from: "vwq.1", to: "vwq.2" }],
  };
  assert.equal(proveAncestry(view(1), view(4), { chain, policy }).verdict, "proven");
});

// --------------------------------------------------------------- composition with §2.4

test("[5s-t10] the oracle composes with compare: proven → compatible", () => {
  const oracle = ancestryOracle({ chain: straightChain() });
  assert.deepEqual(compare(view(1), view(4), { ancestry: oracle }), {
    ok: true,
    relation: "compatible",
  });
});

test("[5s-t10] the oracle composes with compare: incomplete → indeterminate, NOT a refusal", () => {
  const oracle = ancestryOracle({ chain: straightChain().filter((n) => n.epoch !== 3) });
  assert.deepEqual(compare(view(1), view(4), { ancestry: oracle }), {
    ok: true,
    relation: "indeterminate",
  });
});

test("[5s-t10] the oracle composes with compare: a cycle → refusal at 509", () => {
  const oracle = ancestryOracle({
    chain: [node(1), node(4, { predecessor: "sha256:body-4" })],
  });
  const r = compare(view(1), view(4), { ancestry: oracle });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.ANCESTRY_PROOF_INVALID);
});

test("[5s-t10] a malformed chain record is invalid, and never silently skipped", () => {
  for (const bad of [null, "sha256:body-2", { epoch: 2 }, { body_digest: "sha256:body-2" }]) {
    const chain = [node(1), bad, node(3), node(4)];
    const r = proveAncestry(view(1), view(4), { chain });
    assert.equal(r.verdict, "invalid", `record ${JSON.stringify(bad)} was tolerated`);
  }
});

test("[5s-t10] two records claiming one body digest is a contradictory committed set", () => {
  const chain = [...straightChain(), node(3, { predecessor: "sha256:body-99" })];
  assert.equal(proveAncestry(view(1), view(4), { chain }).verdict, "invalid");
});
