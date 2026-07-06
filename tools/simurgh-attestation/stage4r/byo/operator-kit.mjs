// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4R BYO-Operator Kit (4R spec §8.6). Motto: AnthropicSafe First, then
// ReviewerSafe. A single-file kit so an EXTERNAL organisation can run operator B
// with its own keys and produce a capture the shipped verifier checks. Imports
// only the reference crypto (edwards25519 / dleq) and the ceremony token helper
// (pcccCore) — no other repo coupling — so the kit is portable. An actual
// cross-org run is a post-tag pilot (rail cross_org_operator_b_not_yet_exercised).
import { G, mul, encodePoint, hashToPoint } from "../core/edwards25519.mjs";
import { dleqProve } from "../core/dleq.mjs";
import { tokenCommitment } from "../core/pcccCore.mjs";

export const INVITATION_SCHEMA = "simurgh.pccc_operator_invitation.v1";
const REQUIRED_KEYS = [
  "schema",
  "epoch_policy",
  "schema_versions",
  "verifier_digest",
  "invitee_key_digest_slot",
  "signature",
];

// Validate an invitation the invitee received. Returns {ok} or {ok:false,reason}.
export function validateInvitation(inv, expected) {
  if (!inv || typeof inv !== "object") return { ok: false, reason: "invitation_not_object" };
  const keys = Object.keys(inv).sort();
  if (
    keys.length !== REQUIRED_KEYS.length ||
    !keys.every((k, i) => k === [...REQUIRED_KEYS].sort()[i])
  ) {
    return { ok: false, reason: "invitation_keys" };
  }
  if (inv.schema !== INVITATION_SCHEMA) return { ok: false, reason: "invitation_schema" };
  if (expected && inv.verifier_digest !== expected.verifierDigest) {
    return { ok: false, reason: "invitation_verifier_mismatch" };
  }
  if (expected && JSON.stringify(inv.schema_versions) !== JSON.stringify(expected.schemaVersions)) {
    return { ok: false, reason: "invitation_schema_version_skew" };
  }
  return { ok: true };
}

// Produce the invitee's phase-1 mask contribution + its DLEQ mask proof for a
// class the invitee holds. Raw scalar never leaves this function.
export function operatorMaskContribution({
  scalar,
  epoch,
  custodyClassDigest,
  runId,
  pairId,
  role,
}) {
  const Hc = hashToPoint("simurgh.pccc.class.v1", epoch, custodyClassDigest);
  const mask = mul(scalar, Hc);
  const epk = mul(scalar, G);
  const proof = dleqProve({
    scalar,
    basePoint: Hc,
    epk,
    targetPoint: mask,
    relationKind: "mask",
    epoch,
    runId,
    pairId,
    role,
  });
  return { mask_point: encodePoint(mask), epk: encodePoint(epk), dleq_mask: proof };
}

export { tokenCommitment };
