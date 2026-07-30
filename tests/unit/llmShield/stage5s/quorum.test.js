// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 11 — quorum arithmetic and laundering collapse.
//
// PRODUCER EXCLUSION RUNS BEFORE COLLAPSE, AND THE ORDER IS THE POINT. Collapse first and a producer
// wearing two roster aliases spends both of them on the alias check, gets merged into one identity,
// and survives the self-witness check as a single legitimate-looking witness. Excluding the producer
// first means its aliases are gone before anything is merged.
//
// EVERY REFUSAL IS CHECKED AGAINST THE ALLOCATOR, not against a literal. A test that asserts 491 by
// writing 491 proves the test can count; asserting `codeFor(reason) === 491` proves the tally and the
// frozen band agree.
//
// THE TALLY RETURNS ARITHMETIC, NEVER A STATUS. `quorum_status` is one of the five Task 13 functions.
// A tally that named its own status would let a caller read a verdict this module has no authority
// to issue.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { EXTERNAL_ANCHOR_CLASS } from "../../../../tools/simurgh-attestation/stage5s/core/classes.mjs";
import {
  QUORUM_REFUSALS,
  tally,
} from "../../../../tools/simurgh-attestation/stage5s/core/quorum.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";

const SRC = "tools/simurgh-attestation/stage5s/core/quorum.mjs";

const PRODUCER = "producer-1";
const PRODUCER_KEY = "sha256:key-producer";

const checkpoint = (over = {}) => ({
  producer_identity: PRODUCER,
  scope_id: "scope-1",
  epoch: 7,
  ...over,
});

const policy = (over = {}) => ({
  threshold_q: 2,
  witness_roster: [
    { witness_identity: "w-a", key_digest: "sha256:key-a", witness_operator_class: "unresolved" },
    { witness_identity: "w-b", key_digest: "sha256:key-b", witness_operator_class: "unresolved" },
    {
      witness_identity: "w-c",
      key_digest: "sha256:key-c",
      witness_operator_class: "same_operator_distinct_key",
    },
  ],
  required_class_mix: {},
  ...over,
});

const statement = (id, over = {}) => ({
  witness_identity: id,
  key_digest: `sha256:key-${id.slice(-1)}`,
  scope_id: "scope-1",
  epoch: 7,
  signature_verified: true,
  ...over,
});

const run = (over = {}) =>
  tally({
    checkpoint: checkpoint(),
    policy: policy(),
    producer_key_digest: PRODUCER_KEY,
    statements: [statement("w-a"), statement("w-b")],
    ...over,
  });

const reasons = (r) => r.refusals.map((x) => x.reason);

test("[5s-t11] a clean two-of-three quorum meets the threshold", () => {
  const r = run();
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  assert.equal(r.tally.distinct_eligible_witnesses, 2);
  assert.equal(r.tally.threshold_q, 2);
  assert.equal(r.tally.met, true);
});

test("[5s-t11] an unverified signature is refused — the tally assumes nothing it did not see", () => {
  // Fail-closed on ABSENCE, not merely on a false flag: a statement that never passed a signature
  // check reaches here indistinguishable from one that failed, and both must be refused.
  for (const over of [{ signature_verified: false }, { signature_verified: undefined }]) {
    const r = run({ statements: [statement("w-a", over), statement("w-b")] });
    assert.equal(r.ok, false);
    assert.deepEqual(reasons(r), ["WITNESS_SIGNATURE_INVALID"]);
    assert.equal(codeFor(reasons(r)[0]), 490);
  }
});

test("[5s-t11] a malformed witness identity is 488", () => {
  const r = run({ statements: [statement("w-a"), { ...statement("w-b"), witness_identity: 7 }] });
  assert.equal(r.ok, false);
  assert.equal(codeFor(reasons(r)[0]), 488);
});

test("[5s-t11] a witness outside the roster is 489", () => {
  const r = run({ statements: [statement("w-a"), statement("w-z")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["WITNESS_NOT_IN_ROSTER"]);
  assert.equal(codeFor("WITNESS_NOT_IN_ROSTER"), 489);
});

test("[5s-t11] an EXTERNAL ANCHOR fed into the quorum lane is 489 — §3.1, machine-checked", () => {
  // "External anchors contribute zero witness weight and may never count toward `threshold_q`."
  // Enforcement needs no new code: an anchor is not a roster identity.
  for (const anchor of EXTERNAL_ANCHOR_CLASS) {
    const r = run({
      statements: [statement("w-a"), statement(anchor, { key_digest: "sha256:key-anchor" })],
    });
    assert.equal(r.ok, false, `${anchor} was admitted to the quorum lane`);
    assert.deepEqual(reasons(r), ["WITNESS_NOT_IN_ROSTER"]);
  }
});

test("[5s-t11] a producer witnessing itself is 491, by identity OR by key", () => {
  const roster = policy().witness_roster.concat({
    witness_identity: PRODUCER,
    key_digest: PRODUCER_KEY,
    witness_operator_class: "unresolved",
  });
  const byIdentity = run({
    policy: policy({ witness_roster: roster }),
    statements: [statement("w-a"), statement(PRODUCER, { key_digest: PRODUCER_KEY })],
  });
  assert.deepEqual(reasons(byIdentity), ["PRODUCER_SELF_WITNESS"]);
  assert.equal(codeFor("PRODUCER_SELF_WITNESS"), 491);

  // A roster seat that is secretly the producer's own key is the same fact wearing a hat.
  const seated = policy();
  seated.witness_roster[1].key_digest = PRODUCER_KEY;
  const byKey = run({
    policy: seated,
    statements: [statement("w-a"), statement("w-b", { key_digest: PRODUCER_KEY })],
  });
  assert.deepEqual(reasons(byKey), ["PRODUCER_SELF_WITNESS"]);
});

test("[5s-t11] roster membership is checked on the (identity, key) PAIR, not the name alone", () => {
  // A statement wearing a roster name over a key the roster never committed is not a roster witness.
  // Matching on the name alone would let any key sign as anybody.
  const r = run({
    statements: [statement("w-a"), statement("w-b", { key_digest: "sha256:key-elsewhere" })],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["WITNESS_NOT_IN_ROSTER"]);
});

test("[5s-t11] PRODUCER EXCLUSION PRECEDES COLLAPSE — two aliases cannot spend the alias check", () => {
  // The attack: the producer holds two roster seats over its own key. If the alias check collapsed
  // them first, the pair would merge into one identity and then pass self-witness as one witness.
  const roster = policy().witness_roster.concat(
    {
      witness_identity: "p-alias-1",
      key_digest: PRODUCER_KEY,
      witness_operator_class: "unresolved",
    },
    {
      witness_identity: "p-alias-2",
      key_digest: PRODUCER_KEY,
      witness_operator_class: "unresolved",
    }
  );
  const r = run({
    policy: policy({ witness_roster: roster }),
    statements: [
      statement("w-a"),
      statement("p-alias-1", { key_digest: PRODUCER_KEY }),
      statement("p-alias-2", { key_digest: PRODUCER_KEY }),
    ],
  });
  assert.equal(r.ok, false);
  // Both seats offend and both are reported — but the REASON is producer self-witness, not alias.
  assert.deepEqual(
    [...new Set(reasons(r))],
    ["PRODUCER_SELF_WITNESS"],
    "collapse ran before producer exclusion"
  );
  assert.equal(r.refusals.length, 2, "one seat was silently merged away before exclusion");
});

test("[5s-t11] two roster seats sharing one key are aliased, 492", () => {
  // Defence in depth, and the two gates are independent: `validateWitnessQuorumPolicy` refuses this
  // roster at 485 before it is ever committed, and the tally refuses it again at 492 if it arrives
  // anyway. One key holding two seats is one witness holding two votes.
  const shared = policy();
  shared.witness_roster[1].key_digest = "sha256:key-a";
  const r = run({
    policy: shared,
    statements: [statement("w-a"), statement("w-b", { key_digest: "sha256:key-a" })],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["WITNESS_KEY_ALIASED"]);
  assert.equal(codeFor("WITNESS_KEY_ALIASED"), 492);
});

test("[5s-t11] one identity signing twice is a duplicate, 493", () => {
  const r = run({ statements: [statement("w-a"), statement("w-a"), statement("w-b")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["WITNESS_DUPLICATE"]);
  assert.equal(codeFor("WITNESS_DUPLICATE"), 493);
});

test("[5s-t11] a statement from another epoch is a cross-epoch replay, 494", () => {
  const r = run({ statements: [statement("w-a"), statement("w-b", { epoch: 6 })] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["CROSS_EPOCH_REPLAY"]);
  assert.equal(codeFor("CROSS_EPOCH_REPLAY"), 494);
});

test("[5s-t11] a statement from another scope is a cross-scope replay, 495", () => {
  const r = run({ statements: [statement("w-a"), statement("w-b", { scope_id: "scope-2" })] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["CROSS_SCOPE_REPLAY"]);
  assert.equal(codeFor("CROSS_SCOPE_REPLAY"), 495);
});

test("[5s-t11] fewer eligible witnesses than threshold_q is 496", () => {
  const r = run({ statements: [statement("w-a")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["QUORUM_BELOW_POLICY"]);
  assert.equal(codeFor("QUORUM_BELOW_POLICY"), 496);
  assert.equal(r.tally.met, false);
});

test("[5s-t11] the required CLASS MIX is part of the threshold, not decoration", () => {
  // Count alone is not policy: two `unresolved` witnesses do not satisfy a mix demanding a
  // distinct-key operator, and reporting `met` would launder the difference.
  const r = run({
    policy: policy({ required_class_mix: { same_operator_distinct_key: 1 } }),
    statements: [statement("w-a"), statement("w-b")],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["QUORUM_BELOW_POLICY"]);

  const met = run({
    policy: policy({ required_class_mix: { same_operator_distinct_key: 1 } }),
    statements: [statement("w-a"), statement("w-c")],
  });
  assert.equal(met.ok, true, JSON.stringify(met.refusals));
});

test("[5s-t11] the checks fire in the frozen §2.8 order, first failure wins", () => {
  // One statement carrying every defect at once. The refusal reported is the earliest group's.
  const roster = policy().witness_roster.concat({
    witness_identity: "p-alias-1",
    key_digest: PRODUCER_KEY,
    witness_operator_class: "unresolved",
  });
  const everything = [
    statement("w-a"),
    statement("p-alias-1", { key_digest: PRODUCER_KEY, epoch: 6, scope_id: "scope-2" }),
    statement("w-a"),
  ];
  const r = tally({
    checkpoint: checkpoint(),
    policy: policy({ witness_roster: roster }),
    producer_key_digest: PRODUCER_KEY,
    statements: everything,
  });
  assert.deepEqual(reasons(r), ["PRODUCER_SELF_WITNESS"]);

  // Remove the producer and the NEXT group surfaces, in order, without re-ordering the rest.
  const withoutProducer = tally({
    checkpoint: checkpoint(),
    policy: policy(),
    producer_key_digest: PRODUCER_KEY,
    statements: [statement("w-a"), statement("w-a"), statement("w-b", { epoch: 6 })],
  });
  assert.deepEqual(reasons(withoutProducer), ["WITNESS_DUPLICATE"]);
});

test("[5s-t11] an empty statement set is below policy, never vacuously met", () => {
  const r = run({ statements: [] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["QUORUM_BELOW_POLICY"]);
  assert.equal(r.tally.distinct_eligible_witnesses, 0);
});

test("[5s-t11] every refusal this module can emit allocates a code in 488..496", () => {
  const all = Object.values(QUORUM_REFUSALS);
  assert.ok(all.length > 0);
  for (const reason of all) {
    const code = codeFor(reason);
    assert.equal(typeof code, "number", `${reason} allocates no raw code`);
    assert.ok(code >= 488 && code <= 496, `${reason} allocates ${code}, outside 488..496`);
  }
});

test("[5s-t11] the tally names no status — checked over source with comments stripped", () => {
  const raw = readFileSync(SRC, "utf8");
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  assert.ok(code.includes("export function tally"), "comment stripping removed the tally");
  for (const forbidden of ["witnessed_quorum", "quorum_incomplete", "quorum_status"]) {
    assert.ok(!code.includes(forbidden), `quorum.mjs names a status: ${forbidden}`);
  }
});
