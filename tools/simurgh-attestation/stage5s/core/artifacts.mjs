// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — the nine artifact schemas of spec §2.1.
//
// Validators RETURN a typed refusal; they never throw. A thrown schema error inside an ordered
// evaluator becomes an exception at the call site and reaches the fail-closed wrapper as 512
// VWQ_UNKNOWN — which is the honest code for "something we did not model", and exactly the wrong
// code for "field absent". Only two outcomes are decidable at this layer, and they are the only two
// this file may emit:
//
//   475 SCHEMA_UNSUPPORTED         a required field is missing or mistyped
//   476 CANONICALISATION_UNKNOWN   the declared canonicalisation profile is not one we implement
//
// `receiver_unavailable_status` is deliberately a first-class artifact rather than an absence. It is
// an AUTHENTICATED STATEMENT OF ABSENCE: a receiver saying "I have no view" over its own key. It
// carries no view payload, contributes no quorum weight and no corroboration — but it is evidence,
// and a missing receiver is not.

const SUPPORTED_CANONICALISATION = Object.freeze(["simurgh.vwq.canonical-json.v1"]);

export const ARTIFACT_REFUSALS = Object.freeze({
  SCHEMA_UNSUPPORTED: "SCHEMA_UNSUPPORTED",
  CANONICALISATION_UNKNOWN: "CANONICALISATION_UNKNOWN",
});

/** Required fields per artifact, in the order §2.1 lists them. */
export const ARTIFACT_SCHEMAS = Object.freeze({
  witness_policy: Object.freeze([
    "scope_id",
    "policy_id",
    "threshold_q",
    "roster",
    "producer_identity",
    "producer_key_digest",
    "producer_signature_profile",
    "canonicalisation",
    "policy_digest",
  ]),
  comparison_policy: Object.freeze([
    "comparison_roster",
    "receiver_signature_profile",
    "strong_tier_intake_rule",
    "comparison_policy_digest",
  ]),
  checkpoint: Object.freeze([
    "scope_id",
    "epoch",
    "history_root",
    "predecessor",
    "c1_commitment",
    "protocol_version",
    "policy_digest",
    "producer_identity",
    "producer_signature",
    "producer_signature_profile",
  ]),
  witness_statement: Object.freeze([
    "checkpoint_envelope_digest",
    "scope_id",
    "epoch",
    "policy_digest",
    "witness_identity",
    "signature_profile",
    "signature",
  ]),
  quorum_certificate: Object.freeze(["checkpoint", "witness_statements", "policy_digest"]),
  view_receipt: Object.freeze([
    "checkpoint_envelope_digest",
    "receiver_identity",
    "comparison_policy_digest",
    "signature_profile",
    "signature",
  ]),
  receiver_unavailable_status: Object.freeze([
    "receiver_identity",
    "comparison_policy_digest",
    "reason",
    "signature_profile",
    "signature",
  ]),
  comparison_manifest: Object.freeze([
    "comparison_policy_digest",
    "views",
    "intake_complete",
    "comparison_roster_digest",
  ]),
  // The coordinate PAIR, not a widened `fork_coordinate` — §2.3's triple is frozen, and the
  // cross-epoch route to `incompatible` has no single epoch to name. This row drifted once: Task 14
  // renamed the field in the artifact and this schema kept the old name, so `validateArtifact`
  // refused every genuine artifact as SCHEMA_UNSUPPORTED — a suppressed finding wearing a refusal's
  // clothes. Each side was internally consistent, which is why no test saw it; the seam test in
  // `artifacts.test.js` now derives a REAL artifact and validates it (5S-F008).
  equivocation_artifact: Object.freeze([
    "comparison_coordinate_pair",
    "view_a",
    "view_b",
    "derivation",
    "comparison_manifest_digest",
  ]),
});

export const ARTIFACT_NAMES = Object.freeze(Object.keys(ARTIFACT_SCHEMAS));

/**
 * Validate one artifact against its schema. Pure, and never throws.
 *
 * @returns {{ok: boolean, refusals: Array<{reason: string, field?: string, detail?: string}>}}
 */
export function validateArtifact(name, value) {
  const schema = ARTIFACT_SCHEMAS[name];
  const refusals = [];
  if (!schema) {
    return {
      ok: false,
      refusals: [{ reason: ARTIFACT_REFUSALS.SCHEMA_UNSUPPORTED, detail: name }],
    };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      refusals: [{ reason: ARTIFACT_REFUSALS.SCHEMA_UNSUPPORTED, detail: "not an object" }],
    };
  }
  for (const field of schema) {
    if (value[field] === undefined || value[field] === null) {
      refusals.push({ reason: ARTIFACT_REFUSALS.SCHEMA_UNSUPPORTED, field });
    }
  }
  // Canonicalisation is checked only where the artifact declares it — 476, never 475.
  if (
    value.canonicalisation !== undefined &&
    !SUPPORTED_CANONICALISATION.includes(value.canonicalisation)
  ) {
    refusals.push({
      reason: ARTIFACT_REFUSALS.CANONICALISATION_UNKNOWN,
      field: "canonicalisation",
    });
  }
  return { ok: refusals.length === 0, refusals };
}

/** A signed statement of absence carries no view. Checked separately: absence must stay absent. */
export function unavailableStatusCarriesNoView(status) {
  return !("view" in (status ?? {})) && !("checkpoint" in (status ?? {}));
}
