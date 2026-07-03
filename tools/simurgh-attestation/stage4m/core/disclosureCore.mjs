// SPDX-License-Identifier: AGPL-3.0-or-later
// Bundle chain + disclosure-claim binding (spec §4.3). Ordering is chain position, never
// wall-clock. Chain positions are NEVER trusted from claim JSON — every (digest, position)
// pair is checked against the reconstructed chain.
import { DIGEST_RE, recordDigest } from "./canonical.mjs";
import {
  CHAIN_KINDS,
  CLAIM_KINDS,
  VXD_CHAIN_SCHEMA,
  VXD_DISCLOSURE_SCHEMA,
} from "../constants.mjs";

const fail = (reason) => ({ ok: false, rawCode: 45, reason });

export function buildChain(entries) {
  for (const e of entries) {
    if (!CHAIN_KINDS.includes(e.kind)) throw new Error(`chain_kind_invalid: ${e.kind}`);
    if (!DIGEST_RE.test(e.digest)) throw new Error(`chain_digest_invalid: ${e.digest}`);
  }
  return {
    schema: VXD_CHAIN_SCHEMA,
    entries: entries.map((e, position) => ({ position, kind: e.kind, digest: e.digest })),
  };
}

export const chainDigest = (chain) => recordDigest(chain);

const DISCLOSURE_FIELDS = [
  "chain_position",
  "claims",
  "demand_side_evidence_digest",
  "prose_history_digest",
  "schema",
];
const CLAIM_FIELDS = ["bound_commitments", "kind", "value"];

function chainEntryAt(chain, position) {
  const e = chain.entries[position];
  return e && e.position === position ? e : null;
}

// Frozen closed-world recomputation rules — one per claim kind (spec §4.3).
function recompute(kind, boundRecords) {
  const windows = boundRecords.filter((r) => r.schema === "simurgh.vxd.window_commitment.v1");
  const rescores = boundRecords.filter((r) => r.schema === "simurgh.vxd.retro_rescore.v1");
  switch (kind) {
    case "breach_count": {
      const distinct = new Set(rescores.flatMap((r) => r.breached_after));
      return distinct.size;
    }
    case "cluster_count":
      return windows.reduce((s, w) => s + w.clusters.length, 0);
    case "consumer_count":
      return windows.reduce((s, w) => s + w.clusters.reduce((t, c) => t + c.cluster_size, 0), 0);
    case "exposure_total":
      return windows.reduce(
        (s, w) => s + w.clusters.reduce((t, c) => t + c.cluster_weighted_total, 0),
        0
      );
    case "window_range": {
      const ws = windows.map((w) => w.window).sort();
      return [ws[0], ws[ws.length - 1]];
    }
    default:
      return undefined; // unreachable — kind gated before recompute
  }
}

// tier "a" (default) recomputes every claim value from the bound ledger records; tier "p"
// (public) verifies only chain ordering + (digest, position) consistency, because the ledger
// records are absent from a Tier-P bundle by design (spec §4.0).
export function verifyDisclosure({ disclosure, chain, recordsByDigest, tier = "a" }) {
  const d = disclosure;
  if (!d || typeof d !== "object" || Array.isArray(d)) return fail("schema_invalid");
  const keys = Object.keys(d).sort();
  if (
    keys.length !== DISCLOSURE_FIELDS.length ||
    !keys.every((k, i) => k === DISCLOSURE_FIELDS[i])
  ) {
    return fail("schema_invalid");
  }
  if (d.schema !== VXD_DISCLOSURE_SCHEMA) return fail("schema_invalid");
  if (!Number.isInteger(d.chain_position) || d.chain_position < 0) return fail("schema_invalid");
  if (!DIGEST_RE.test(d.prose_history_digest)) return fail("schema_invalid");
  if (d.demand_side_evidence_digest !== null) return fail("pincer_slot_not_null");
  if (!Array.isArray(d.claims) || d.claims.length === 0) return fail("schema_invalid");

  // The disclosure must actually SIT at its declared chain position.
  const own = chainEntryAt(chain, d.chain_position);
  if (!own || own.kind !== "disclosure_claim" || own.digest !== recordDigest(d)) {
    return fail("commitment_sequenced_after_disclosure");
  }

  for (const claim of d.claims) {
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) return fail("schema_invalid");
    const ck = Object.keys(claim).sort();
    if (ck.length !== CLAIM_FIELDS.length || !ck.every((k, i) => k === CLAIM_FIELDS[i])) {
      return fail("schema_invalid");
    }
    if (!CLAIM_KINDS.includes(claim.kind)) return fail("unknown_claim_kind");
    if (!Array.isArray(claim.bound_commitments) || claim.bound_commitments.length === 0) {
      return fail("schema_invalid");
    }
    const boundRecords = [];
    for (const b of claim.bound_commitments) {
      if (!b || !DIGEST_RE.test(b.digest) || !Number.isInteger(b.chain_position)) {
        return fail("schema_invalid");
      }
      if (b.chain_position >= d.chain_position)
        return fail("commitment_sequenced_after_disclosure");
      const entry = chainEntryAt(chain, b.chain_position);
      if (!entry || entry.digest !== b.digest) return fail("commitment_sequenced_after_disclosure");
      if (tier === "a") {
        const record = recordsByDigest.get(b.digest);
        if (!record) return fail("commitment_sequenced_after_disclosure");
        boundRecords.push(record);
      }
    }
    // Tier P stops after chain-ordering checks — the ledger records needed to recompute the
    // claim value are not part of the public tier.
    if (tier !== "a") continue;
    const expected = recompute(claim.kind, boundRecords);
    const matches =
      claim.kind === "window_range"
        ? JSON.stringify(claim.value) === JSON.stringify(expected)
        : claim.value === expected;
    if (!matches) return fail("claim_recompute_mismatch");
  }
  return { ok: true };
}
