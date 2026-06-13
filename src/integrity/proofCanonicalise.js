// SPDX-License-Identifier: AGPL-3.0-or-later
// Canonical JSON serialiser for Stage 2 integrity proofs.
//
// Rules:
//   1. Top-level `signature` is removed (nested `signature` keys are preserved).
//   2. Object keys are sorted lexicographically by UTF-16 code-unit value at every depth.
//   3. Arrays preserve insertion order.
//   4. Output contains no whitespace.
//   5. Output is UTF-8 (string is returned; caller encodes if needed).
//
// The Swift implementation in tools/simurgh-node-macos/ must produce
// byte-identical output for the same logical input. Locked by the
// golden-fixture interop test.

function encodePrimitive(v) {
  return JSON.stringify(v);
}

function encodeValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return encodePrimitive(value);
  if (Array.isArray(value)) {
    return "[" + value.map(encodeValue).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + encodeValue(value[k]));
  return "{" + parts.join(",") + "}";
}

export function canonicaliseProofPayload(proof) {
  if (proof === null || typeof proof !== "object" || Array.isArray(proof)) {
    throw new Error("canonicaliseProofPayload: input must be a plain object");
  }
  const copy = { ...proof };
  delete copy.signature;
  return encodeValue(copy);
}
