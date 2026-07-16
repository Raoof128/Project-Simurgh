// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — STRUCTURAL AND LEXICAL shape rules for the three challenge artifacts (A27 schemas).
//
// SCOPE, stated so it cannot be overread: this is shape only -- exact-key schemas, lexical forms,
// structural counts, and the canonical-bytes acceptance condition. It performs NO cryptography,
// NO proof-of-work, NO chain linkage, NO digest recomputation and NO policy checks. It is NOT the
// Section 7 verifier and must never be cited as one.
//
// Every function REJECTS by throwing, synchronously, like the codec: a verifier boundary converts
// it with try/catch. No nulls, no partial results, no fallbacks.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { decodeDigestToken } from "./digestTokenCodec.mjs";
import {
  SCHEMA_IDS,
  MAX_BEACON_SUFFIX_HEADERS_V1,
  MAX_SELECTED_INDICES_V1,
  HEADER_HEX_CHARS,
} from "./constants.mjs";

const HEADER_RE = /^[0-9a-f]{160}$/; // exactly 160 lowercase hex, no 0x prefix
const CANONICAL_DECIMAL_RE = /^(0|[1-9][0-9]*)$/; // "0" or nonzero first digit; no sign/space/leading zero

/**
 * A canonical-size limit is only sound when canonical encoding is a CONDITION OF ACCEPTANCE.
 * Otherwise semantically equivalent JSON with whitespace or alternate key order sits under an
 * aggregate limit while exceeding the generated canonical maximum.
 *
 *   1. raw.length <= MAX          (caller, before parsing)
 *   2. parse raw
 *   3. canonicalJson(parsed) as UTF-8 === raw     <- this function
 */
export function requireCanonicalBytes(raw) {
  if (typeof raw !== "string") throw new TypeError("raw_input_not_a_string");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("raw_input_not_json");
  }
  if (canonicalJson(parsed) !== raw) throw new Error("raw_input_not_canonical");
  return parsed;
}

function requireExactKeys(obj, keys, what) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new TypeError(`${what}_not_an_object`);
  }
  const got = Object.keys(obj).sort();
  const want = [...keys].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw new Error(`${what}_exact_key_schema`);
  }
}

export function checkBeaconSuffixArtifactShape(a) {
  requireExactKeys(
    a,
    ["schema_id", "schema_digest", "verified_closure_bitcoin_checkpoint_digest", "headers"],
    "beacon_suffix_artifact"
  );
  if (a.schema_id !== SCHEMA_IDS.beacon_suffix) throw new Error("beacon_suffix_schema_id");
  decodeDigestToken(a.schema_digest);
  decodeDigestToken(a.verified_closure_bitcoin_checkpoint_digest);
  if (!Array.isArray(a.headers)) throw new TypeError("beacon_suffix_headers_not_an_array");
  if (a.headers.length < 1 || a.headers.length > MAX_BEACON_SUFFIX_HEADERS_V1) {
    throw new Error("beacon_suffix_header_count");
  }
  for (const h of a.headers) {
    if (typeof h !== "string" || !HEADER_RE.test(h))
      throw new Error("beacon_suffix_header_lexical");
  }
  return a;
}

export function checkOrderedSelectedIndicesArtifactShape(a, universeSize) {
  requireExactKeys(
    a,
    ["schema_id", "schema_digest", "indices"],
    "ordered_selected_indices_artifact"
  );
  if (a.schema_id !== SCHEMA_IDS.ordered_selected_indices) throw new Error("indices_schema_id");
  decodeDigestToken(a.schema_digest);
  if (!Array.isArray(a.indices)) throw new TypeError("indices_not_an_array");
  if (a.indices.length < 1 || a.indices.length > MAX_SELECTED_INDICES_V1) {
    throw new Error("indices_count");
  }
  const seen = new Set();
  for (const s of a.indices) {
    if (typeof s !== "string" || !CANONICAL_DECIMAL_RE.test(s)) {
      throw new Error("index_noncanonical_decimal_string");
    }
    const v = Number(s);
    if (!Number.isSafeInteger(v)) throw new Error("index_not_a_safe_integer");
    if (universeSize !== undefined && v >= universeSize) throw new Error("index_out_of_universe");
    if (seen.has(s)) throw new Error("index_duplicate");
    seen.add(s);
  }
  return a;
}

export function checkChallengeRecordShape(r) {
  requireExactKeys(
    r,
    [
      "schema_id",
      "schema_digest",
      "challenge_subject_digest",
      "verified_closure_bitcoin_checkpoint_digest",
      "beacon_contract_digest",
      "beacon_suffix_digest",
      "ordered_selected_indices_digest",
    ],
    "challenge_record"
  );
  if (r.schema_id !== SCHEMA_IDS.challenge_record) throw new Error("challenge_record_schema_id");
  for (const k of Object.keys(r)) {
    if (k.endsWith("_digest")) decodeDigestToken(r[k]);
  }
  return r;
}

export const SHAPE_WIDTHS = Object.freeze({ header_hex_chars: HEADER_HEX_CHARS });
