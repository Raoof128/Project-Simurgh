// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — hostile-input preflight (P0-9/P0-10). External hard limits (from verifier_config, NOT the
// untrusted envelope) bound the parse; the canonical-equality gate rejects duplicate keys, non-canonical
// ordering and stray whitespace in one stroke; a recursive scan rejects prototype-pollution keys, unsafe
// integers, and depth/breadth/string blowups BEFORE the shared canonicaliser ever builds an object.
import { R } from "./result.mjs";
import { canonicalJson } from "../../canonicalise.mjs";

const PROTO_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function scan(v, limits, depth) {
  if (depth > (limits.max_depth ?? 32)) return "depth";
  if (typeof v === "number" && !Number.isSafeInteger(v)) return "unsafe_number"; // rejects floats + out-of-range
  if (typeof v === "string" && v.length > (limits.max_string ?? 131072)) return "string_too_long";
  if (Array.isArray(v)) {
    if (v.length > (limits.max_array ?? 4096)) return "array_too_long";
    for (const e of v) {
      const r = scan(e, limits, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length > (limits.max_keys ?? 512)) return "too_many_keys";
    for (const k of keys) {
      if (PROTO_KEYS.has(k)) return "proto_pollution";
      const r = scan(v[k], limits, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

// runPreflight(rawBytes, verifier_config) -> { raw:396,... } | { ok:true, envelope }
export function runPreflight(rawBytes, verifier_config) {
  const limits = verifier_config?.hard_resource_limits ?? {};
  const buf = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
  if (Number.isSafeInteger(limits.max_raw_bytes) && buf.length > limits.max_raw_bytes)
    return R(396, "delay_envelope_malformed", { detail: "raw_too_large" });
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf); // strict UTF-8
  } catch {
    return R(396, "delay_envelope_malformed", { detail: "utf8_invalid" });
  }
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return R(396, "delay_envelope_malformed", { detail: "json_invalid" });
  }
  // Canonical-equality gate: catches duplicate keys, non-canonical ordering, and whitespace in one check.
  if (text !== canonicalJson(obj))
    return R(396, "delay_envelope_malformed", { detail: "non_canonical" });
  const bad = scan(obj, limits, 0);
  if (bad) return R(396, "delay_envelope_malformed", { detail: bad });
  return { ok: true, envelope: obj };
}
