// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

function normalise(value) {
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = normalise(value[key]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalise(value));
}

export function sha256HexRaw(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function sha256Canonical(value) {
  return sha256HexRaw(Buffer.from(canonicalJson(value), "utf8"));
}

export function domainBytes(domain, payload) {
  return Buffer.concat([Buffer.from(domain, "utf8"), Buffer.from(canonicalJson(payload), "utf8")]);
}

export function publicKeyFingerprint(publicKeyPemOrKeyObject) {
  const der = crypto.createPublicKey(publicKeyPemOrKeyObject).export({ type: "spki", format: "der" });
  return sha256HexRaw(der);
}

export function isHex64(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
