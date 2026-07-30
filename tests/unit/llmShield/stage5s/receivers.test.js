// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 12 — the receiver lane and intake tiers.
//
// THE CORRECTED MAPPING (§13, E5). A receipt whose signature verifies perfectly but binds the WRONG
// comparison policy is not a signature failure. Reporting 502 would tell a reviewer the receiver's
// key is bad when the receiver is honest and the comparator is asking about a different comparison
// entirely. It takes 499 `COMPARISON_POLICY_DIGEST_MISMATCH`, and both digests are printed so the
// disagreement is legible without a debugger. 502 is reserved for a signature that does not verify.
//
// COLLAPSE OVER AUTHENTICATED PROVENANCE, NEVER ARRAY POSITION. Deduplicating by index means a
// comparator that submits one receipt twice at two indices reports two receivers. The identity that
// counts is the one inside the signed material.
//
// AN UNAVAILABLE STATUS IS EVIDENCE, AND IT IS NOT A VIEW. It contributes to intake completeness and
// to nothing else — no view, no quorum weight, no corroboration, no clean-comparison evidence. An
// attendance record that could vote would be worse than no attendance record at all.

import assert from "node:assert/strict";
import test from "node:test";

import { unavailableStatusCarriesNoView } from "../../../../tools/simurgh-attestation/stage5s/core/artifacts.mjs";
import { codeFor } from "../../../../tools/simurgh-attestation/stage5s/core/rawCodeAllocator.mjs";
import {
  RECEIVER_REFUSALS,
  intake,
} from "../../../../tools/simurgh-attestation/stage5s/core/receivers.mjs";

const CPD = "sha256:comparison-policy-1";
const ENV = "sha256:envelope-1";

const policy = (over = {}) => ({
  comparison_roster: [
    { receiver_identity: "r-a", key_digest: "sha256:rk-a" },
    { receiver_identity: "r-b", key_digest: "sha256:rk-b" },
    { receiver_identity: "r-c", key_digest: "sha256:rk-c" },
  ],
  receiver_signature_profile: "ed25519",
  strong_tier_intake_rule: "every_roster_receiver_responds",
  comparison_policy_digest: CPD,
  ...over,
});

const receipt = (id, over = {}) => ({
  receiver_identity: id,
  receiver_key_digest: `sha256:rk-${id.slice(-1)}`,
  checkpoint_envelope_digest: ENV,
  comparison_policy_digest: CPD,
  receiver_sequence: 1,
  signature_verified: true,
  ...over,
});

const unavailable = (id, over = {}) => ({
  receiver_identity: id,
  receiver_key_digest: `sha256:rk-${id.slice(-1)}`,
  expected_coordinate: { scope_id: "scope-1", epoch: 7 },
  receiver_sequence: 1,
  reason_code: "no_view_recorded",
  comparison_policy_digest: CPD,
  signature_verified: true,
  ...over,
});

const run = (over = {}) =>
  intake({
    policy: policy(),
    receipts: [receipt("r-a"), receipt("r-b"), receipt("r-c")],
    statuses: [],
    ...over,
  });

const reasons = (r) => r.refusals.map((x) => x.reason);

// ------------------------------------------------------------------ the comparison policy

test("[5s-t12] an absent comparison policy is 497, never assumed", () => {
  const r = run({ policy: null });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["COMPARISON_POLICY_NOT_COMMITTED"]);
  assert.equal(codeFor("COMPARISON_POLICY_NOT_COMMITTED"), 497);
});

test("[5s-t12] a malformed comparison roster is 498", () => {
  for (const bad of [
    { comparison_roster: [] },
    { comparison_roster: "r-a" },
    { comparison_roster: [{ receiver_identity: "r-a" }] },
    { comparison_policy_digest: "" },
  ]) {
    const r = run({ policy: policy(bad) });
    assert.equal(r.ok, false, `${JSON.stringify(bad)} was accepted`);
    assert.equal(codeFor(reasons(r)[0]), 498);
  }
});

test("[5s-t12] a roster with a duplicate receiver identity is 498", () => {
  const dup = policy();
  dup.comparison_roster[1].receiver_identity = "r-a";
  assert.equal(codeFor(reasons(run({ policy: dup }))[0]), 498);
});

test("[5s-t12] a VALID signature bound to the WRONG policy is 499, not 502", () => {
  // The whole of E5. The receiver is honest; the comparator is asking about a different comparison.
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b", { comparison_policy_digest: "sha256:other" })],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["COMPARISON_POLICY_DIGEST_MISMATCH"]);
  assert.equal(codeFor("COMPARISON_POLICY_DIGEST_MISMATCH"), 499);

  // Both digests are printed, so the disagreement is readable without a debugger.
  const detail = r.refusals[0].detail;
  assert.ok(detail.includes(CPD), "the committed digest was not printed");
  assert.ok(detail.includes("sha256:other"), "the submitted digest was not printed");
});

test("[5s-t12] the wrong-policy check applies to unavailable statuses too", () => {
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [unavailable("r-c", { comparison_policy_digest: "sha256:other" })],
  });
  assert.deepEqual(reasons(r), ["COMPARISON_POLICY_DIGEST_MISMATCH"]);
});

// ------------------------------------------------------------------ the receiver lane

test("[5s-t12] a malformed receiver identity is 500", () => {
  const r = run({ receipts: [receipt("r-a"), { ...receipt("r-b"), receiver_identity: 7 }] });
  assert.equal(codeFor(reasons(r)[0]), 500);
});

test("[5s-t12] an invented receiver is 501", () => {
  const r = run({ receipts: [receipt("r-a"), receipt("r-z")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["RECEIVER_NOT_IN_COMPARISON_ROSTER"]);
  assert.equal(codeFor("RECEIVER_NOT_IN_COMPARISON_ROSTER"), 501);
});

test("[5s-t12] a roster name over an uncommitted key is not a roster receiver, 501", () => {
  // Membership is the PAIR, as in the witness lane. One submission under a foreign key aliases
  // nothing yet — nothing is wearing two names — so this is 501 and 503 keeps its own meaning.
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b", { receiver_key_digest: "sha256:elsewhere" })],
  });
  assert.deepEqual(reasons(r), ["RECEIVER_NOT_IN_COMPARISON_ROSTER"]);
});

test("[5s-t12] an unverifiable receipt signature is 502", () => {
  for (const over of [{ signature_verified: false }, { signature_verified: undefined }]) {
    const r = run({ receipts: [receipt("r-a"), receipt("r-b", over)] });
    assert.equal(r.ok, false);
    assert.deepEqual(reasons(r), ["RECEIVER_RECEIPT_SIGNATURE_INVALID"]);
    assert.equal(codeFor("RECEIVER_RECEIPT_SIGNATURE_INVALID"), 502);
  }
});

test("[5s-t12] two receiver seats over one key are aliased, 503", () => {
  // Two independent gates, and neither shadows the other: shape is judged when the policy is
  // validated, collapse when the views arrive. One key holding two seats is one receiver holding two
  // votes, and two "independent" views from one key are one view counted twice.
  const shared = policy();
  shared.comparison_roster[1].key_digest = "sha256:rk-a";
  const r = intake({
    policy: shared,
    receipts: [receipt("r-a"), receipt("r-b", { receiver_key_digest: "sha256:rk-a" })],
    statuses: [],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["RECEIVER_KEY_ALIASED"]);
  assert.equal(codeFor("RECEIVER_KEY_ALIASED"), 503);
});

test("[5s-t12] one receiver responding twice is a duplicate, 504", () => {
  const r = run({ receipts: [receipt("r-a"), receipt("r-a"), receipt("r-b")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["RECEIVER_DUPLICATE"]);
  assert.equal(codeFor("RECEIVER_DUPLICATE"), 504);
});

test("[5s-t12] COLLAPSE IS OVER AUTHENTICATED PROVENANCE, not array position", () => {
  // The same signed receipt at two indices is one receiver, and submitting it twice is a duplicate —
  // not two receivers, and not a corroborating pair.
  const once = receipt("r-a");
  const r = run({ receipts: [once, receipt("r-b"), once] });
  assert.deepEqual(reasons(r), ["RECEIVER_DUPLICATE"]);

  // And order carries no meaning: the same set in any arrangement gives the same answer.
  const forward = run({ receipts: [receipt("r-a"), receipt("r-b"), receipt("r-c")] });
  const reversed = run({ receipts: [receipt("r-c"), receipt("r-b"), receipt("r-a")] });
  assert.deepEqual(forward, reversed);
});

test("[5s-t12] a receiver answering with BOTH a receipt and an unavailable status is a duplicate", () => {
  // Two contradictory answers from one seat: "here is my view" and "I have no view". Collapsing them
  // silently would let a receiver be counted present twice, or have its contradiction disappear.
  const r = run({ receipts: [receipt("r-a"), receipt("r-b")], statuses: [unavailable("r-a")] });
  assert.equal(r.ok, false);
  assert.deepEqual(reasons(r), ["RECEIVER_DUPLICATE"]);
});

test("[5s-t12] a malformed unavailable status is 505 and an unverifiable one is 506", () => {
  const malformed = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [{ ...unavailable("r-c"), reason_code: undefined }],
  });
  assert.equal(codeFor(reasons(malformed)[0]), 505);

  const unsigned = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [unavailable("r-c", { signature_verified: false })],
  });
  assert.equal(codeFor(reasons(unsigned)[0]), 506);
});

// ------------------------------------------------------------------ intake tiers

test("[5s-t12] every roster receiver responding gives intake_complete", () => {
  const r = run();
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  assert.equal(r.intake.intake_complete, true);
  assert.equal(r.intake.distinct_committed_receivers, 3);
  assert.equal(r.intake.views.length, 3);
});

test("[5s-t12] a SIGNED unavailable status keeps intake complete", () => {
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [unavailable("r-c")],
  });
  assert.equal(r.ok, true, JSON.stringify(r.refusals));
  assert.equal(r.intake.intake_complete, true);
});

test("[5s-t12] one SILENT receiver leaves intake incomplete", () => {
  const r = run({ receipts: [receipt("r-a"), receipt("r-b")] });
  assert.equal(r.ok, true, "silence is not a refusal — it is an incomplete intake");
  assert.equal(r.intake.intake_complete, false);
  assert.deepEqual(r.intake.silent_receivers, ["r-c"]);
});

test("[5s-t12] an unavailable status contributes NO view and NO receiver weight", () => {
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [unavailable("r-c")],
  });
  assert.equal(r.intake.views.length, 2, "a signed absence became a view");
  assert.equal(r.intake.distinct_committed_receivers, 2, "a signed absence voted");
  assert.ok(!r.intake.views.some((v) => v.receiver_identity === "r-c"));
  assert.ok(unavailableStatusCarriesNoView(unavailable("r-c")));
});

test("[5s-t12] a status carrying a view payload is refused — absence must stay absent", () => {
  const r = run({
    receipts: [receipt("r-a"), receipt("r-b")],
    statuses: [unavailable("r-c", { checkpoint: { epoch: 7 } })],
  });
  assert.equal(r.ok, false);
  assert.equal(codeFor(reasons(r)[0]), 505);
});

test("[5s-t12] fewer than two committed receivers cannot support a clean comparison", () => {
  // §2.8: sufficiency before cleanliness. The count lives here; the verdict is Task 13's.
  const r = run({ receipts: [receipt("r-a")] });
  assert.equal(r.intake.distinct_committed_receivers, 1);
  assert.equal(r.intake.sufficient_for_comparison, false);
  assert.equal(run().intake.sufficient_for_comparison, true);
});

test("[5s-t12] an empty intake is insufficient and incomplete, never vacuously either", () => {
  const r = run({ receipts: [], statuses: [] });
  assert.equal(r.intake.distinct_committed_receivers, 0);
  assert.equal(r.intake.sufficient_for_comparison, false);
  assert.equal(r.intake.intake_complete, false);
});

test("[5s-t12] every refusal this module can emit allocates a code in 497..506", () => {
  const all = Object.values(RECEIVER_REFUSALS);
  assert.ok(all.length > 0);
  for (const reason of all) {
    const code = codeFor(reason);
    assert.equal(typeof code, "number", `${reason} allocates no raw code`);
    assert.ok(code >= 497 && code <= 506, `${reason} allocates ${code}, outside 497..506`);
  }
});
