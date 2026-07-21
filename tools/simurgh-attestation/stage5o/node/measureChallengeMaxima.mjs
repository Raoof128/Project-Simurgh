// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — generate the maximal schema-valid instances of the three challenge artifacts and
// measure them with the PRODUCTION canonical encoder. A27's four byte maxima come from here.
//
// canonicalJson and recordDigest are IMPORTED, never reimplemented: a measurement script with its
// own encoder measures its own encoder. Byte length is UTF-8 over the production output, so field
// names, quotes, commas, braces, prefixes and schema strings are all included by construction
// rather than by remembering to add them.
//
// SCOPE OF THE SUFFIX OBJECT: this is the maximal SCHEMA-VALID CANONICAL ENCODING, not a
// successful beacon fixture. The headers do not form a mineable chain and are not claimed to.
// Every lexically valid header has the same encoded length, so size is exact regardless -- but
// calling this a beacon fixture would be a claim the bytes do not support.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "../core/digestTokenCodec.mjs";
import {
  SCHEMA_IDS,
  MAX_BEACON_SUFFIX_HEADERS_V1,
  MAX_SELECTED_INDICES_V1,
  HEADER_HEX_CHARS,
} from "../core/constants.mjs";

/** UTF-8 byte length of the production canonical encoding. */
export function measure(obj) {
  return Buffer.byteLength(canonicalJson(obj), "utf8");
}

/** A valid 64-character bare-hex digest field from a deterministic filler byte. */
const token = (fill) => encodeDigestToken(Buffer.alloc(32, fill));

/** A lexically valid 160-hex header. Content is irrelevant to size; every valid header is 160. */
const header = (i) => (i % 2 === 0 ? "a" : "f").repeat(HEADER_HEX_CHARS);

export function maximalBeaconSuffixArtifact() {
  return {
    schema_id: SCHEMA_IDS.beacon_suffix,
    schema_digest: token(0x11),
    verified_closure_bitcoin_checkpoint_digest: token(0x22),
    headers: Array.from({ length: MAX_BEACON_SUFFIX_HEADERS_V1 }, (_, i) => header(i)),
  };
}

export function maximalOrderedSelectedIndicesArtifact() {
  return {
    schema_id: SCHEMA_IDS.ordered_selected_indices,
    schema_digest: token(0x33),
    // the largest valid ordered sequence, and it contains the longest permitted decimal strings
    indices: Array.from({ length: MAX_SELECTED_INDICES_V1 }, (_, i) => String(i)),
  };
}

export function maximalChallengeRecord() {
  // every digest field is fixed-width: any valid token has the same encoded length
  return {
    schema_id: SCHEMA_IDS.challenge_record,
    schema_digest: token(0x44),
    challenge_subject_digest: token(0x55),
    verified_closure_bitcoin_checkpoint_digest: token(0x66),
    beacon_contract_digest: token(0x77),
    beacon_suffix_digest: token(0x88),
    ordered_selected_indices_digest: token(0x99),
  };
}

/** The four A27 byte maxima, generated. No hand arithmetic, no margin. */
export function generateMaxima() {
  const suffix = measure(maximalBeaconSuffixArtifact());
  const indices = measure(maximalOrderedSelectedIndicesArtifact());
  const record = measure(maximalChallengeRecord());
  return Object.freeze({
    MAX_BEACON_SUFFIX_ARTIFACT_BYTES_V1: suffix,
    MAX_SELECTED_INDICES_ARTIFACT_BYTES_V1: indices,
    MAX_CHALLENGE_RECORD_BYTES_V1: record,
    // exact sum: there is no package wrapper, so no delimiter, array, newline or transport bytes
    MAX_CHALLENGE_PACKAGE_BYTES_V1: suffix + indices + record,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = generateMaxima();
  for (const [k, v] of Object.entries(m)) console.log(`${k.padEnd(42)} = ${v.toLocaleString()}`);
}
