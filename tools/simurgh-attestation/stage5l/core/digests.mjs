// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q domain-separated digests. FROZEN construction (spec §2), distinct from 5K's prefix
// form: H_DS(tag, payload) = SHA256( UTF8(tag) || 0x00 || UTF8(canonicalJson(payload)) ). The 0x00
// separator is load-bearing for parity — JS/Python/browser must all concatenate raw bytes identically.
import { canonicalJson, sha256Hex, sha256Bytes } from "../../canonicalise.mjs";
import { DOMAINS } from "../constants.mjs";

export { canonicalJson, sha256Hex, sha256Bytes };

const SEP = Buffer.from([0x00]);

// Raw 32-byte domain-separated digest.
export function hDsBytes(tag, payload) {
  return sha256Bytes(
    Buffer.concat([Buffer.from(tag, "utf8"), SEP, Buffer.from(canonicalJson(payload), "utf8")])
  );
}

// "sha256:" + hex form of H_DS.
export function hDs(tag, payload) {
  return "sha256:" + hDsBytes(tag, payload).toString("hex");
}

// Plain canonical artifact digest (standalone artifacts — e.g. receipt_digest, checkpoint_evidence_digest).
export function artifactDigest(obj) {
  return sha256Hex(canonicalJson(obj));
}

// commitment_digest_bytes (raw 32 bytes) and its "sha256:"+hex session id — the SAME digest (P0-1).
export function commitmentDigestBytes(commitmentPayload) {
  return hDsBytes(DOMAINS.commitmentSession, commitmentPayload);
}
export function commitmentSessionId(commitmentPayload) {
  return "sha256:" + commitmentDigestBytes(commitmentPayload).toString("hex");
}
