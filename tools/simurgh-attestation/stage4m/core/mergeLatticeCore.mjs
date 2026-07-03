// SPDX-License-Identifier: AGPL-3.0-or-later
import { DIGEST_RE, recordDigest } from "./canonical.mjs";
import {
  MERGE_BASIS_ENUM,
  RAW_IDENTITY_DENYLIST,
  VXD_MERGE_EVENT_SCHEMA,
  VXD_WINDOW_SCHEMA,
} from "../constants.mjs";

const fail = (reason, detail) => ({ ok: false, rawCode: 43, reason, detail: detail ?? null });

function rawIdentityKey(obj) {
  for (const k of Object.keys(obj)) {
    if (RAW_IDENTITY_DENYLIST.includes(k.toLowerCase())) return k;
  }
  return null;
}

const WINDOW_FIELDS = [
  "clusters",
  "graph_version_digest",
  "schema",
  "source_attestation_digest",
  "window",
];
const CLUSTER_FIELDS = ["budget", "cluster_commitment", "cluster_size", "cluster_weighted_total"];
const EVENT_FIELDS = [
  "carried_cluster_commitments",
  "merges",
  "new_graph_version_digest",
  "old_graph_version_digest",
  "parent_event_digest",
  "raw_identity_exported",
  "schema",
  "sequence",
];
const MERGE_FIELDS = [
  "merge_basis",
  "merged_cluster_commitments",
  "new_budget",
  "new_cluster_commitment",
];

function exactKeys(obj, fields) {
  const keys = Object.keys(obj).sort();
  if (keys.length !== fields.length) return false;
  return keys.every((k, i) => k === fields[i]);
}

const nonNegInt = (n) => Number.isInteger(n) && n >= 0;

export function validateWindowCommitment(w) {
  if (!w || typeof w !== "object" || Array.isArray(w)) return fail("schema_invalid");
  if (rawIdentityKey(w)) return fail("raw_identity_exported", rawIdentityKey(w));
  if (!exactKeys(w, WINDOW_FIELDS)) return fail("schema_invalid", "window_fields");
  if (w.schema !== VXD_WINDOW_SCHEMA) return fail("schema_invalid", "schema");
  if (typeof w.window !== "string" || w.window.length === 0)
    return fail("schema_invalid", "window");
  if (!DIGEST_RE.test(w.source_attestation_digest)) {
    return fail("schema_invalid", "source_attestation_digest");
  }
  if (!DIGEST_RE.test(w.graph_version_digest))
    return fail("schema_invalid", "graph_version_digest");
  if (!Array.isArray(w.clusters) || w.clusters.length === 0)
    return fail("schema_invalid", "clusters");
  const seen = new Set();
  for (const c of w.clusters) {
    if (!c || typeof c !== "object" || Array.isArray(c)) return fail("schema_invalid");
    if (rawIdentityKey(c)) return fail("raw_identity_exported", rawIdentityKey(c));
    if (!exactKeys(c, CLUSTER_FIELDS)) return fail("schema_invalid", "cluster_fields");
    if (!DIGEST_RE.test(c.cluster_commitment)) return fail("schema_invalid", "cluster_commitment");
    if (
      !nonNegInt(c.cluster_weighted_total) ||
      !nonNegInt(c.budget) ||
      !nonNegInt(c.cluster_size) ||
      c.cluster_size < 1
    ) {
      return fail("schema_invalid", "cluster_numbers");
    }
    if (seen.has(c.cluster_commitment)) return fail("schema_invalid", "duplicate_cluster");
    seen.add(c.cluster_commitment);
  }
  return { ok: true };
}

function validateEventShape(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return fail("schema_invalid");
  const rk = rawIdentityKey(event);
  if (rk) return fail("raw_identity_exported", rk);
  if (!exactKeys(event, EVENT_FIELDS)) return fail("schema_invalid", "event_fields");
  if (event.schema !== VXD_MERGE_EVENT_SCHEMA) return fail("schema_invalid", "schema");
  if (event.raw_identity_exported !== false) return fail("raw_identity_exported", "flag");
  if (!Number.isInteger(event.sequence) || event.sequence < 1) {
    return fail("schema_invalid", "sequence");
  }
  if (event.parent_event_digest !== null && !DIGEST_RE.test(event.parent_event_digest)) {
    return fail("schema_invalid", "parent_event_digest");
  }
  for (const f of ["old_graph_version_digest", "new_graph_version_digest"]) {
    if (!DIGEST_RE.test(event[f])) return fail("schema_invalid", f);
  }
  if (!Array.isArray(event.merges) || event.merges.length === 0) {
    return fail("schema_invalid", "merges");
  }
  if (!Array.isArray(event.carried_cluster_commitments)) return fail("schema_invalid", "carried");
  for (const m of event.merges) {
    if (!m || typeof m !== "object" || Array.isArray(m)) return fail("schema_invalid");
    const mrk = rawIdentityKey(m);
    if (mrk) return fail("raw_identity_exported", mrk);
    if (!exactKeys(m, MERGE_FIELDS)) return fail("schema_invalid", "merge_fields");
    if (!DIGEST_RE.test(m.new_cluster_commitment)) {
      return fail("schema_invalid", "new_cluster_commitment");
    }
    if (!nonNegInt(m.new_budget)) return fail("schema_invalid", "new_budget");
    if (!Array.isArray(m.merged_cluster_commitments) || m.merged_cluster_commitments.length < 2) {
      return fail("schema_invalid", "merged_cluster_commitments");
    }
    if (!Array.isArray(m.merge_basis) || m.merge_basis.length === 0) {
      return fail("schema_invalid", "merge_basis");
    }
    for (const b of m.merge_basis) {
      if (!MERGE_BASIS_ENUM.includes(b)) return fail("invalid_merge_basis", b);
    }
  }
  return { ok: true };
}

// Walks the chain from genesis. Coarsening-only: every old commitment lands in exactly one
// new bucket (spec §2 image function is total and single-valued; `imageMap` IS the spec's
// `image_i` for one epoch). Budget non-inflation (spec §2) is enforced HERE at event-validation
// time, using the budget state threaded from genesis — so an inflationary merge is a raw-43
// invalid EVENT regardless of which windows exist (fixes the "zero-window bypass").
// `genesis = { graphVersionDigest, clusters: string[], budgets: { [commitment]: number } }`.
export function validateMergeChain(events, genesis) {
  if (!Array.isArray(events)) throw new Error("events_must_be_array");
  let clusters = [...genesis.clusters];
  let budgetByCluster = new Map(Object.entries(genesis.budgets));
  let expectedOldGraph = genesis.graphVersionDigest;
  let expectedParent = null;
  let expectedSequence = 1;
  const epochs = [];
  for (const event of events) {
    const shape = validateEventShape(event);
    if (!shape.ok) return shape;
    if (event.parent_event_digest !== expectedParent) return fail("parent_digest_mismatch");
    if (event.sequence !== expectedSequence) return fail("sequence_gap");
    if (event.old_graph_version_digest !== expectedOldGraph) return fail("graph_version_mismatch");
    const oldSet = new Set(clusters);
    const claimed = new Set();
    const imageMap = new Map();
    const mergedBudgets = new Map();
    const nextBudgets = new Map();
    const newClusters = [];
    for (const m of event.merges) {
      if (imageMap.has(m.new_cluster_commitment) || oldSet.has(m.new_cluster_commitment)) {
        // a new bucket id may not collide with another bucket or an old commitment
        return fail("schema_invalid", "new_cluster_collision");
      }
      for (const c of m.merged_cluster_commitments) {
        if (!oldSet.has(c)) return fail("unknown_old_cluster", c);
        if (claimed.has(c)) {
          // same old commitment in two buckets = the partition splits, not coarsens
          return fail(
            event.merges.filter((x) => x.merged_cluster_commitments.includes(c)).length > 1
              ? "non_coarsening_split"
              : "duplicate_old_cluster",
            c
          );
        }
        claimed.add(c);
        imageMap.set(c, m.new_cluster_commitment);
      }
      // Budget non-inflation: the merged bucket may not exceed ANY constituent's budget.
      const minConstituentBudget = Math.min(
        ...m.merged_cluster_commitments.map((c) => budgetByCluster.get(c))
      );
      if (m.new_budget > minConstituentBudget) {
        return fail("budget_inflation", m.new_cluster_commitment);
      }
      mergedBudgets.set(m.new_cluster_commitment, m.new_budget);
      nextBudgets.set(m.new_cluster_commitment, m.new_budget);
      newClusters.push(m.new_cluster_commitment);
    }
    for (const c of event.carried_cluster_commitments) {
      if (!oldSet.has(c)) return fail("unknown_old_cluster", c);
      if (claimed.has(c)) return fail("duplicate_old_cluster", c);
      claimed.add(c);
      imageMap.set(c, c);
      nextBudgets.set(c, budgetByCluster.get(c));
      newClusters.push(c);
    }
    if (claimed.size !== oldSet.size) {
      const missing = clusters.find((c) => !claimed.has(c));
      return fail("omitted_old_cluster", missing);
    }
    const eventDigest = recordDigest(event);
    epochs.push({
      event,
      eventDigest,
      imageMap,
      clusters: newClusters,
      mergedBudgets,
      budgets: nextBudgets,
    });
    clusters = newClusters;
    budgetByCluster = nextBudgets;
    expectedOldGraph = event.new_graph_version_digest;
    expectedParent = eventDigest;
    expectedSequence += 1;
  }
  return { ok: true, epochs };
}
