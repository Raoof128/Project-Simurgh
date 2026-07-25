// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.5 — the delegation edge. STRUCTURE ONLY.
//
// A3 ruled that a delegation proves a RELATIONSHIP between two principals and never that they are
// the same principal: it does not establish principal equality and does not authorise vector
// joining. Neither principal inherits the other's identity-strength components. This module
// therefore validates and canonicalises the edge and stops there — it exports nothing that could
// evaluate authority-to-act, and a test enforces that boundary by scanning the module surface.
//
// Epochs are LOGICAL recorded epochs as canonical unsigned decimal strings, never wall-clock
// timestamps and never JSON numbers (a JSON number would drag float semantics into an identity
// decision). Comparison is numeric, because "9" > "10" lexicographically.
//
// The identifier is derived EXTERNALLY: there is no self-referential edge_id inside the object that
// gets signed.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { makePrincipal, principalsEqual, isCanonicalNamespaceId } from "./canonicalPrincipal.mjs";

export const DELEGATION_EDGE_TYPE = "simurgh.vsi.delegation_edge.v1";
export const LOGICAL_VALIDITY_TYPE = "simurgh.vsi.logical-validity.v1";
// Single-hat (§2.5): the digest DOMAIN differs from the schema type literal on purpose, so neither
// can be pasted where the other belongs.
export const DELEGATION_EDGE_DOMAIN = "simurgh.vsi.delegation-edge.v1";

const EDGE_KEYS = Object.freeze([
  "type",
  "actor_principal",
  "represented_principal",
  "role_id",
  "scope_id",
  "validity",
]);
const VALIDITY_KEYS = Object.freeze(["type", "not_before_epoch", "not_after_epoch"]);

// Canonical unsigned decimal: "0", or a non-zero leading digit followed by digits. No sign, no
// exponent, no fraction, no whitespace, no leading zeroes.
const EPOCH_RE = /^(0|[1-9][0-9]*)$/;

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

function validateValidity(validity) {
  if (!isPlainObject(validity)) throw new TypeError("delegation edge: validity must be an object");
  for (const k of Object.keys(validity)) {
    if (!VALIDITY_KEYS.includes(k))
      throw new TypeError(`delegation edge: validity unknown key "${k}"`);
  }
  for (const k of VALIDITY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(validity, k)) {
      throw new TypeError(`delegation edge: validity missing key "${k}"`);
    }
  }
  if (validity.type !== LOGICAL_VALIDITY_TYPE) {
    throw new TypeError(
      `delegation edge: validity type must be exactly "${LOGICAL_VALIDITY_TYPE}"`
    );
  }
  for (const k of ["not_before_epoch", "not_after_epoch"]) {
    const v = validity[k];
    if (typeof v !== "string" || !EPOCH_RE.test(v)) {
      throw new TypeError(
        `delegation edge: ${k} must be a canonical unsigned decimal string ` +
          '(no JSON number, no leading zero except "0", no sign, no exponent)'
      );
    }
  }
  // Numeric comparison — a lexicographic compare would reject the valid pair ("9", "10").
  if (BigInt(validity.not_before_epoch) > BigInt(validity.not_after_epoch)) {
    throw new TypeError(
      "delegation edge: bounds must be ordered — not_before_epoch <= not_after_epoch"
    );
  }
  return Object.freeze({
    type: validity.type,
    not_before_epoch: validity.not_before_epoch,
    not_after_epoch: validity.not_after_epoch,
  });
}

export function makeDelegationEdge(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(
      "delegation edge: expected a plain object with exactly the six canonical keys"
    );
  }
  for (const key of Object.keys(value)) {
    if (!EDGE_KEYS.includes(key)) throw new TypeError(`delegation edge: unknown key "${key}"`);
  }
  for (const key of EDGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`delegation edge: missing key "${key}"`);
    }
  }
  if (value.type !== DELEGATION_EDGE_TYPE) {
    throw new TypeError(`delegation edge: type must be exactly "${DELEGATION_EDGE_TYPE}"`);
  }
  const actor = makePrincipal(value.actor_principal);
  const represented = makePrincipal(value.represented_principal);
  if (principalsEqual(actor, represented)) {
    throw new TypeError("delegation edge: actor_principal and represented_principal must differ");
  }
  if (!isCanonicalNamespaceId(value.role_id)) {
    throw new TypeError(
      "delegation edge: role_id must be a pinned canonical identifier, never free text"
    );
  }
  if (!isCanonicalNamespaceId(value.scope_id)) {
    throw new TypeError(
      "delegation edge: scope_id must be a pinned canonical identifier, never free text"
    );
  }
  return Object.freeze({
    type: value.type,
    actor_principal: actor,
    represented_principal: represented,
    role_id: value.role_id,
    scope_id: value.scope_id,
    validity: validateValidity(value.validity),
  });
}

export function delegationEdgeCanonicalBytes(edge) {
  return Buffer.from(canonicalJson(makeDelegationEdge(edge)), "utf8");
}

/** delegation_edge_id = SHA256( DOMAIN || 0x00 || canonical_json(edge) ) — derived, never stored. */
export function delegationEdgeId(edge) {
  return createHash("sha256")
    .update(Buffer.from(DELEGATION_EDGE_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(delegationEdgeCanonicalBytes(edge))
    .digest("hex");
}
