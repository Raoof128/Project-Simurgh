// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.10 — the resolver profile.
//
// A profile is the pinned statement of what a resolver is ALLOWED to say. It carries Law 4's
// ceiling, and the ceiling is a VECTOR: validated through the lattice's own makeStrength, so a
// scalar ceiling ("this resolver is strong") cannot be expressed at all. A resolver competent on
// continuity and incompetent on role must say so on all four axes.
//
// Normalisation policy lives HERE or nowhere: §2.2 forbids the core from folding case, trimming, or
// applying Unicode normalisation, but a profile may define such a transformation as part of its
// canonical_subject_bytes derivation — pinned, and visible to a verifier.
//
// Pure: no I/O, no clock, no crypto trust decision.
import { makeStrength } from "./identityLattice.mjs";
import { isCanonicalNamespaceId } from "./canonicalPrincipal.mjs";

export const RESOLVER_PROFILE_TYPE = "simurgh.vsi.resolver_profile.v1";
export const CLAIM_TYPES = Object.freeze(["principal", "delegation"]);

const PROFILE_KEYS = Object.freeze([
  "type",
  "profile_id",
  "trust_root_fpr",
  "permitted_claim_types",
  "ceiling",
  "namespace_map",
]);

// Bare 64-hex, same discipline as subject_id: a `sha256:`-prefixed value is REJECTED, never
// stripped. Stripping is repair, and this module is a gate.
const FPR_RE = /^[0-9a-f]{64}$/;

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

export function makeResolverProfile(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(
      "resolver profile: expected a plain object with exactly the six canonical keys"
    );
  }
  for (const key of Object.keys(value)) {
    if (!PROFILE_KEYS.includes(key)) throw new TypeError(`resolver profile: unknown key "${key}"`);
  }
  for (const key of PROFILE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new TypeError(`resolver profile: missing key "${key}"`);
    }
  }
  if (value.type !== RESOLVER_PROFILE_TYPE) {
    throw new TypeError(`resolver profile: type must be exactly "${RESOLVER_PROFILE_TYPE}"`);
  }
  if (!isCanonicalNamespaceId(value.profile_id)) {
    throw new TypeError(
      "resolver profile: profile_id must be a lowercase ASCII canonical identifier"
    );
  }
  if (typeof value.trust_root_fpr !== "string" || !FPR_RE.test(value.trust_root_fpr)) {
    throw new TypeError(
      "resolver profile: trust_root_fpr must be exactly 64 lowercase hex characters"
    );
  }

  const claims = value.permitted_claim_types;
  if (!Array.isArray(claims) || claims.length === 0) {
    throw new TypeError("resolver profile: permitted_claim_types must be a non-empty array");
  }
  if (new Set(claims).size !== claims.length) {
    throw new TypeError("resolver profile: permitted_claim_types must not contain duplicates");
  }
  for (const c of claims) {
    if (!CLAIM_TYPES.includes(c)) {
      throw new TypeError(`resolver profile: permitted_claim_types contains unknown claim "${c}"`);
    }
  }

  // Law 4's structural guard. makeStrength rejects a scalar, a partial object, an unknown axis and
  // an unknown value — so "this resolver is generally strong" is not a sentence this schema can say.
  if (!isPlainObject(value.ceiling)) {
    throw new TypeError(
      "resolver profile: ceiling must be a complete four-axis vector, not a scalar"
    );
  }
  const ceiling = makeStrength(value.ceiling);

  const map = value.namespace_map;
  if (!isPlainObject(map) || Object.keys(map).length === 0) {
    throw new TypeError("resolver profile: namespace_map must be a non-empty object");
  }
  for (const [localKey, canonical] of Object.entries(map)) {
    if (!isCanonicalNamespaceId(localKey)) {
      throw new TypeError(`resolver profile: namespace_map key "${localKey}" is not canonical`);
    }
    if (!isCanonicalNamespaceId(canonical)) {
      throw new TypeError(
        `resolver profile: namespace_map value "${canonical}" is not a canonical namespace_id`
      );
    }
    // Single-hat: a profile_id says WHICH RESOLVER SPOKE; a namespace_id says WHICH IDENTITY
    // UNIVERSE. One string may never wear both hats.
    if (canonical === value.profile_id) {
      throw new TypeError(
        `resolver profile: single-hat violation — profile_id "${value.profile_id}" is also used as a namespace_id`
      );
    }
  }

  return Object.freeze({
    type: value.type,
    profile_id: value.profile_id,
    trust_root_fpr: value.trust_root_fpr,
    permitted_claim_types: Object.freeze([...claims]),
    ceiling,
    namespace_map: Object.freeze({ ...map }),
  });
}

/** The profile's Law 4 ceiling, as a frozen four-axis vector. */
export function profileCeiling(profile) {
  return makeResolverProfile(profile).ceiling;
}

/**
 * Registry-level validation — the T10 cross-namespace-collision guard.
 *
 * Sharing a canonical namespace is how two resolvers legitimately speak about ONE principal.
 * Sharing it INCONSISTENTLY — reaching the same universe from different profile-local keys — makes
 * the namespace ambiguous, and different real subjects could be driven into one subject_id.
 */
export function makeResolverRegistry(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new TypeError("resolver registry: expected a non-empty array of profiles");
  }
  const byId = new Map();
  const localKeyByNamespace = new Map(); // canonical namespace_id -> profile-local key

  for (const raw of profiles) {
    const profile = makeResolverProfile(raw);
    if (byId.has(profile.profile_id)) {
      throw new TypeError(`resolver registry: duplicate profile_id "${profile.profile_id}"`);
    }
    byId.set(profile.profile_id, profile);

    for (const [localKey, canonical] of Object.entries(profile.namespace_map)) {
      const seen = localKeyByNamespace.get(canonical);
      if (seen === undefined) {
        localKeyByNamespace.set(canonical, localKey);
      } else if (seen !== localKey) {
        throw new TypeError(
          `resolver registry: ambiguous namespace "${canonical}" — reached from local keys ` +
            `"${seen}" and "${localKey}"; two profiles may share a namespace only from the identical key`
        );
      }
    }
  }
  return byId;
}
