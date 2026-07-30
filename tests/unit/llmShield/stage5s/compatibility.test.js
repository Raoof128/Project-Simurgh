// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 9 — the compatibility relation, over BODY digests.
//
// THE LOAD-BEARING TEST IS THE FIRST ONE (§13, B3). Two valid signatures over identical content may
// differ in envelope bytes. If the relation compared envelopes, a re-signature would read as a fork
// and the stage would manufacture the exact false accusation §5.3 obliges it to deny. Ed25519 is
// deterministic, but the protocol must not rest on that accident — so the test pins bodies EQUAL and
// envelopes DIFFERENT, and demands `same_checkpoint`.
//
// ANCESTRY IS INJECTED, NOT IMPORTED. `core/ancestry.mjs` is Task 10; a task may not consume an
// artifact a later task produces. The oracle is a parameter, and its DEFAULT is the honest one: with
// no ancestry evidence committed, the answer is `indeterminate` — never `incompatible`. Failing
// closed here would accuse a producer of forking because our inputs were short.

import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPATIBILITY_REFUSALS,
  RELATIONS,
  compare,
  isClean,
} from "../../../../tools/simurgh-attestation/stage5s/core/compatibility.mjs";

const view = (over = {}) => ({
  artifact_kind: "checkpoint",
  producer_identity: "producer-1",
  scope_id: "scope-1",
  epoch: 7,
  checkpoint_body_digest: "sha256:body-a",
  checkpoint_envelope_digest: "sha256:env-a",
  history_root: "sha256:root-a",
  predecessor: "sha256:body-prev",
  policy_digest: "sha256:pol-1",
  protocol_version: "vwq.1",
  ...over,
});

/** An oracle that answers one fixed verdict, so each relation branch is exercised in isolation. */
const oracle = (verdict) => () => ({ verdict });

test("[5s-t9] equal BODIES with different ENVELOPES are the same checkpoint", () => {
  const a = view();
  const b = view({ checkpoint_envelope_digest: "sha256:env-b" });
  assert.notEqual(a.checkpoint_envelope_digest, b.checkpoint_envelope_digest);
  assert.deepEqual(compare(a, b), { ok: true, relation: "same_checkpoint" });
});

test("[5s-t9] the same coordinate with differing bodies is incompatible — the finding", () => {
  const a = view();
  const b = view({ checkpoint_body_digest: "sha256:body-b", history_root: "sha256:root-b" });
  assert.deepEqual(compare(a, b), { ok: true, relation: "incompatible" });
});

test("[5s-t9] a policy_digest or protocol_version change does NOT move the fork coordinate", () => {
  // Review round two's escape hatch: carrying these in the coordinate would let a producer relabel
  // two same-epoch forks as unrelated objects.
  for (const over of [{ policy_digest: "sha256:pol-2" }, { protocol_version: "vwq.2" }]) {
    const b = view({ checkpoint_body_digest: "sha256:body-b", ...over });
    assert.deepEqual(compare(view(), b), { ok: true, relation: "incompatible" });
  }
});

test("[5s-t9] different epochs with proven authorised ancestry are compatible", () => {
  const later = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  const r = compare(view(), later, { ancestry: oracle("proven") });
  assert.deepEqual(r, { ok: true, relation: "compatible" });
});

test("[5s-t9] ancestry unprovable from committed inputs is INDETERMINATE, never a fork", () => {
  const later = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  assert.deepEqual(compare(view(), later, { ancestry: oracle("unprovable") }), {
    ok: true,
    relation: "indeterminate",
  });
  // And with no oracle at all the answer is the same — the default cannot accuse.
  assert.deepEqual(compare(view(), later), { ok: true, relation: "indeterminate" });
});

test("[5s-t9] different epochs where neither is an ancestor is incompatible", () => {
  const later = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  assert.deepEqual(compare(view(), later, { ancestry: oracle("not_ancestor") }), {
    ok: true,
    relation: "incompatible",
  });
});

test("[5s-t9] an invalid ancestry proof refuses at 509 rather than relating", () => {
  const later = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  const r = compare(view(), later, { ancestry: oracle("invalid") });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.ANCESTRY_PROOF_INVALID);
});

test("[5s-t9] the oracle is asked in EARLIER, LATER order regardless of argument order", () => {
  const calls = [];
  const ancestry = (earlier, later) => {
    calls.push([earlier.epoch, later.epoch]);
    return { verdict: "proven" };
  };
  const early = view({ epoch: 3 });
  const late = view({ epoch: 9, checkpoint_body_digest: "sha256:body-b" });
  compare(late, early, { ancestry });
  compare(early, late, { ancestry });
  assert.deepEqual(calls, [
    [3, 9],
    [3, 9],
  ]);
});

test("[5s-t9] the relation is symmetric in its arguments", () => {
  const cases = [
    [view(), view({ checkpoint_envelope_digest: "sha256:env-b" }), undefined],
    [view(), view({ checkpoint_body_digest: "sha256:body-b" }), undefined],
    [view(), view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" }), oracle("proven")],
    [view(), view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" }), oracle("unprovable")],
  ];
  for (const [a, b, ancestry] of cases) {
    assert.deepEqual(compare(a, b, { ancestry }), compare(b, a, { ancestry }));
  }
});

// ------------------------------------------------------------------ §7.3, a redaction is not a fork

test("[5s-t9] §7.3 one history_root under two document projections stays CLEAN", () => {
  // The public and private versions bind the SAME checkpoint. A projection digest is a document-layer
  // fact and never enters the checkpoint body, so the relation cannot see it — which is the point.
  const pub = view({ document_projection_digest: "sha256:public" });
  const priv = view({ document_projection_digest: "sha256:private" });
  const r = compare(pub, priv);
  assert.equal(r.relation, "same_checkpoint");
  assert.ok(isClean(r.relation));
});

test("[5s-t9] §7.3 a later-epoch view over one history_root with ancestry is compatible", () => {
  const priv = view();
  const pub = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  const r = compare(priv, pub, { ancestry: oracle("proven") });
  assert.equal(r.relation, "compatible");
  assert.ok(isClean(r.relation));
});

test("[5s-t9] §7.3 different history_root at one coordinate is the finding, correctly", () => {
  const a = view();
  const b = view({ history_root: "sha256:root-b", checkpoint_body_digest: "sha256:body-b" });
  assert.equal(compare(a, b).relation, "incompatible");
});

test("[5s-t9] §7.3 a document projection in a checkpoint slot is REFUSED, never compared", () => {
  const projection = {
    artifact_kind: "document_projection",
    scope_id: "scope-1",
    redaction_profile: "public",
  };
  const r = compare(view(), projection);
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.SCHEMA_UNSUPPORTED);
  assert.ok(!("relation" in r), "a refused pair must carry no relation at all");
});

// ------------------------------------------------------------------ misuse and sufficiency

test("[5s-t9] views at different fork-coordinate prefixes give an INSUFFICIENT set, not a fork", () => {
  // Accusing two unrelated producers of equivocating with each other is the §5.3 `false_equivocation`
  // win. The pair supports no fork claim over either coordinate, so it is refused as insufficient.
  for (const over of [{ producer_identity: "producer-2" }, { scope_id: "scope-2" }]) {
    const r = compare(view(), view({ checkpoint_body_digest: "sha256:body-b", ...over }));
    assert.equal(r.ok, false);
    assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.COMPARISON_SET_INSUFFICIENT);
  }
});

test("[5s-t9] equal bodies carrying different history_roots is a binding mismatch", () => {
  // The body digest covers the history root, so this pair is self-inconsistent: it should already
  // have been refused upstream at 477. Re-checking here is fail-closed, never a re-ordering.
  const b = view({ history_root: "sha256:root-b" });
  const r = compare(view(), b);
  assert.equal(r.ok, false);
  assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.CHECKPOINT_BINDING_MISMATCH);
});

test("[5s-t9] a malformed view is refused, and every required field is required", () => {
  for (const field of [
    "producer_identity",
    "scope_id",
    "epoch",
    "checkpoint_body_digest",
    "checkpoint_envelope_digest",
    "history_root",
  ]) {
    const broken = view();
    delete broken[field];
    const r = compare(view(), broken);
    assert.equal(r.ok, false, `${field} was optional`);
    assert.equal(r.refusal.reason, COMPATIBILITY_REFUSALS.SCHEMA_UNSUPPORTED);
  }
  for (const bad of [null, undefined, "checkpoint", []]) {
    assert.equal(compare(view(), bad).ok, false);
  }
});

test("[5s-t9] the relation set is exactly the frozen four of §2.4", () => {
  assert.deepEqual([...RELATIONS].sort(), [
    "compatible",
    "incompatible",
    "indeterminate",
    "same_checkpoint",
  ]);
  assert.ok(Object.isFrozen(RELATIONS));
  assert.deepEqual(RELATIONS.filter(isClean).sort(), ["compatible", "same_checkpoint"]);
});

test("[5s-t9] a hostile oracle cannot invent a relation outside the frozen four", () => {
  const later = view({ epoch: 8, checkpoint_body_digest: "sha256:body-b" });
  const r = compare(view(), later, { ancestry: oracle("definitely_fine_trust_me") });
  assert.equal(r.ok, true);
  assert.equal(r.relation, "indeterminate");
});
