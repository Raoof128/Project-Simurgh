// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic canonical JSON + hashing for Stage 3M attestation. Pure, no I/O.
import crypto from "node:crypto";

function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalise(value[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalise(value));
}

export function sha256Hex(input) {
  return "sha256:" + crypto.createHash("sha256").update(input).digest("hex");
}

// Raw 32-byte digest (Stage 5L needs the bytes for the RFC-3161 messageImprint / OTS leaf binding).
export function sha256Bytes(input) {
  return crypto.createHash("sha256").update(input).digest();
}

export function fingerprintPublicKey(pubKeyPem) {
  const der = crypto.createPublicKey(pubKeyPem).export({ type: "spki", format: "der" });
  return sha256Hex(der);
}
