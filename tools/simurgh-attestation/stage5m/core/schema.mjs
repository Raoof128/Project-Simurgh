// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — raw 384: v2 extension schema. Runs AFTER the frozen 5L core returns 0, so seats 1-2 and the
// committed invariants (schema_version, quorum_policy.profile) are already validated by 364/365. This owns
// ONLY v2 material. The Rekor seat lives in bundle.transparency_log_seat (v2-only) and is OPTIONAL: absence
// is valid (seat_present=false → honest 393); present-but-malformed → 384. v2-only fields are adequacy-screened
// here because the projection strips them before the 5L 364 scan.
import { R } from "./result.mjs";
import {
  ENVELOPE_SCHEMA,
  PROFILE,
  QUORUM_RULE,
  REQUIRED_MEMBERS,
  ADEQUACY_FORBIDDEN_KEYS,
} from "../constants.mjs";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const EXPECTED_ANCHOR_TYPES = ["bitcoin_ots", "rfc3161_tsa"]; // sorted; exactly the two frozen 5L anchors

function hasAdequacyKey(v) {
  if (Array.isArray(v)) return v.some(hasAdequacyKey);
  if (isObj(v)) {
    for (const k of Object.keys(v)) {
      if (ADEQUACY_FORBIDDEN_KEYS.has(k)) return true;
      if (hasAdequacyKey(v[k])) return true;
    }
  }
  return false;
}

// Minimal well-formedness of the transparency-log seat (deep crypto is the adapter's job; this is shape).
function seatWellFormed(s) {
  if (!isObj(s)) return false;
  for (const k of ["uuid", "body", "logID", "signedEntryTimestamp", "submitter_pubkey"]) {
    if (typeof s[k] !== "string") return false;
  }
  const ip = s.inclusionProof;
  if (!isObj(ip)) return false;
  if (typeof ip.rootHash !== "string" || typeof ip.checkpoint !== "string") return false;
  if (!Number.isInteger(ip.logIndex) || !Number.isInteger(ip.treeSize)) return false;
  if (!Array.isArray(ip.hashes)) return false;
  return true;
}

export function checkV2Schema(bundle) {
  if (!isObj(bundle)) return R(384, "v2_not_object");
  if (bundle.envelope_schema !== ENVELOPE_SCHEMA) return R(384, "envelope_schema");
  if (bundle.quorum_profile !== PROFILE) return R(384, "quorum_profile");
  if (bundle.quorum_rule !== QUORUM_RULE) return R(384, "quorum_rule");
  const rm = bundle.required_members;
  if (
    !Array.isArray(rm) ||
    rm.length !== REQUIRED_MEMBERS.length ||
    rm.some((m, i) => m !== REQUIRED_MEMBERS[i])
  ) {
    return R(384, "required_members");
  }
  // bundle.anchors must be EXACTLY the two frozen anchor types — no smuggled extra anchor (G-A).
  const types = (bundle.anchors ?? []).map((a) => a?.anchor_type).sort();
  if (
    types.length !== 2 ||
    types[0] !== EXPECTED_ANCHOR_TYPES[0] ||
    types[1] !== EXPECTED_ANCHOR_TYPES[1]
  ) {
    return R(384, "anchor_set");
  }
  // Adequacy screen over the v2-only fields (projection strips them before the 5L 364 scan).
  for (const k of [
    "envelope_schema",
    "quorum_profile",
    "quorum_rule",
    "required_members",
    "transparency_log_seat",
  ]) {
    if (hasAdequacyKey(bundle[k])) return R(384, "adequacy_vocabulary_forbidden");
  }
  // Optional seat: absent is valid; present must be well-formed.
  const seat = bundle.transparency_log_seat;
  if (seat !== undefined && seat !== null && !seatWellFormed(seat)) {
    return R(384, "transparency_log_seat_malformed");
  }
  return null;
}
