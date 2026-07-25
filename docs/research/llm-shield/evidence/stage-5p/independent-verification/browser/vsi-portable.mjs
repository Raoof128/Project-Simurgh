// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P — the PORTABLE deterministic surface, runnable in a browser with WebCrypto.
//
// A third independent implementation of the same byte-geometry Node and Python already agree on.
// It exists so a reviewer with nothing but a browser can recompute a 5P subject id and a replay
// identity themselves, without Node, without Python, and without trusting either.
//
// SCOPE, deliberately narrow: the ORDER and the DIGESTS. No signature verification, no profile trust
// decisions, no filesystem — B11 keeps those out of any portable surface, and a browser is the last
// place a trust decision should be made.
export const AXES = Object.freeze(["binding", "resolution", "continuity", "role"]);
export const AXIS_VALUES = Object.freeze({
  binding: Object.freeze(["unbound", "cryptographically_bound"]),
  resolution: Object.freeze(["unresolved", "provider_asserted", "principal_resolved"]),
  continuity: Object.freeze(["ephemeral", "durable"]),
  role: Object.freeze(["unproven", "accountable_role_bound"]),
});
export const SUBJECT_DOMAIN = "simurgh.vsi.subject.v1";
export const REPLAY_DOMAIN = "simurgh.vsi.replay.v1";

const pos = (axis, v) => AXIS_VALUES[axis].indexOf(v);

export const leqV = (a, b) => AXES.every((ax) => pos(ax, a[ax]) <= pos(ax, b[ax]));

export function joinV(a, b) {
  const out = {};
  for (const ax of AXES) out[ax] = pos(ax, a[ax]) >= pos(ax, b[ax]) ? a[ax] : b[ax];
  return out;
}

export function compareStrength(a, b) {
  const below = leqV(a, b);
  const above = leqV(b, a);
  if (below && above) return "equal";
  if (below) return "strictly_below";
  if (above) return "strictly_above";
  return "incomparable";
}

// RFC 8785-shaped canonical JSON for the subset 5P uses. Must byte-match canonicalise.mjs.
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
}

const enc = new TextEncoder();
const NUL = new Uint8Array([0]);

function concatBytes(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256Hex(bytes) {
  // Bare hex. NEVER a prefixed `sha256:` token — that defect is kept dead across all three runtimes.
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

export async function deriveSubjectId(namespaceId, subjectBytes) {
  if (!(subjectBytes instanceof Uint8Array)) {
    throw new TypeError(
      "deriveSubjectId: canonical subject must be BYTES, never a string — " +
        "text-to-bytes encoding is a resolver-profile decision"
    );
  }
  return sha256Hex(
    concatBytes([enc.encode(SUBJECT_DOMAIN), NUL, enc.encode(namespaceId), NUL, subjectBytes])
  );
}

export async function evidenceReplayIdentity(evidence) {
  // profile_id and asserted_strength_delta EXCLUDED — that exclusion is the S2.C4 mechanism.
  return sha256Hex(
    concatBytes([
      enc.encode(REPLAY_DOMAIN),
      NUL,
      enc.encode(evidence.evidence_digest),
      NUL,
      enc.encode(evidence.submission_digest_binding),
      NUL,
      enc.encode(canonicalJson(evidence.claim)),
    ])
  );
}
