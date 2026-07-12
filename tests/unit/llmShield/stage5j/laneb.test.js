// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — Lane B multi-party ceremony properties (plan Task 3.1). Each role signs under its own
// key; the ledger authority sees only digests (content-blind); the 5-section census exercises every
// derived state (A uncontested / B response / C concurrence / D non_comparable / E rebuttal).
import { test } from "node:test";
import assert from "node:assert/strict";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";
import { buildSignedVrcBundle } from "../../../../tools/simurgh-attestation/stage5j/node/buildSignedBundle.mjs";
import { verifyVrc } from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";

function derivedState(bundle, section, reviewer) {
  const rev = bundle.reviewer_ratings.find(
    (e) => e.content.section_id === section && e.content.reviewer_id === reviewer
  );
  if (rev.content.value_kind !== "ordinal") return "non_comparable/not_applicable";
  const ce = bundle.contest_history.find(
    (c) => c.content.section_id === section && c.content.reviewer_id === reviewer
  );
  if (!ce) return "comparable_uncontested/not_applicable";
  const ced = ce.contest_event_digest;
  if (bundle.concurrences.some((c) => c.content.contest_event_digest === ced)) {
    return "comparable_contested/reviewer_concurrence_backed";
  }
  if (bundle.reviewer_rebuttals.some((r) => r.content.contest_event_digest === ced)) {
    return "comparable_contested/contested_reviewer_maintains";
  }
  return "comparable_contested/contested_response_recorded";
}

test("ceremony: every role key is distinct; the built bundle verifies raw 0", () => {
  const keys = vrcLaneKeys();
  const fps = new Set([
    keys.producer.id.key_fingerprint,
    keys.reviewers[0].id.key_fingerprint,
    keys.reviewers[1].id.key_fingerprint,
    keys.ledger.id.key_fingerprint,
    keys.scale.id.key_fingerprint,
    keys.verifier.id.key_fingerprint,
  ]);
  assert.equal(fps.size, 6);
  const { bundle, cfg } = buildSignedVrcBundle(keys);
  assert.equal(verifyVrc(bundle, cfg, { tier: "audit" }).raw, 0);
});

test("content-blind ledger authority: every epoch ticket binds a digest only, no rating values", () => {
  const { bundle } = buildSignedVrcBundle(vrcLaneKeys());
  for (const t of bundle.epoch_tickets) {
    const keys = Object.keys(t.content);
    assert.deepEqual(keys.sort(), [
      "entry_digest",
      "entry_type",
      "ledger_epoch",
      "ledger_id",
      "previous_epoch_ticket_digest",
    ]);
    assert.ok(!("value" in t.content), "ticket must not carry a rating value");
  }
});

test("5-section census exercises all derived states (A–E)", () => {
  const { bundle } = buildSignedVrcBundle(vrcLaneKeys());
  const RA = bundle.reviewer_ratings.find((e) => e.content.section_id === "1").content.reviewer_id;
  const RB = bundle.reviewer_ratings.find((e) => e.content.section_id === "6").content.reviewer_id;
  assert.equal(derivedState(bundle, "1", RA), "comparable_uncontested/not_applicable"); // A
  assert.equal(derivedState(bundle, "3", RA), "comparable_contested/contested_response_recorded"); // B
  assert.equal(derivedState(bundle, "6", RB), "comparable_contested/reviewer_concurrence_backed"); // C
  assert.equal(derivedState(bundle, "8", RB), "non_comparable/not_applicable"); // D
  assert.equal(derivedState(bundle, "7", RB), "comparable_contested/contested_reviewer_maintains"); // E
});
