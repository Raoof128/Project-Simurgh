// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — raw 385-390 over INJECTED facts (B11: the pure core never does crypto). Skips entirely when
// seat_present=false (honest absence → 393 downstream). Bounded detail enums are diagnostic only and never
// change precedence; an out-of-enum detail fails closed to "unknown".
import { R } from "./result.mjs";

const INCLUSION_DETAILS = new Set([
  "inclusion_path_length_invalid",
  "inclusion_hash_malformed",
  "inclusion_root_mismatch",
  "log_index_out_of_range",
  "tree_size_invalid",
]);
const CHECKPOINT_DETAILS = new Set([
  "checkpoint_root_mismatch",
  "checkpoint_tree_size_mismatch",
  "checkpoint_signature_invalid",
  "checkpoint_note_malformed",
  "checkpoint_log_key_unpinned",
  "checkpoint_log_identity_mismatch",
]);
const SUBMITTER_DETAILS = new Set([
  "submitter_signature_invalid",
  "submitter_public_key_malformed",
  "submitter_key_algorithm_mismatch",
  "submitter_key_fingerprint_mismatch",
  "expected_submitter_key_binding_failed",
]);

const bounded = (set, v) => (set.has(v) ? v : "unknown"); // fail closed on unknown detail

export function checkRekorSeat(facts) {
  if (facts.seat_present === false) return null; // absent seat: skip; 393 owns the floor
  const rk = facts.rekor;
  if (!rk || rk.kind !== "hashedrekord") return R(385, "entry_body_malformed");
  if (rk.artifact_hash !== facts.anchor_sha256) return R(386, "artifact_hash_mismatch");
  if (facts.inclusion_ok === false) {
    return R(387, "inclusion_invalid", {
      detail: bounded(INCLUSION_DETAILS, facts.inclusion_reason),
    });
  }
  if (facts.checkpoint_ok === false) {
    return R(388, "checkpoint_invalid", {
      detail: bounded(CHECKPOINT_DETAILS, facts.checkpoint_reason),
    });
  }
  if (facts.set_ok === false) return R(389, "set_invalid");
  if (facts.submitter_ok === false) {
    return R(390, "submitter_binding", {
      detail: bounded(SUBMITTER_DETAILS, facts.submitter_reason),
    });
  }
  if (facts.entry_submitter_fpr !== facts.expected_submitter_fpr) {
    return R(390, "submitter_binding", { detail: "submitter_key_fingerprint_mismatch" });
  }
  return null;
}
