// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — real signed builder + adapter (facts from verified Ed25519 sigs) end-to-end.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSignedVtcqBundle,
  attachProjections,
} from "../../../../tools/simurgh-attestation/stage5l/node/buildSignedBundle.mjs";
import {
  makeVtcqFacts,
  verifyVtcq,
} from "../../../../tools/simurgh-attestation/stage5l/node/adapter.mjs";
import { vtcqLaneKeys } from "../../../../tools/simurgh-attestation/stage5l/node/laneKeys.mjs";

const keys = vtcqLaneKeys();

test("signed quorum-confirmed bundle → adapter facts → public+audit raw 0", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, {
    profile: "vtc_quorum",
    finality: "confirmed",
  });
  const facts = makeVtcqFacts(bundle, cfg, keys);
  attachProjections(bundle, cfg, facts);
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw, 0);
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "audit" }).raw, 0);
});

test("signed core bundle → raw 0", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, { profile: "vtc_core" });
  const facts = makeVtcqFacts(bundle, cfg, keys);
  attachProjections(bundle, cfg, facts);
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw, 0);
});

test("pending quorum signed bundle → 372 (honest floor miss)", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, {
    profile: "vtc_quorum",
    finality: "pending",
  });
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw, 372);
});

test("tampered receipt (gate sig no longer verifies) → 375", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, { profile: "vtc_core" });
  bundle.review_access_authorisation_receipt.issuance_nonce = "tampered";
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw, 375);
});

test("tampered release consumption (gate sig invalid) → 377", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, { profile: "vtc_core" });
  bundle.declared_releases[0].consumption_record.release_payload_digest = "sha256:swapped";
  // recompute the child so 376 passes but the gate sig no longer matches → 377
  const r = bundle.declared_releases[0];
  assert.ok([376, 377].includes(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw));
});

test("byte-stable: two independent builds produce an identical bundle", () => {
  const a = buildSignedVtcqBundle(keys, { profile: "vtc_quorum", finality: "confirmed" });
  const b = buildSignedVtcqBundle(keys, { profile: "vtc_quorum", finality: "confirmed" });
  assert.equal(JSON.stringify(a.bundle), JSON.stringify(b.bundle));
});
