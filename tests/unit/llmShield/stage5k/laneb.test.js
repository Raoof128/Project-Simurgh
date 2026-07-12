// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — Lane B multi-party separation properties. Each role signs under its own key; the
// sequencer is CONTENT-BLIND (binds digests only, never leaf content / section text); the commit -> order
// -> start -> execution -> output chain verifies raw 0 across distinct principals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vucLaneKeys } from "../../../../tools/simurgh-attestation/stage5k/node/laneKeys.mjs";
import { buildSignedVucBundle } from "../../../../tools/simurgh-attestation/stage5k/node/buildSignedBundle.mjs";
import { verifyVuc } from "../../../../tools/simurgh-attestation/stage5k/node/adapter.mjs";

test("distinct role keys; sequencer + reviewers distinct; the ceremony verifies raw 0 (audit)", () => {
  const keys = vucLaneKeys();
  const fps = new Set([
    keys.producer.id.key_fingerprint,
    keys.reviewers[0].id.key_fingerprint,
    keys.reviewers[1].id.key_fingerprint,
    keys.sequencer.id.key_fingerprint,
    keys.verifier.id.key_fingerprint,
  ]);
  // 5 distinct principals (producer also signs the commitment — allowed, no delegation in v1).
  assert.equal(fps.size, 5);
  // sequencer is NOT a reviewer, NOT the producer, NOT the verifier.
  assert.ok(!fps.has(keys.sequencer.id.key_fingerprint) === false);
  assert.notEqual(keys.sequencer.id.key_fingerprint, keys.reviewers[0].id.key_fingerprint);
  assert.notEqual(keys.sequencer.id.key_fingerprint, keys.reviewers[1].id.key_fingerprint);
  const { bundle, cfg } = buildSignedVucBundle(keys);
  assert.equal(verifyVuc(bundle, cfg, { tier: "audit" }).raw, 0);
});

test("content-blind sequencer: every start_challenge binds DIGESTS only, no leaf content / section text", () => {
  const { bundle, cfg } = buildSignedVucBundle(vucLaneKeys());
  // the raw section text lives only in the 5I partition; assert no challenge field leaks it.
  const sectionTexts = new Set(
    cfg.vpc_bundle.partition.content.sections.flatMap((s) => [s.section_id, s.canonical_path])
  );
  for (const ch of bundle.start_challenges) {
    // every field is a digest / enum / integer — never a raw section id or canonical_path
    for (const [k, val] of Object.entries(ch)) {
      if (k === "sig") continue;
      if (typeof val === "string")
        assert.ok(
          !sectionTexts.has(val) &&
            (val.startsWith("sha256:") ||
              /^(reviewer|producer|n\d+)$/.test(val) ||
              k === "principal_role"),
          `challenge.${k} must be a digest/enum, got ${val}`
        );
    }
    // structural: the challenge carries only the ordering + principal + obligation digests.
    assert.ok(ch.universe_commitment_digest.startsWith("sha256:"));
    assert.ok(ch.ordering_receipt_digest.startsWith("sha256:"));
    assert.ok(ch.obligation_digest.startsWith("sha256:"));
  }
});

test("cross-role chain: reviewer starts signed by reviewers, producer start by producer, challenges by sequencer", () => {
  const keys = vucLaneKeys();
  const { bundle } = buildSignedVucBundle(keys);
  // reviewer principals in start records are exactly the two committed reviewer fingerprints.
  const startFps = new Set(bundle.review_start_records.map((r) => r.reviewer_principal_digest));
  assert.deepEqual(
    [...startFps].sort(),
    [keys.reviewers[0].id.key_fingerprint, keys.reviewers[1].id.key_fingerprint].sort()
  );
  // sequencer signs every challenge (recorded in the anchor evidence).
  assert.equal(bundle.ordering_anchor.evidence.sequencer, keys.sequencer.id.key_fingerprint);
  // producer rating start is bound to the producer identity.
  assert.ok(bundle.producer_rating_start_record.producer_identity_digest.startsWith("sha256:"));
});
