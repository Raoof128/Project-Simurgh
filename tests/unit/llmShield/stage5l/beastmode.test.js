// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — I1 RSP prerequisite-gate fixture + I3 SCITT projection bridge.
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
import { emitScittProjection } from "../../../../tools/simurgh-attestation/stage5l/node/scitt-bridge.mjs";
import { buildPublicAttestation } from "../../../../tools/simurgh-attestation/stage5l/node/attestation.mjs";
import { vtcqLaneKeys } from "../../../../tools/simurgh-attestation/stage5l/node/laneKeys.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5l/constants.mjs";

const keys = vtcqLaneKeys();

// I1 — RSP prerequisite gate: RSO deployment approval = the gate receipt; the release = the deployment;
// the committed window = "Risk Report published in advance of deployment". Models ORDERING only.
test("I1 rsp-prerequisite-gate: a core ceremony verifies raw 0 (ordering recomputable)", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, { profile: "vtc_core" });
  attachProjections(bundle, cfg, makeVtcqFacts(bundle, cfg, keys));
  // the gate receipt (RSO approval) authorises access; the declared release (deployment) consumes a
  // capability derived from the verified anchors — commit-before-deploy is enforced structurally.
  assert.equal(verifyVtcq(bundle, cfg, keys, { tier: "public" }).raw, 0);
  assert.ok(
    bundle.review_access_authorisation_receipt.start_capability_root_digest.startsWith("sha256:")
  );
});

// I3 — SCITT projection bridge is emit-only and re-projects the public attestation.
test("I3 scitt bridge: candidate re-verifies to the public attestation digest, emit-only", () => {
  const { bundle, cfg } = buildSignedVtcqBundle(keys, {
    profile: "vtc_quorum",
    finality: "confirmed",
  });
  const facts = makeVtcqFacts(bundle, cfg, keys);
  const { statement } = emitScittProjection(bundle, cfg, facts, keys);
  const pub = buildPublicAttestation(bundle, cfg, facts, keys);
  assert.equal(statement.kind, "scitt_projection_candidate"); // NOT an RFC 9943 Signed Statement
  assert.equal(statement.schema_version, DOMAINS.scittStatement);
  assert.equal(statement.subject, bundle.commitment_session_id);
  assert.equal(statement.payload.public_attestation_digest, pub.digest);
});
