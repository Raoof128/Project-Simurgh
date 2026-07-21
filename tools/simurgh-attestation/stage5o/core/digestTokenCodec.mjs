// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O — VSC: the digest-field codec pinned by challenge_protocol_profile (A27).
//
// Two representations of one digest, and sizing one with the other changes offsets and therefore
// changes the construction:
//
//   canonical JSON `bytes32` field : 64 lowercase hex, no prefix   -> 64 ASCII bytes  (§3.4, line 1680)
//   fixed-width preimage / HKDF    : the decoded payload           -> 32 raw bytes
//
// A 64-char field in a 32-byte slot is a 32-byte overrun, not an inefficiency.
//
// FROZEN ENCODING, NOT 5K's. Stage 5K stores digests as "sha256:<64hex>" inside a PRIVATE helper of
// its frozen simurgh.vuc.merkle_set.v1 construction. Spec line 40 states Stage 5O does NOT reuse 5K's
// leaf profile, and §3.4 / line 1680 freeze a single encoding for every `bytes32`: bare lowercase
// hex, exactly 64 characters, no prefix. This codec implements that bare-hex grammar. It does not
// import, inherit, or invoke 5K, and a 5K-style `sha256:`-prefixed field is FOREIGN and REJECTS here
// -- adopting a prefix the spec never sanctioned is a guarantee imported by nickname, the defect A13
// caught when an earlier draft invoked a Stage4T_CapsuleRoot(flatObject) that does not exist. This
// module's authority comes from A27 and from the frozen §3.4 encoding, not from 5K's grammar.
//
// Fail-closed by construction: dec returns nothing on malformed input, it THROWS. A verifier that
// receives null and continues has already lost the fail-closed property the strict grammar exists
// to provide.

export const STAGE5O_DIGEST_TOKEN_CODEC_ID = "simurgh.vsc.digest_token_codec.v1";

// Frozen encoding: anchored, lowercase-only, exactly 64 hex characters, no prefix. No alternative
// lexical representation is equivalent -- no case normalisation, no whitespace trimming, no 0x
// prefix, no `sha256:` prefix, no best-effort decode.
const DIGEST_TOKEN_RE = /^([0-9a-f]{64})$/;

const DIGEST_RAW_BYTES = 32;
const DIGEST_TOKEN_CHARS = 64; // 64 lowercase hex, no prefix

/**
 * Lexical bare-hex field -> raw 32 bytes. Throws on any deviation from the frozen grammar.
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
 * Raw 32 bytes -> lexical bare-hex field. Throws unless the input is exactly 32 bytes.
 * @param {Buffer|Uint8Array} raw
 * @returns {string} 64 lowercase hex characters, no prefix
 */
export function encodeDigestToken(raw) {
  const buf = Buffer.isBuffer(raw) ? raw : raw instanceof Uint8Array ? Buffer.from(raw) : null;
  if (buf === null) {
    throw new TypeError("digest_bytes_not_a_buffer");
  }
  if (buf.length !== DIGEST_RAW_BYTES) {
    throw new Error("digest_bytes_width");
  }
  return buf.toString("hex");
}

export const DIGEST_TOKEN_WIDTHS = Object.freeze({
  raw_bytes: DIGEST_RAW_BYTES,
  token_chars: DIGEST_TOKEN_CHARS,
});
