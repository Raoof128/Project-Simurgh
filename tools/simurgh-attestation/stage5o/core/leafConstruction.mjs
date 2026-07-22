// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §3.2 leaf/case constructions + §8's case-link. Frozen byte layout, reused by Section 8's
// opening verifier. Every hashed component has an exact encoding; the only variable-length hashed
// field (case_bytes) is u32be length-prefixed, so no delimiter is inferable.
import { createHash } from "node:crypto";

const sha256 = (b) => createHash("sha256").update(b).digest();

export const CASE_DOMAIN = "simurgh.vsc.case.v1";
export const LEAF_DOMAIN = "simurgh.vsc.leaf.v1";
// §8 (ruled 2026-07-22) — links an opened case to the PUBLIC execution-census row without revealing
// any execution content: case_link_commitment_i = SHA256(domain || case_digest_i || E[i].exec_digest).
export const EXECUTION_CASE_LINK_DOMAIN = "simurgh.vsc.execution_case_link.v1";

const u32be = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
const u64be = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(n));
  return b;
};

/** case_digest_i = SHA256(CASE_DOMAIN || u32be(len(case_bytes)) || case_bytes). caseBytes: Buffer. */
export function caseDigest(caseBytes) {
  if (!Buffer.isBuffer(caseBytes)) throw new TypeError("case_bytes_buffer");
  return sha256(
    Buffer.concat([Buffer.from(CASE_DOMAIN, "utf8"), u32be(caseBytes.length), caseBytes])
  );
}

/** leaf_value_i (= leaf_id_i) = SHA256(LEAF_DOMAIN || epoch(32) || u64be(index) || salt(32) || case_digest(32)). */
export function leafId(epochDigestRaw, index, saltRaw, caseDigestRaw) {
  if (!Buffer.isBuffer(epochDigestRaw) || epochDigestRaw.length !== 32) throw new Error("epoch32");
  if (!Buffer.isBuffer(saltRaw) || saltRaw.length !== 32) throw new Error("salt32");
  if (!Buffer.isBuffer(caseDigestRaw) || caseDigestRaw.length !== 32)
    throw new Error("case_digest32");
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError("index");
  return sha256(
    Buffer.concat([
      Buffer.from(LEAF_DOMAIN, "utf8"),
      epochDigestRaw,
      u64be(index),
      saltRaw,
      caseDigestRaw,
    ])
  );
}

/** case_link_commitment_i = SHA256(EXECUTION_CASE_LINK_DOMAIN || case_digest_i || E[i].execution_record_digest). */
export function caseLinkCommitment(caseDigestRaw, executionRecordDigestRaw) {
  if (!Buffer.isBuffer(caseDigestRaw) || caseDigestRaw.length !== 32)
    throw new Error("case_digest32");
  if (!Buffer.isBuffer(executionRecordDigestRaw) || executionRecordDigestRaw.length !== 32) {
    throw new Error("execution_record_digest32");
  }
  return sha256(
    Buffer.concat([
      Buffer.from(EXECUTION_CASE_LINK_DOMAIN, "utf8"),
      caseDigestRaw,
      executionRecordDigestRaw,
    ])
  );
}
