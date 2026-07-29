// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 6 — canonicalisation and the two digests.
//
// THE SPLIT IS THE POINT (spec §2.2). The BODY digest excludes all signature material and is what
// the compatibility relation compares; the ENVELOPE digest includes it and is what witnesses and
// receipts bind. Conflating them creates two opposite bugs: compare on envelopes and two valid
// signatures over one history read as a fork; witness the body and a signature can be swapped
// without any witness noticing.

import assert from "node:assert/strict";
import test from "node:test";

import {
  SIGNATURE_FIELDS,
  canonicalJson,
  checkpointBodyDigest,
  checkpointEnvelopeDigest,
} from "../../../../tools/simurgh-attestation/stage5s/core/canonical.mjs";

const checkpoint = (over = {}) => ({
  scope_id: "scope-a",
  epoch: 7,
  history_root: "aa".repeat(32),
  predecessor: "bb".repeat(32),
  c1_commitment: "cc".repeat(32),
  protocol_version: "vwq.v1",
  policy_digest: "dd".repeat(32),
  producer_identity: "producer-x",
  producer_signature: "sig-original",
  producer_signature_profile: "ed25519",
  ...over,
});

test("[5s-t6] canonicalJson is key-ordered and stable under key permutation", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
});

test("[5s-t6] canonicalJson THROWS on BigInt rather than emitting something plausible", () => {
  // 4Z's gotcha. Decimals travel as strings; a silent coercion here is a parity bug in four runtimes.
  assert.throws(() => canonicalJson({ score: 10n }), /BigInt/);
});

test("[5s-t6] two checkpoints differing ONLY in signature share a body digest", () => {
  // The load-bearing case. The relation must never depend on signature determinism.
  const a = checkpoint();
  const b = checkpoint({ producer_signature: "sig-different-but-equally-valid" });
  assert.equal(checkpointBodyDigest(a), checkpointBodyDigest(b));
  assert.notEqual(checkpointEnvelopeDigest(a), checkpointEnvelopeDigest(b));
});

test("[5s-t6] a body change moves BOTH digests", () => {
  const a = checkpoint();
  const b = checkpoint({ history_root: "ff".repeat(32) });
  assert.notEqual(checkpointBodyDigest(a), checkpointBodyDigest(b));
  assert.notEqual(checkpointEnvelopeDigest(a), checkpointEnvelopeDigest(b));
});

test("[5s-t6] every declared signature field is excluded from the body", () => {
  const base = checkpoint();
  for (const f of SIGNATURE_FIELDS) {
    const mutated = checkpoint({ [f]: "mutated-value" });
    assert.equal(
      checkpointBodyDigest(mutated),
      checkpointBodyDigest(base),
      `${f} leaked into the body digest`
    );
  }
});

test("[5s-t6] SIGNATURE_FIELDS is non-empty, so the exclusion test cannot be vacuous", () => {
  assert.ok(SIGNATURE_FIELDS.length >= 2);
});

test("[5s-t6] the digests are domain-separated from each other", () => {
  // Without separation a body digest could be replayed as an envelope digest of a different object.
  const c = checkpoint({ producer_signature: "" });
  assert.notEqual(checkpointBodyDigest(c), checkpointEnvelopeDigest(c));
});

test("[5s-t6] collision resistance is an ASSUMPTION, not a test", () => {
  // Spec §5.2 item 1. "Differing bodies never share a digest" is not something a fixture can show;
  // a fixture shows that these particular bodies differ. The assumption is recorded, not dressed up.
  assert.ok(true);
});
