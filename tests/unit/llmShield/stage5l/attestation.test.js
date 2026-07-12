// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — two-tier attestation: real Ed25519, byte-stable, audit ⟹ public.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_valid.mjs";
import { vtcqLaneKeys } from "../../../../tools/simurgh-attestation/stage5l/node/laneKeys.mjs";
import {
  buildPublicAttestation,
  buildAuditAttestation,
} from "../../../../tools/simurgh-attestation/stage5l/node/attestation.mjs";
import { verifyContent } from "../../../../tools/simurgh-attestation/stage5l/node/signatures.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5l/constants.mjs";

const keys = vtcqLaneKeys();

test("public attestation verifies under the gate key + carries the rung", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  const a = buildPublicAttestation(v.bundle, v.cfg, v.facts, keys);
  assert.equal(a.body.rung, "externally_anchored");
  assert.ok(verifyContent(keys.gate.id, DOMAINS.attestationPublic, a.body, a.sig));
});

test("audit attestation binds the public digest (audit ⟹ public) and verifies", () => {
  const v = validBundle({ profile: "vtc_core" });
  const a = buildAuditAttestation(v.bundle, v.cfg, v.facts, keys);
  assert.equal(a.body.public_digest, a.public_attestation.digest);
  assert.ok(verifyContent(keys.tsaverifier.id, DOMAINS.attestationAudit, a.body, a.sig));
});

test("attestations are byte-stable across two builds (deterministic keys)", () => {
  const v1 = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  const v2 = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  const a1 = buildAuditAttestation(v1.bundle, v1.cfg, v1.facts, keys);
  const a2 = buildAuditAttestation(v2.bundle, v2.cfg, v2.facts, keys);
  assert.equal(a1.digest, a2.digest);
  assert.equal(a1.sig, a2.sig);
});

test("pending Quorum attestation is honestly NOT externally_anchored", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "pending" });
  const a = buildPublicAttestation(v.bundle, v.cfg, v.facts, keys);
  assert.equal(a.body.computed_state, "vtc_quorum_pending");
  assert.notEqual(a.body.rung, "externally_anchored");
});
