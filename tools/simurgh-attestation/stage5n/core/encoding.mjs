// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — encoding kernel. Domain-separated hashing over the SHARED canonicaliser (parity with
// Node/Python/browser), the dependent-chain step, and the frozen digest contract (P0-8). Pure, no I/O.
// Digest representations are strict and non-interchangeable:
//   DigestHex   = exactly 64 lowercase hex chars (all envelope digest fields)
//   DigestBytes = strict hex-decode(DigestHex) -> exactly 32 bytes (OTS leaf / chain state)
//   DigestId    = "sha256:" + DigestHex (only inside a constructed 5M child bundle)
import crypto from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";

const NUL = Buffer.from([0]);
const STEP_DOMAIN = "simurgh.vtc_delay.step.v1";
const HEX64 = /^[0-9a-f]{64}$/;

// 8-byte big-endian iteration counter; safe-integer only (BigInt would break canonicalJson elsewhere).
export function uint64be(i) {
  if (!Number.isSafeInteger(i) || i < 0)
    throw new RangeError(`uint64be: not a safe non-negative integer: ${i}`);
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(i));
  return b;
}

// H_DS(tag, bytes) = sha256(utf8(tag) || 0x00 || bytes) -> bare DigestHex.
export function H_DS(tag, bytes) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(tag, "utf8"))
    .update(NUL)
    .update(bytes)
    .digest("hex");
}

// H_DS over the canonical-JSON bytes of an object (key-order independent via the shared canonicaliser).
export function hdsObject(tag, obj) {
  return H_DS(tag, Buffer.from(canonicalJson(obj), "utf8"));
}

// One dependent-chain step: sha256(step_domain || 0x00 || uint64be(i) || x_prev) -> raw 32-byte Buffer.
// Chain state stays bytes end-to-end; a step consumes the raw previous state, never its hex.
export function hdsStepBytes(i, xPrevBytes) {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(STEP_DOMAIN, "utf8"))
    .update(NUL)
    .update(uint64be(i))
    .update(xPrevBytes)
    .digest();
}

export function isDigestHex(s) {
  return typeof s === "string" && HEX64.test(s);
}

export function hexToBytes32(hex) {
  if (!isDigestHex(hex))
    throw new TypeError(`hexToBytes32: not a 64-char lowercase hex DigestHex (length/charset)`);
  return Buffer.from(hex, "hex");
}

export function digestId(hex) {
  if (!isDigestHex(hex)) throw new TypeError("digestId: not a DigestHex");
  return "sha256:" + hex;
}
