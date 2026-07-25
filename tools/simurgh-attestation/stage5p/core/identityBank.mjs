// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.6 — the identity bank.
//
// A SORTED EXACT-KEY ARRAY, never an object keyed by a formatted principal string: string keys
// would make canonical bytes hostage to key ordering and to whatever formatting produced them.
//
// Three properties carry the stage:
//   Law 7 atomicity — a failed attachment returns the ORIGINAL bank object; nothing is mutated, so
//                     "byte-identical after failure" is structural rather than a promise.
//   Law 4 delta     — a resolver may raise an axis only within prior JOIN ceiling, and attaching
//                     never lowers an axis another resolver already established.
//   no pooling      — evidence is banked against exactly one canonical principal.
//
// Strength is VERIFIER-DERIVED. `asserted_strength_delta` is what a producer claims; what gets
// banked is what the profile's ceiling permits, and the two are never conflated.
import { canonicalJson } from "../../canonicalise.mjs";
import { makeStrength, leqV, joinV } from "./identityLattice.mjs";
import { makePrincipal, principalsEqual, principalCanonicalBytes } from "./canonicalPrincipal.mjs";
import { makeResolverProfile } from "./resolverProfile.mjs";
import { makeResolverEvidence } from "./resolverEvidence.mjs";
import { makeDelegationEdge, delegationEdgeId } from "./delegationEdge.mjs";

export const IDENTITY_BANK_TYPE = "simurgh.vsi.identity_bank.v1";

const FLOOR = Object.freeze({
  binding: "unbound",
  resolution: "unresolved",
  continuity: "ephemeral",
  role: "unproven",
});

const fail = (reason) => ({ ok: false, reason });

export function emptyBank() {
  return Object.freeze({
    type: IDENTITY_BANK_TYPE,
    principals: Object.freeze([]),
    delegation_edges: Object.freeze([]),
  });
}

/** Canonical bytes of the whole bank — the object every atomicity assertion compares. */
export function bankCanonicalBytes(bank) {
  return Buffer.from(canonicalJson(bank), "utf8");
}

const byPrincipalBytes = (a, b) =>
  Buffer.compare(principalCanonicalBytes(a.principal), principalCanonicalBytes(b.principal));

/**
 * Attach one resolver evidence envelope.
 *
 * Returns {ok:true, bank} or {ok:false, reason}. On failure the ORIGINAL bank is left untouched —
 * no partial axis update, no harvested digest, no "safe-looking" axis salvaged from rejected
 * evidence. That is Law 7's atomicity, and it holds structurally because nothing mutates until the
 * decision is final.
 */
export function attachEvidence(bank, evidence, profile) {
  const e = makeResolverEvidence(evidence);
  const p = makeResolverProfile(profile);

  if (e.profile_id !== p.profile_id)
    return fail("evidence profile_id does not match the supplied profile");
  if (!("principal" in e.claim)) return fail("attachEvidence expects a principal claim");
  if (!p.permitted_claim_types.includes("principal"))
    return fail("profile does not permit principal claims");

  const principal = makePrincipal(e.claim.principal);

  // A profile may only speak about identity universes it actually maps.
  const mapped = Object.values(p.namespace_map);
  if (!mapped.includes(principal.namespace_id)) {
    return fail(`profile does not map namespace "${principal.namespace_id}"`);
  }

  const existing = bank.principals.find((entry) => principalsEqual(entry.principal, principal));
  const prior = existing ? makeStrength(existing.strength) : makeStrength(FLOOR);
  const asserted = makeStrength(e.asserted_strength_delta);

  // Law 4: the ceiling bounds the DELTA. The permitted result is prior ⊔ ceiling; an assertion that
  // exceeds it is REJECTED, never silently clamped — clamping would let a producer probe the
  // ceiling for free and would bank a number nobody asked for.
  const permitted = joinV(prior, p.ceiling);
  if (!leqV(asserted, permitted)) {
    return fail(`asserted strength exceeds what the profile ceiling permits (Law 4 delta bound)`);
  }

  // Never lowers: the banked result is the join of what was already proved and what is asserted.
  const next = joinV(prior, asserted);
  if (!leqV(prior, next)) return fail("internal: attachment would lower an established axis");

  const digests = new Set(existing ? existing.supporting_evidence_digests : []);
  digests.add(e.evidence_digest);

  const entry = Object.freeze({
    principal,
    strength: next,
    supporting_evidence_digests: Object.freeze([...digests].sort()),
  });

  const principals = bank.principals
    .filter((x) => !principalsEqual(x.principal, principal))
    .concat([entry])
    .sort(byPrincipalBytes);

  return {
    ok: true,
    bank: Object.freeze({
      type: IDENTITY_BANK_TYPE,
      principals: Object.freeze(principals),
      delegation_edges: bank.delegation_edges,
    }),
  };
}

/**
 * Attach a delegation edge. A3: an edge is a relationship, never an equality, and it transfers NO
 * identity-strength axis — so this function provably cannot touch `principals`, which it copies by
 * reference.
 */
export function attachDelegationEdge(bank, edge) {
  const validated = makeDelegationEdge(edge);
  const id = delegationEdgeId(validated);
  const byId = new Map(bank.delegation_edges.map((x) => [delegationEdgeId(x), x]));
  byId.set(id, validated);
  const edges = [...byId.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, v]) => v);

  return {
    ok: true,
    bank: Object.freeze({
      type: IDENTITY_BANK_TYPE,
      principals: bank.principals, // untouched, by construction
      delegation_edges: Object.freeze(edges),
    }),
  };
}

/** Per-principal policy test (A3): accept ⇔ required ≤ᵥ actual, evaluated per principal. */
export function bankSatisfies(bank, principal, required) {
  const target = makePrincipal(principal);
  const entry = bank.principals.find((x) => principalsEqual(x.principal, target));
  if (!entry) return false;
  return leqV(makeStrength(required), makeStrength(entry.strength));
}
