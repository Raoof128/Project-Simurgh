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

// Strict variant for MAINTAINED verifiers (audit C-8/E-3, 31 October 2026). The canonical form above
// is not injective: an own `__proto__` member is dropped by the object rebuild, `1e400` becomes
// `null`, `-0` becomes `0`, and integers above 2^53 round. Rather than change what every frozen
// verifier computes, this variant refuses those inputs; for every input it accepts, its output is
// byte-identical to `canonicalJson`, so committed digests are unchanged.
export function canonicalJsonStrict(value) {
  const walk = (v, path) => {
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error(`canonical_json_non_finite at ${path}`);
      if (Object.is(v, -0)) throw new Error(`canonical_json_negative_zero at ${path}`);
      if (Number.isInteger(v) && !Number.isSafeInteger(v))
        throw new Error(`canonical_json_unsafe_integer at ${path}`);
      return;
    }
    if (Array.isArray(v)) return v.forEach((item, i) => walk(item, `${path}[${i}]`));
    if (v && typeof v === "object") {
      for (const key of Object.keys(v)) {
        if (key === "__proto__") throw new Error(`canonical_json_forbidden_key at ${path}`);
        walk(v[key], `${path}.${key}`);
      }
    }
  };
  walk(value, "$");
  return canonicalJson(value);
}

// JSON.parse keeps the LAST of duplicate keys; a first-wins reader sees a different document under
// the same signature. The raw text is scanned before parsing so a bundle with duplicate keys at any
// depth is refused outright.
export function assertNoDuplicateKeys(text) {
  const s = String(text);
  const stack = [];
  let i = 0;
  const readString = () => {
    let out = "";
    i += 1; // opening quote
    while (i < s.length) {
      const c = s[i];
      if (c === "\\") {
        out += s[i] + s[i + 1];
        i += 2;
        continue;
      }
      if (c === '"') {
        i += 1;
        return out;
      }
      out += c;
      i += 1;
    }
    throw new Error("json_unterminated_string");
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "{") {
      stack.push({ keys: new Set(), expectKey: true });
      i += 1;
    } else if (c === "[") {
      stack.push(null);
      i += 1;
    } else if (c === "}" || c === "]") {
      stack.pop();
      i += 1;
    } else if (c === '"') {
      const top = stack[stack.length - 1];
      const str = readString();
      if (top && top.expectKey) {
        if (top.keys.has(str)) throw new Error(`json_duplicate_key:${str.slice(0, 64)}`);
        top.keys.add(str);
        top.expectKey = false;
      }
    } else if (c === ",") {
      const top = stack[stack.length - 1];
      if (top) top.expectKey = true;
      i += 1;
    } else {
      i += 1;
    }
  }
  return true;
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
