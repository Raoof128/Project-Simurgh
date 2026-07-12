// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — window 374 / receipt 375 / capability 373+376 / release census 377/378 / anchor 379.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { validBundle } from "./_valid.mjs";

const run = (v) => vtcqVerify(v.bundle, v.cfg, v.facts);

test("full valid core bundle → raw 0 (whole public spine passes)", () => {
  assert.equal(run(validBundle({ profile: "vtc_core" })).raw, 0);
});

test("committed window opens before tsa_upper_bound → 374 (internally consistent)", () => {
  // genTime 1000 + accuracy 1 → tsaUpperBound 1001; window opening at 500 is incoherent.
  const v = validBundle({
    profile: "vtc_core",
    reviewWindow: {
      window_open_not_before: 500,
      window_close_after: 9000,
      required_anchor_profile: "vtc_core",
    },
  });
  assert.equal(run(v).raw, 374);
});

test("gate-key substitution → 375 (vs committed gate_identity)", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.review_access_authorisation_receipt.gate_public_key_fingerprint = "fp:attacker";
  assert.equal(run(v).raw, 375);
});

test("receipt missing a required binding → 375", () => {
  const v = validBundle({ profile: "vtc_core" });
  delete v.bundle.review_access_authorisation_receipt.binds.declared_release_surface_digest;
  assert.equal(run(v).raw, 375);
});

test("capability root not derived from anchors → 373", () => {
  const v = validBundle({ profile: "vtc_core" });
  const bad = "sha256:not-derived";
  v.bundle.review_access_authorisation_receipt.start_capability_root_digest = bad;
  v.bundle.review_access_authorisation_receipt.binds.start_capability_root_digest = bad;
  assert.equal(run(v).raw, 373);
});

test("child capability replayed from a different ceremony → 376", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.declared_releases[0].consumption_record.release_capability_digest =
    "sha256:from-ceremony-B";
  assert.equal(run(v).raw, 376);
});

test("duplicate release_slot_id → 376", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.declared_releases.push({ ...v.bundle.declared_releases[0] });
  assert.equal(run(v).raw, 376);
});

test("a committed surface endpoint with no release → 377 (No Temporal Release Bypass)", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.declared_releases = [];
  assert.equal(run(v).raw, 377);
});

test("an extra release outside the committed surface → 378 (valid child, off-surface slot)", async () => {
  const { releaseCapabilityDigest } =
    await import("../../../../tools/simurgh-attestation/stage5l/core/derive.mjs");
  const v = validBundle({ profile: "vtc_core" });
  const root = v.bundle.review_access_authorisation_receipt.start_capability_root_digest;
  const release_payload_digest = "sha256:payload-smuggled";
  const release_capability_digest = releaseCapabilityDigest({
    start_capability_root_digest: root,
    endpoint_id: "smuggled",
    release_ordinal: 0,
    audience_digest: "sha256:aud-smuggled",
    release_payload_digest,
  });
  v.bundle.declared_releases.push({
    endpoint_id: "smuggled",
    release_ordinal: 0,
    audience_digest: "sha256:aud-smuggled",
    consumption_record: { release_capability_digest, release_payload_digest, sig: "sig" },
  });
  v.facts.releaseSigValid["smuggled:0"] = true; // otherwise-valid but off-surface → isolates 378
  assert.equal(run(v).raw, 378);
});

test("a committed trust-domain with no anchor result → 379 (internally consistent)", () => {
  const v = validBundle({ profile: "vtc_core", trustDomainRegistry: ["tsa-x", "ghost-domain"] });
  assert.equal(run(v).raw, 379);
});
