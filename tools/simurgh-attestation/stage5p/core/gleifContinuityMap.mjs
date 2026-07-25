// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane C1 — the `gleif.lei.v1` registry-continuity map.
//
// GLEIF's Legal Entity Identifier system publishes, as global public infrastructure, exactly the
// vocabulary this stage's continuity axis needs. This module is the PURE half: the mapping from a
// registry status pair to what the profile may assert. No I/O, no clock, no network (B11) — the
// capture loader lives in node/laneC1Gleif.mjs and hands facts in.
//
// THE CAPTURE'S DISCOVERY, which the design had not separated: `entity.status` and
// `registration.status` are INDEPENDENT sub-signals. Lehman Brothers Limited is entity-ACTIVE (in
// liquidation, the legal person still exists) with a LAPSED registration (nobody renewed it).
// Reading either status alone gets the answer wrong in a way that matters:
//
//   entity alone       -> "ACTIVE, so durable"     — wrong, the binding decayed
//   registration alone -> "LAPSED, so ceased"      — wrong, the entity is alive
//
// So the map is keyed on the PAIR, and unobserved pairs are REJECTED rather than interpolated.

export const GLEIF_PROFILE_ID = "gleif.lei.v1";
// SINGLE HAT. The spec named BOTH the profile and the identity namespace "gleif.lei.v1", and §2s
// frozen rule forbids that collision — a digest domain or namespace must never share a string with
// a schema/profile identifier, or a value in one role can be replayed into the other. The
// implementation caught the conflation the prose had not noticed; the namespace takes the distinct
// identifier and the profile keeps the name the spec heading gave it.
export const GLEIF_NAMESPACE = "gleif.lei.subject.v1";

/**
 * What a company registry can and cannot speak to.
 *
 * It resolves an organisation and can testify to that organisation's continuity over time. It has
 * ZERO standing on `binding` (it holds no key material) and ZERO on `role` (it does not say who may
 * act for the entity — that is the vLEI OOR path, which is Lane C2 and unreachable today).
 */
export const GLEIF_CEILING = Object.freeze({
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "durable",
  role: "unproven",
});

/**
 * The three pairs the frozen capture actually contains. Deliberately NOT a complete GLEIF status
 * table: the registry also publishes PENDING_TRANSFER, PENDING_ARCHIVAL, MERGED, ANNULLED,
 * DUPLICATE and others. Mapping states nobody has captured would be guessing an equivalence, which
 * Lane C condition 7 forbids — so anything else fails closed and says so.
 */
export const GLEIF_PAIR_MAP = new Map([
  [
    "ACTIVE|ISSUED",
    Object.freeze({
      continuity: "durable",
      principal_lifecycle: "active",
      record_still_resolvable: true,
      reading: "principal exists; binding current",
    }),
  ],
  [
    "ACTIVE|LAPSED",
    Object.freeze({
      continuity: "ephemeral",
      principal_lifecycle: "active",
      record_still_resolvable: true,
      // Decay WITHOUT principal death. The entity did not stop existing; nobody renewed its
      // registration. Collapsing this into cessation would libel a going concern.
      reading: "principal exists; binding decayed",
    }),
  ],
  [
    "INACTIVE|RETIRED",
    Object.freeze({
      continuity: "ephemeral",
      principal_lifecycle: "ceased",
      // Retired records STAY PUBLISHED. That is Law 5 — expiry is not erasure — as GLEIF's own
      // operating practice rather than as an assumption this stage had to make.
      record_still_resolvable: true,
      reading: "principal ceased; record still published",
    }),
  ],
]);

/**
 * @returns {{ continuity, principal_lifecycle, record_still_resolvable, reading }}
 * @throws on any pair the capture did not observe — never an interpolated answer.
 */
export function mapRegistryPair(entityStatus, registrationStatus) {
  const key = `${entityStatus}|${registrationStatus}`;
  const mapped = GLEIF_PAIR_MAP.get(key);
  if (!mapped) {
    throw new TypeError(
      `gleif.lei.v1: unmapped registry pair "${key}" — the profile maps only pairs present in the ` +
        "frozen capture, and guessing the continuity of an unobserved state is exactly the " +
        "equivalence Lane C condition 7 forbids"
    );
  }
  return mapped;
}

/** The strength a record supports, bounded by the ceiling on every axis the registry cannot speak to. */
export function gleifStrengthFor(entityStatus, registrationStatus) {
  const { continuity } = mapRegistryPair(entityStatus, registrationStatus);
  return Object.freeze({
    binding: GLEIF_CEILING.binding,
    resolution: GLEIF_CEILING.resolution,
    continuity,
    role: GLEIF_CEILING.role,
  });
}
