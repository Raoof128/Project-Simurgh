// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.1/§2.2 — the canonical principal.
//
// This module is defined by what it REFUSES. It does not lowercase emails, trim identifiers, apply
// Unicode normalisation, collapse aliases, infer company equivalence, treat an email domain as an
// organisation, or derive a person from an account name. Every one of those is a RESOLVER PROFILE
// decision, pinned in that profile — never a hidden default here.
//
// Principal equality is exact equality of all four validated fields. No fuzzy matching, no
// "close enough, probably Alice". That road ends in identity soup.
//
// B11 boundary: this file may HASH bytes it is handed (deterministic computation), but performs no
// I/O, no clock read, and no crypto TRUST decision — signature and trust-root evaluation are
// adapter work under stage5p/node/.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";

export const PRINCIPAL_TYPE = "simurgh.vsi.principal.v1";
export const PRINCIPAL_KINDS = Object.freeze(["account", "person", "organisation", "service"]);
export const SUBJECT_DOMAIN = "simurgh.vsi.subject.v1";

// Exact key set, in the order §2.1 freezes them. Canonical bytes are produced by canonicalJson,
// which sorts keys, so insertion order never reaches the digest.
const PRINCIPAL_KEYS = Object.freeze(["type", "kind", "namespace_id", "subject_id"]);

// Lowercase ASCII identifier. Deliberately narrow: uppercase, whitespace and any non-ASCII byte are
// rejected rather than folded, because folding IS the laundering this stage exists to refuse.
const NAMESPACE_RE = /^[a-z0-9][a-z0-9._-]*$/;
// BARE 64-hex. NOT the `sha256:<hex>` token shape used elsewhere in this repo — Stage 5O's
// prefixed-token codec was a conformance defect against a frozen bare-hex rule, and 5P does not
// reopen it. A prefixed value is rejected, never stripped.
const SUBJECT_ID_RE = /^[0-9a-f]{64}$/;

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

export function isCanonicalNamespaceId(value) {
  return typeof value === "string" && NAMESPACE_RE.test(value);
}

/**
 * Validate an exact-key principal object. Throws on anything that is not already canonical — it is
 * a gate, not a parser, and it never repairs its input.
 */
export function makePrincipal(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("principal: expected a plain object with exactly the four canonical keys");
  }
  if (!isPlainObject(value)) {
    throw new TypeError("principal: expected a plain object (class instances are not principals)");
  }
  // Own enumerable keys only — an inherited field is invisible, so a prototype cannot smuggle one in.
  for (const key of Object.keys(value)) {
    if (!PRINCIPAL_KEYS.includes(key)) throw new TypeError(`principal: unknown key "${key}"`);
  }
  for (const key of PRINCIPAL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`principal: missing key "${key}"`);
    }
  }
  if (value.type !== PRINCIPAL_TYPE) {
    throw new TypeError(`principal: type must be exactly "${PRINCIPAL_TYPE}"`);
  }
  if (!PRINCIPAL_KINDS.includes(value.kind)) {
    throw new TypeError(`principal: kind must be one of ${PRINCIPAL_KINDS.join(", ")}`);
  }
  if (!isCanonicalNamespaceId(value.namespace_id)) {
    throw new TypeError("principal: namespace_id must be a lowercase ASCII canonical identifier");
  }
  if (typeof value.subject_id !== "string" || !SUBJECT_ID_RE.test(value.subject_id)) {
    throw new TypeError("principal: subject_id must be exactly 64 lowercase hex characters");
  }
  return Object.freeze({
    type: value.type,
    kind: value.kind,
    namespace_id: value.namespace_id,
    subject_id: value.subject_id,
  });
}

/** Canonical bytes of a validated principal — the sort key and the digest preimage. */
export function principalCanonicalBytes(principal) {
  return Buffer.from(canonicalJson(makePrincipal(principal)), "utf8");
}

/** Exact equality over all four canonical fields. */
export function principalsEqual(a, b) {
  return PRINCIPAL_KEYS.every((k) => makePrincipal(a)[k] === makePrincipal(b)[k]);
}

/**
 * subject_id = SHA256( UTF8(SUBJECT_DOMAIN) || 0x00 || UTF8(namespace_id) || 0x00 || bytes )
 *
 * BYTES ONLY. A string is rejected at the boundary: accepting one would silently make UTF-8
 * encoding part of this core's undocumented resolver policy. The resolver profile decides how a
 * real-world identifier becomes canonical subject bytes; this function hashes exactly what it is
 * handed. Returns BARE lowercase hex — no `sha256:` prefix.
 */
export function deriveSubjectId(namespaceId, canonicalSubjectBytes) {
  if (!isCanonicalNamespaceId(namespaceId)) {
    throw new TypeError(
      "deriveSubjectId: namespace_id must be a lowercase ASCII canonical identifier"
    );
  }
  if (!(canonicalSubjectBytes instanceof Uint8Array)) {
    throw new TypeError(
      "deriveSubjectId: canonical subject must be bytes (Buffer or Uint8Array), never a string — " +
        "text-to-bytes encoding is a resolver-profile decision"
    );
  }
  const NUL = Buffer.from([0x00]);
  return createHash("sha256")
    .update(Buffer.from(SUBJECT_DOMAIN, "utf8"))
    .update(NUL)
    .update(Buffer.from(namespaceId, "utf8"))
    .update(NUL)
    .update(Buffer.from(canonicalSubjectBytes))
    .digest("hex");
}
