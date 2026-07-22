// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 — STRUCTURAL shape rules for the producer artifacts + the context checkpoint (check 2).
//
// SCOPE: exact-key schemas, const-value pins, structural counts, and field WIDTH/lexical form. For
// the four PRODUCER artifacts, 32-byte token fields are checked to WIDTH only — their lowercase-hex
// grammar is check 3's job (decodeDigestToken over the §7.3.3 token census), so a 64-char but
// non-hex token passes shape and first-fails at check 3, as the S7.* matrix requires. The context
// CHECKPOINT is not in that census (§7.3.3 is the four producers), so its token fields are fully
// decoded here as part of conforming to pair 18. This module performs NO cryptography, PoW, chain
// linkage, digest recomputation, or policy checks; it is NOT the Section 7 verifier.
//
// section7AuthorityDescriptors.mjs is the NORMATIVE SOURCE for the exact-key sets and const pins;
// this module MIRRORS it (section7ArtifactShapeCensus.test.js proves the mirror).
import { decodeDigestToken } from "./digestTokenCodec.mjs";
import {
  BEACON_SOURCE_ID,
  BEACON_DEPTH_CONVENTION_ID,
  MAX_BEACON_SUFFIX_HEADERS_V1,
  MAX_SELECTED_INDICES_V1,
  HEADER_HEX_CHARS,
} from "./constants.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const HEADER_RE = /^[0-9a-f]{160}$/; // exactly 160 lowercase hex, no 0x prefix
const HEX8_RE = /^[0-9a-f]{8}$/; // 4-byte compact target (nbits), lexical form
const CANONICAL_DECIMAL_RE = /^(0|[1-9][0-9]*)$/; // "0" or nonzero first digit; no sign/space/leading zero
const TOKEN_WIDTH = 64; // a 32-byte token renders as 64 chars; the hex grammar is check 3's
const BITCOIN_MAINNET_PROFILE_ID = "simurgh.bitcoin.mainnet.header_validation.v1";

// ---- The producer-artifact exact-key sets (§7.3.1) + the checkpoint schema (pair 18). Declared as
//      a MIRROR of the frozen SCHEMA_DESCRIPTORS field sets; the shape census proves equality.
export const BEACON_CONTRACT_ARTIFACT_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "profile_id",
  "profile_digest",
  "beacon_source_id",
  "depth_convention_id",
  "challenge_height",
]);
export const BEACON_SUFFIX_ARTIFACT_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "profile_id",
  "profile_digest",
  "verified_closure_bitcoin_checkpoint_digest",
  "headers",
]);
export const ORDERED_SELECTED_INDICES_ARTIFACT_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "profile_id",
  "profile_digest",
  "indices",
]);
export const CHALLENGE_RECORD_KEYS = Object.freeze([
  "schema_id",
  "schema_digest",
  "challenge_protocol_profile_id",
  "challenge_protocol_profile_digest",
  "challenge_seed",
  "challenge_subject_digest",
  "verified_closure_bitcoin_checkpoint_digest",
  "beacon_contract_digest",
  "beacon_suffix_digest",
  "ordered_selected_indices_digest",
]);
export const VERIFIED_CLOSURE_BITCOIN_CHECKPOINT_KEYS = Object.freeze([
  "network_profile_id",
  "checkpoint_height",
  "checkpoint_block_hash",
  "checkpoint_header",
  "checkpoint_nbits",
  "checkpoint_witness_profile_id",
  "checkpoint_witness_profile_digest",
  "checkpoint_witness_key_fingerprint",
  "stage5l_checkpoint_evidence_digest",
]);

/**
 * A canonical-size limit is only sound when canonical encoding is a CONDITION OF ACCEPTANCE
 * (check 1). Returns the parsed object; throws if the raw bytes are not the canonical encoding.
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

function requireTokenWidth(s, what) {
  if (typeof s !== "string") throw new TypeError(`${what}_not_a_string`);
  if (s.length !== TOKEN_WIDTH) throw new Error(`${what}_token_width`);
}

function requireCanonicalDecimal(s, what) {
  if (typeof s !== "string" || !CANONICAL_DECIMAL_RE.test(s)) throw new Error(`${what}_decimal`);
  if (!Number.isSafeInteger(Number(s))) throw new Error(`${what}_not_a_safe_integer`);
}

function requireString(s, what) {
  if (typeof s !== "string" || s.length === 0) throw new Error(`${what}_string`);
}

export function checkBeaconContractArtifactShape(a) {
  requireExactKeys(a, BEACON_CONTRACT_ARTIFACT_KEYS, "beacon_contract_artifact");
  // schema_id/profile_id are TYPE-checked here; their exact value + registry digest are check 4.
  requireString(a.schema_id, "beacon_contract_schema_id");
  requireString(a.profile_id, "beacon_contract_profile_id");
  if (a.beacon_source_id !== BEACON_SOURCE_ID) throw new Error("beacon_contract_source_id");
  if (a.depth_convention_id !== BEACON_DEPTH_CONVENTION_ID) {
    throw new Error("beacon_contract_depth_convention_id");
  }
  requireTokenWidth(a.schema_digest, "beacon_contract_schema_digest");
  requireTokenWidth(a.profile_digest, "beacon_contract_profile_digest");
  requireCanonicalDecimal(a.challenge_height, "beacon_contract_challenge_height");
  return a;
}

export function checkBeaconSuffixArtifactShape(a) {
  requireExactKeys(a, BEACON_SUFFIX_ARTIFACT_KEYS, "beacon_suffix_artifact");
  requireString(a.schema_id, "beacon_suffix_schema_id");
  requireString(a.profile_id, "beacon_suffix_profile_id");
  requireTokenWidth(a.schema_digest, "beacon_suffix_schema_digest");
  requireTokenWidth(a.profile_digest, "beacon_suffix_profile_digest");
  requireTokenWidth(
    a.verified_closure_bitcoin_checkpoint_digest,
    "beacon_suffix_checkpoint_digest"
  );
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
  requireExactKeys(a, ORDERED_SELECTED_INDICES_ARTIFACT_KEYS, "ordered_selected_indices_artifact");
  requireString(a.schema_id, "indices_schema_id");
  requireString(a.profile_id, "indices_profile_id");
  requireTokenWidth(a.schema_digest, "indices_schema_digest");
  requireTokenWidth(a.profile_digest, "indices_profile_digest");
  if (!Array.isArray(a.indices)) throw new TypeError("indices_not_an_array");
  if (a.indices.length < 1 || a.indices.length > MAX_SELECTED_INDICES_V1) {
    throw new Error("indices_count");
  }
  let prev = -1;
  const seen = new Set();
  for (const s of a.indices) {
    if (typeof s !== "string" || !CANONICAL_DECIMAL_RE.test(s)) {
      throw new Error("index_noncanonical_decimal_string");
    }
    const v = Number(s);
    if (!Number.isSafeInteger(v)) throw new Error("index_not_a_safe_integer");
    if (universeSize !== undefined && v >= universeSize) throw new Error("index_out_of_universe");
    if (seen.has(s)) throw new Error("index_duplicate");
    if (v <= prev) throw new Error("index_not_strictly_increasing");
    prev = v;
    seen.add(s);
  }
  return a;
}

export function checkChallengeRecordShape(r) {
  requireExactKeys(r, CHALLENGE_RECORD_KEYS, "challenge_record");
  requireString(r.schema_id, "challenge_record_schema_id");
  requireString(r.challenge_protocol_profile_id, "challenge_record_protocol_profile_id");
  // WIDTH only (check 2). The lowercase-hex grammar of these tokens is check 3 (§7.3.3).
  for (const k of Object.keys(r)) {
    if (k.endsWith("_digest")) requireTokenWidth(r[k], `challenge_record_${k}`);
  }
  requireTokenWidth(r.challenge_seed, "challenge_record_challenge_seed");
  return r;
}

// The context checkpoint (pair 18). NOT in the §7.3.3 token census, so its token fields are decoded
// here (full conformance). It descends from a trusted accepted context; this is a defensive re-check.
export function checkVerifiedClosureBitcoinCheckpointShape(c) {
  requireExactKeys(
    c,
    VERIFIED_CLOSURE_BITCOIN_CHECKPOINT_KEYS,
    "verified_closure_bitcoin_checkpoint"
  );
  if (c.network_profile_id !== BITCOIN_MAINNET_PROFILE_ID) throw new Error("checkpoint_network_id");
  requireCanonicalDecimal(c.checkpoint_height, "checkpoint_height");
  decodeDigestToken(c.checkpoint_block_hash);
  if (typeof c.checkpoint_header !== "string" || !HEADER_RE.test(c.checkpoint_header)) {
    throw new Error("checkpoint_header_lexical");
  }
  if (typeof c.checkpoint_nbits !== "string" || !HEX8_RE.test(c.checkpoint_nbits)) {
    throw new Error("checkpoint_nbits_lexical");
  }
  requireString(c.checkpoint_witness_profile_id, "checkpoint_witness_profile_id");
  decodeDigestToken(c.checkpoint_witness_profile_digest);
  decodeDigestToken(c.checkpoint_witness_key_fingerprint);
  decodeDigestToken(c.stage5l_checkpoint_evidence_digest);
  return c;
}

export const SHAPE_WIDTHS = Object.freeze({
  header_hex_chars: HEADER_HEX_CHARS,
  token_chars: TOKEN_WIDTH,
});

// canonicalJson is re-exported convenience for verifier callers building check-1 raw comparisons.
export { canonicalJson };
