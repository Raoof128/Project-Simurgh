// SPDX-License-Identifier: AGPL-3.0-or-later
// Q12 bilateral inclusion binding + Q17 two-artifact equivocation (spec §6, Fixes 4+5).
// Inclusion proofs are BILATERAL inputs supplied by the bundle holder — they are verified
// AGAINST the public feed and are never read from, or written to, any public artifact.
// Q17 scoping is honest: a single feed cannot show a fork; equivocation is detectable
// exactly when two artifacts meet (spec non-claim: equivocation_detection_requires_two_artifacts).
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SEISMOGRAPH_INCLUSION_SCHEMA, SEISMOGRAPH_TIERS } from "../constants.mjs";
import { verifyMerklePath } from "./merklePath.mjs";

export function verifyInclusionProof({ proof, feedRecords }) {
  if (!proof || proof.schema !== SEISMOGRAPH_INCLUSION_SCHEMA) {
    return { raw: 51, reason: "proof_path_invalid" };
  }
  if (!SEISMOGRAPH_TIERS.includes(proof.bundle_tier)) return { raw: 51, reason: "unknown_tier" };
  const heartbeat = feedRecords.find(
    (r) => r?.record_type === "heartbeat" && r?.window_id === proof.window_id
  );
  if (!heartbeat || recordDigest(heartbeat) !== proof.heartbeat_digest) {
    return { raw: 51, reason: "referenced_heartbeat_absent" };
  }
  const committedRoot = heartbeat.commitments?.[proof.included_under];
  if (
    proof.included_under !== "stage4m_disclosure_root" ||
    proof.root !== committedRoot ||
    !verifyMerklePath(proof.bundle_digest, proof.proof_path, proof.root)
  ) {
    return { raw: 51, reason: "proof_path_invalid" };
  }
  return { raw: 0 };
}

export function verifyNoEquivocation({ feedRecords, secondArtifact }) {
  const { record_type, window_id, digest } = secondArtifact ?? {};
  const mine = feedRecords.find(
    (r) => r?.record_type === record_type && r?.window_id === window_id
  );
  if (!mine || recordDigest(mine) !== digest) {
    return { raw: 48, reason: "cross_artifact_digest_mismatch" };
  }
  return { raw: 0 };
}
