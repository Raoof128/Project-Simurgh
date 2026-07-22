// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7 Lane B — the real Bitcoin-mainnet suffix validator (pure, no network, no globals).
//
// Byte order is stated once and never mixed: an 80-byte header stores prev_block in INTERNAL
// (little-endian) order; the block hash is SHA256d(header) taken AS-IS for internal order and
// BYTE-REVERSED for display order. Proof of work compares the hash as a little-endian 256-bit number
// (== BigInt of the display hex) against the compact-target-decoded threshold. All arithmetic is
// BigInt; no floating point. This module owns check 6's semantics; it derives beacon_value and never
// decides checks 7-11 (the verifier owns those from the returned VerifiedBitcoinSuffix).
import { createHash } from "node:crypto";

const HEADER_RE = /^[0-9a-f]{160}$/;
const MAINNET = "simurgh.bitcoin.mainnet.header_validation.v1";
const POW_LIMIT = compactTargetToBig(0x1d00ffff); // mainnet maximum target

export function doubleSha256(buf) {
  return createHash("sha256").update(createHash("sha256").update(buf).digest()).digest();
}

/** Decode an 80-byte header from 160 lowercase hex; throws on any malformation. */
export function decodeHeader(hex) {
  if (typeof hex !== "string" || !HEADER_RE.test(hex)) throw new Error("header_lexical");
  const buf = Buffer.from(hex, "hex");
  if (buf.length !== 80) throw new Error("header_length");
  return {
    version: buf.readUInt32LE(0),
    prevBlockInternalHex: buf.subarray(4, 36).toString("hex"),
    merkleRootHex: buf.subarray(36, 68).toString("hex"),
    timestamp: buf.readUInt32LE(68),
    nBits: buf.readUInt32LE(72),
    nBitsHex: buf.subarray(72, 76).toString("hex"),
    nonce: buf.readUInt32LE(76),
  };
}

/** SHA256d(header) as stored — the internal (little-endian) 32-byte order. */
export function blockHashInternalHex(hex) {
  return doubleSha256(Buffer.from(hex, "hex")).toString("hex");
}

/** The display/big-endian block hash — the byte-reverse of the internal order. */
export function blockHashDisplayHex(hex) {
  return Buffer.from(doubleSha256(Buffer.from(hex, "hex")))
    .reverse()
    .toString("hex");
}

/** Decode Bitcoin compact target (nBits, a uint32) to an exact BigInt. Rejects a negative target. */
export function compactTargetToBig(nBits) {
  const exponent = nBits >>> 24;
  const mantissa = nBits & 0x007fffff;
  if (nBits & 0x00800000) throw new Error("negative_target");
  if (exponent <= 3) return BigInt(mantissa) >> BigInt(8 * (3 - exponent));
  return BigInt(mantissa) << BigInt(8 * (exponent - 3));
}

function fail(reason) {
  return { ok: false, reason };
}

/**
 * Validate a contiguous mainnet suffix rooted in an accepted-context checkpoint, and extract the
 * unique beacon at the precommitted height.
 * @returns {{ok:true, value:VerifiedBitcoinSuffix} | {ok:false, reason:string}}
 */
export function validateBitcoinMainnetSuffix(input) {
  try {
    const {
      checkpoint,
      headers,
      precommittedBeaconHeight,
      expectedNetworkProfileId,
      resourceLimits,
    } = input;
    if (expectedNetworkProfileId !== MAINNET) return fail("network_profile_mismatch");
    if (!checkpoint || checkpoint.network_profile_id !== MAINNET) return fail("checkpoint_network");
    if (!Array.isArray(headers) || headers.length < 1) return fail("empty_suffix");
    const maxHeaders = resourceLimits && resourceLimits.maxHeaders;
    const retarget = resourceLimits && resourceLimits.retargetInterval;
    if (!Number.isSafeInteger(maxHeaders) || !Number.isSafeInteger(retarget) || retarget < 1) {
      return fail("resource_limits");
    }
    if (headers.length > maxHeaders) return fail("suffix_over_ceiling");

    // The checkpoint's own hash must root the suffix (recomputed, never trusted from the field).
    const cpInternal = blockHashInternalHex(checkpoint.checkpoint_header);
    const cpDisplay = Buffer.from(cpInternal, "hex").reverse().toString("hex");
    if (cpDisplay !== checkpoint.checkpoint_block_hash) return fail("checkpoint_hash_mismatch");
    const cpHeader = decodeHeader(checkpoint.checkpoint_header);
    if (cpHeader.nBitsHex !== checkpoint.checkpoint_nbits) return fail("checkpoint_nbits_mismatch");

    const cpHeight = Number(checkpoint.checkpoint_height);
    if (!Number.isSafeInteger(cpHeight) || cpHeight < 0) return fail("checkpoint_height");
    const period = Math.floor(cpHeight / retarget);

    let prevInternal = cpInternal;
    for (let i = 0; i < headers.length; i++) {
      const h = decodeHeader(headers[i]); // throws -> caught -> fail("exception")
      if (h.prevBlockInternalHex !== prevInternal) return fail("linkage");
      // same difficulty period: no boundary crossing and no mid-period difficulty change.
      const height = cpHeight + 1 + i;
      if (Math.floor(height / retarget) !== period) return fail("period_boundary");
      if (h.nBits !== cpHeader.nBits) return fail("nbits_changed_in_period");
      const target = compactTargetToBig(h.nBits);
      if (target <= 0n || target > POW_LIMIT) return fail("target_out_of_range");
      const hashNum = BigInt("0x" + blockHashDisplayHex(headers[i]));
      if (hashNum > target) return fail("insufficient_pow");
      prevInternal = blockHashInternalHex(headers[i]);
    }

    const finalSuffixHeight = cpHeight + headers.length;
    const beaconHeight = Number(precommittedBeaconHeight);
    if (!Number.isSafeInteger(beaconHeight)) return fail("beacon_height");
    const idx = beaconHeight - cpHeight - 1;
    if (idx < 0 || idx >= headers.length) return fail("beacon_height_out_of_range");

    return {
      ok: true,
      value: Object.freeze({
        checkpointBlockHash: cpDisplay,
        beaconValue: blockHashInternalHex(headers[idx]),
        beaconHeight,
        finalSuffixHeight,
        validatedHeaderCount: headers.length,
        networkProfileId: MAINNET,
      }),
    };
  } catch {
    return fail("exception");
  }
}
