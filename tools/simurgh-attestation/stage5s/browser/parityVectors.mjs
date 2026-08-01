// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 28 — the shared parity vectors.
//
// One committed set, fed to every runtime. They are deliberately not all easy: the comparison
// vectors include a same-checkpoint pair, a same-coordinate fork, an authorised advance and a
// cyclic chain, so agreement means agreement about the interesting cases rather than about three
// runtimes' ability to hash "hello".

const cp = (over = {}) => ({
  scope_id: "scope-1",
  epoch: 7,
  history_root: "root-a",
  predecessor: "body-6",
  c1_commitment: "sha256:c1",
  protocol_version: "vwq.1",
  policy_digest: "sha256:pol",
  producer_identity: "producer-1",
  producer_signature: "c2lnbmF0dXJl",
  producer_signature_profile: "ed25519",
  ...over,
});

const relationView = (over = {}) => ({
  artifact_kind: "checkpoint",
  producer_identity: "producer-1",
  scope_id: "scope-1",
  epoch: 7,
  checkpoint_body_digest: "body-a",
  checkpoint_envelope_digest: "env-a",
  history_root: "root-a",
  ...over,
});

export const PARITY_VECTORS = Object.freeze({
  canonical: [
    { b: 1, a: 2 },
    { nested: { z: [3, 2, 1], a: null } },
    [1, "two", true, null],
    { unicode: "Zürich — 東京", empty: {}, list: [] },
  ],
  checkpoints: [cp(), cp({ history_root: "root-b" }), cp({ epoch: 8, predecessor: "body-7" })],
  comparisons: [
    // same checkpoint
    { a: relationView(), b: relationView() },
    // a fork at one coordinate
    { a: relationView(), b: relationView({ checkpoint_body_digest: "body-b" }) },
    // an authorised advance, with the committed link present
    {
      a: relationView({ checkpoint_body_digest: "body-7", epoch: 7 }),
      b: relationView({ checkpoint_body_digest: "body-8", epoch: 8 }),
      committed: {
        chain: [
          { body_digest: "body-8", predecessor: "body-7", epoch: 8 },
          { body_digest: "body-7", predecessor: null, epoch: 7 },
        ],
      },
    },
    // different scopes — not a fork, an insufficient comparison
    {
      a: relationView(),
      b: relationView({ scope_id: "scope-2", checkpoint_body_digest: "body-b" }),
    },
  ],
  ancestries: [
    {
      earlier: { checkpoint_body_digest: "body-7" },
      later: { checkpoint_body_digest: "body-8" },
      committed: {
        chain: [
          { body_digest: "body-8", predecessor: "body-7", epoch: 8 },
          { body_digest: "body-7", predecessor: null, epoch: 7 },
        ],
      },
    },
    // a cycle — invalid, not merely unprovable
    {
      earlier: { checkpoint_body_digest: "body-x" },
      later: { checkpoint_body_digest: "body-8" },
      committed: {
        chain: [
          { body_digest: "body-8", predecessor: "body-y", epoch: 8 },
          { body_digest: "body-y", predecessor: "body-z", epoch: 7 },
          { body_digest: "body-z", predecessor: "body-y", epoch: 6 },
        ],
      },
    },
    // nothing committed — unprovable, and that is a third answer
    {
      earlier: { checkpoint_body_digest: "body-7" },
      later: { checkpoint_body_digest: "body-9" },
      committed: { chain: [] },
    },
  ],
  tallies: [
    {
      checkpoint: { producer_identity: "producer-1" },
      policy: {
        threshold_q: 2,
        witness_roster: [
          { witness_identity: "w-a", key_digest: "k-a" },
          { witness_identity: "w-b", key_digest: "k-b" },
        ],
      },
      statements: [
        { witness_identity: "w-a", key_digest: "k-a", signature_verified: true },
        { witness_identity: "w-b", key_digest: "k-b", signature_verified: true },
      ],
    },
    // the alias — one authorised key on the wrong authorised identity (5S-F010)
    {
      checkpoint: { producer_identity: "producer-1" },
      policy: {
        threshold_q: 2,
        witness_roster: [
          { witness_identity: "w-a", key_digest: "k-a" },
          { witness_identity: "w-b", key_digest: "k-b" },
        ],
      },
      statements: [{ witness_identity: "w-a", key_digest: "k-b", signature_verified: true }],
    },
    // a short set that is otherwise perfectly valid
    {
      checkpoint: { producer_identity: "producer-1" },
      policy: {
        threshold_q: 2,
        witness_roster: [{ witness_identity: "w-a", key_digest: "k-a" }],
      },
      statements: [{ witness_identity: "w-a", key_digest: "k-a", signature_verified: true }],
    },
  ],
  statuses: [
    { relations: ["same_checkpoint"], intake: { sufficient_for_comparison: true } },
    { relations: ["incompatible"], intake: { sufficient_for_comparison: true } },
    { relations: ["compatible", "same_checkpoint"], intake: { sufficient_for_comparison: true } },
    { relations: ["indeterminate"], intake: { sufficient_for_comparison: true } },
    { relations: [], intake: { sufficient_for_comparison: false } },
  ],
});
