// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — VSC: the digest-token codec pinned by challenge_protocol_profile (A27).
//
// Two representations of one digest, and sizing one with the other changes offsets and therefore
// changes the construction:
//
//   canonical JSON artifact field : "sha256:" + 64 lowercase hex  -> 71 ASCII bytes
//   fixed-width preimage / HKDF   : the decoded payload           -> 32 raw bytes
//
// A 71-byte token in a 32-byte slot is a 39-byte overrun, not an inefficiency.
//
// PRIOR ART, NOT AUTHORITY: stage5k/core/merkle.mjs independently implements the same lexical
// grammar inside a PRIVATE helper of its frozen simurgh.vuc.merkle_set.v1 Merkle construction.
// Stage 5O does NOT import, inherit, or invoke it, and does not claim to: a private const is not
// an interface, and citing one as though it were would be a guarantee imported by nickname --
// the defect A13 caught when an earlier draft invoked a Stage4T_CapsuleRoot(flatObject) that
// does not exist in Stage 4T. This module is a new Stage-5O-scoped construction whose authority
// comes from A27, and it shares 5K's grammar deliberately.
//
// Divergence from 5K's helper, deliberate: 5K's dec returns null on malformed input. This codec
// THROWS. A verifier that receives null and continues has already lost the fail-closed property
// the strict grammar exists to provide.

export const STAGE5O_DIGEST_TOKEN_CODEC_ID = "simurgh.vsc.digest_token_codec.v1";

// Frozen encoding: anchored, lowercase-only, exactly 64 hex characters. No alternative lexical
// representation is equivalent -- no case normalisation, no whitespace trimming, no 0x prefix,
// no bare hex, no best-effort decode.
const DIGEST_TOKEN_RE = /^sha256:([0-9a-f]{64})$/;

const DIGEST_RAW_BYTES = 32;
const DIGEST_TOKEN_CHARS = 71; // 7 ("sha256:") + 64

/**
 * Lexical token -> raw 32 bytes. Throws on any deviation from the frozen grammar.
 * @param {string} token
 * @returns {Buffer} exactly 32 bytes
 */
export function decodeDigestToken(token) {
  if (typeof token !== "string") {
    throw new TypeError("digest_token_not_a_string");
  }
  const m = DIGEST_TOKEN_RE.exec(token);
  if (!m) {
    throw new Error("digest_token_grammar_violation");
  }
  const raw = Buffer.from(m[1], "hex");
  // Belt and braces: the anchored 64-hex grammar already forces this, but the length is the
  // property every caller depends on, so it is checked rather than inferred.
  if (raw.length !== DIGEST_RAW_BYTES) {
    throw new Error("digest_token_payload_width");
  }
  return raw;
}

/**
 * Raw 32 bytes -> lexical token. Throws unless the input is exactly 32 bytes.
 * @param {Buffer|Uint8Array} raw
 * @returns {string} 71 ASCII characters
 */
export function encodeDigestToken(raw) {
  const buf = Buffer.isBuffer(raw) ? raw : raw instanceof Uint8Array ? Buffer.from(raw) : null;
  if (buf === null) {
    throw new TypeError("digest_bytes_not_a_buffer");
  }
  if (buf.length !== DIGEST_RAW_BYTES) {
    throw new Error("digest_bytes_width");
  }
  return "sha256:" + buf.toString("hex");
}

export const DIGEST_TOKEN_WIDTHS = Object.freeze({
  raw_bytes: DIGEST_RAW_BYTES,
  token_chars: DIGEST_TOKEN_CHARS,
});
