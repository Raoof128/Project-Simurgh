// SPDX-License-Identifier: AGPL-3.0-or-later
// Heartbeat/reveal record validation, banding, and the band-vector commitment (spec §5.2/§5.3).
// Exact-key discipline: unknown top-level fields fail closed. NO aggregate_reveal field may
// exist on a heartbeat (Fix 1 — reveals are separate chain records, signed records never mutate).
import { DIGEST_RE, recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../constants.mjs";

// Band grammar (spec §5.1): "0" exact zero; "a-b" inclusive integer range; ">n" strictly greater.
export function bandFor(value, bands) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`band_unmappable: ${String(value)}`);
  for (const label of bands) {
    if (/^\d+$/.test(label) && value === Number(label)) return label;
    const range = label.match(/^(\d+)-(\d+)$/);
    if (range && value >= Number(range[1]) && value <= Number(range[2])) return label;
    const gt = label.match(/^>(\d+)$/);
    if (gt && value > Number(gt[1])) return label;
  }
  throw new Error(`band_unmappable: ${String(value)}`);
}

export const commitBandVector = ({ window_id, bands, salt }) =>
  recordDigest({ bands, salt, window_id });

const HEARTBEAT_KEYS = Object.freeze([
  "chain_id",
  "commitments",
  "non_claims",
  "position",
  "prev_record_digest",
  "record_type",
  "reveal_commitment",
  "schema",
  "stage",
  "window_id",
]);
const COMMITMENT_KEYS = Object.freeze([
  "private_evidence_root",
  "stage4k_exposure_root",
  "stage4l_cluster_budget_root",
  "stage4m_disclosure_root",
]);
const REVEAL_KEYS = Object.freeze([
  "bands",
  "chain_id",
  "non_claims",
  "position",
  "prev_record_digest",
  "record_type",
  "reveal_salt",
  "revealed_at_window",
  "schema",
  "self_leakage",
  "stage",
  "window_id",
]);
const SELF_LEAKAGE_KEYS = Object.freeze([
  "band_vector_space_size",
  "budget_bits",
  "leakage_bits_upper_bound",
  "within_budget",
]);

const fail = (reason) => ({ ok: false, reason });
const keysExactly = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).sort().join("|") === [...keys].sort().join("|");

function commonChecks(record, keys, schema, recordType, nonClaims) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return fail("schema_invalid");
  for (const key of Object.keys(record)) {
    if (!keys.includes(key)) return fail(`unknown_field:${key}`);
  }
  for (const key of keys) {
    if (!(key in record)) return fail(`missing_field:${key}`);
  }
  if (record.schema !== schema) return fail("schema_mismatch");
  if (record.record_type !== recordType) return fail("record_type_mismatch");
  if (record.stage !== "4N") return fail("stage_mismatch");
  if (record.chain_id !== SEISMOGRAPH_CHAIN_ID) return fail("chain_id_mismatch");
  if (!Number.isInteger(record.position) || record.position < 0)
    return fail("position_not_integer");
  if (!DIGEST_RE.test(record.prev_record_digest)) return fail("digest_malformed");
  for (const nc of nonClaims) {
    if (!Array.isArray(record.non_claims) || !record.non_claims.includes(nc)) {
      return fail("non_claims_incomplete");
    }
  }
  return null;
}

export function validateHeartbeat(record) {
  // A heartbeat carrying aggregate_reveal (or any stray field) fails at the unknown_field
  // guard in commonChecks — the Fix 1 invariant.
  const common = commonChecks(
    record,
    HEARTBEAT_KEYS,
    SEISMOGRAPH_HEARTBEAT_SCHEMA,
    "heartbeat",
    HEARTBEAT_NON_CLAIMS
  );
  if (common) return common;
  if (!keysExactly(record.commitments, COMMITMENT_KEYS)) return fail("commitments_keys_invalid");
  for (const key of COMMITMENT_KEYS) {
    if (!DIGEST_RE.test(record.commitments[key])) return fail("digest_malformed");
  }
  if (
    !keysExactly(record.reveal_commitment, ["committed_band_vector_digest", "reveal_due_window"])
  ) {
    return fail("reveal_commitment_keys_invalid");
  }
  if (!DIGEST_RE.test(record.reveal_commitment.committed_band_vector_digest)) {
    return fail("digest_malformed");
  }
  return { ok: true };
}

export function validateReveal(record, dimensions) {
  const common = commonChecks(
    record,
    REVEAL_KEYS,
    SEISMOGRAPH_REVEAL_SCHEMA,
    "aggregate_reveal",
    REVEAL_NON_CLAIMS
  );
  if (common) return common;
  if (!DIGEST_RE.test(record.reveal_salt)) return fail("digest_malformed");
  if (!record.bands || typeof record.bands !== "object" || Array.isArray(record.bands)) {
    return fail("bands_invalid");
  }
  // Dimension SEMANTICS run only when dimensions are supplied. Q10 calls this with null
  // (structural check only) so that dimension violations surface at their own gates —
  // Q14 (undeclared_band_dimension) and Q16 (raw_count_public) — instead of collapsing
  // every band defect into a raw-49 chain error. Gate separation, same rationale as Q10/Q11.
  if (dimensions) {
    for (const [dim, value] of Object.entries(record.bands)) {
      if (!(dim in dimensions)) return fail("undeclared_band_dimension");
      if (typeof value === "number") return fail("raw_count_public");
      if (!dimensions[dim].includes(value)) return fail("band_label_unknown");
    }
    for (const dim of Object.keys(dimensions)) {
      if (!(dim in record.bands)) return fail("band_dimension_missing");
    }
  }
  if (!keysExactly(record.self_leakage, SELF_LEAKAGE_KEYS)) return fail("self_leakage_invalid");
  const sl = record.self_leakage;
  if (
    !Number.isInteger(sl.band_vector_space_size) ||
    !Number.isInteger(sl.leakage_bits_upper_bound) ||
    !Number.isInteger(sl.budget_bits) ||
    typeof sl.within_budget !== "boolean"
  ) {
    return fail("self_leakage_invalid");
  }
  return { ok: true };
}
