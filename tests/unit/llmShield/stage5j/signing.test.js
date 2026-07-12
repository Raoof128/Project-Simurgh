// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — signing primitives + committed lane keys (plan Task 2.1 foundation).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signContent,
  verifyContent,
} from "../../../../tools/simurgh-attestation/stage5j/core/signatures.mjs";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";

test("lane keys load: VRC ledger/scale/verifier + reused 5I producer/reviewers, distinct fingerprints", () => {
  const k = vrcLaneKeys();
  const fps = [
    k.ledger.id.key_fingerprint,
    k.scale.id.key_fingerprint,
    k.verifier.id.key_fingerprint,
    k.producer.id.key_fingerprint,
    k.reviewers[0].id.key_fingerprint,
    k.reviewers[1].id.key_fingerprint,
  ];
  assert.equal(new Set(fps).size, 6, "all six role keys are distinct");
  // producer + reviewers come from the reused 5I key set.
  assert.equal(k.producer, k.vpc.producer);
});

test("Ed25519 round-trip: signContent → verifyContent true; a byte-flip → false", () => {
  const k = vrcLaneKeys();
  const domain = "simurgh.vrc.scale.v1";
  const content = { rating_scale_id: "vrc-sev-5", n: 5 };
  const sig = signContent(k.scale.privatePem, domain, content);
  assert.equal(verifyContent(k.scale.id, domain, content, sig), true);
  assert.equal(verifyContent(k.scale.id, domain, { ...content, n: 6 }, sig), false);
});
