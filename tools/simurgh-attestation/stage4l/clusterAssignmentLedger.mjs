// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";
import { CCB_RAW_CODES } from "../stage4h/exitCodes.mjs";
import { CCB_ASSIGNMENT_LEDGER_SCHEMA, CCB_CARDINALITY_SCHEMA } from "./constants.mjs";
import { CcbSchemaError, validateAssignment } from "./clusterCommitment.mjs";

export function buildAssignmentLedger(assignments) {
  if (!Array.isArray(assignments)) throw new CcbSchemaError("schema_invalid_assignment");
  for (const a of assignments) validateAssignment(a);
  const entries = [...assignments].sort((x, y) => {
    for (const [p, q] of [
      [x.consumer_id_digest, y.consumer_id_digest],
      [x.window, y.window],
    ]) {
      if (p < q) return -1;
      if (p > q) return 1;
    }
    return 0;
  });
  const seen = new Set();
  for (const a of entries) {
    const key = `${a.consumer_id_digest}|${a.window}`;
    if (seen.has(key)) throw new CcbSchemaError("duplicate_assignment", a.consumer_id_digest);
    seen.add(key);
  }
  return { schema: CCB_ASSIGNMENT_LEDGER_SCHEMA, entries };
}

export const assignmentLedgerDigest = (ledger) => `sha256:${sha256Canonical(ledger)}`;

// Exact bijection with the 4K exposure ledger (spec §2.2). Missing -> 40; dangling -> 42.
export function checkCompleteness(exposureLedger, assignmentLedger) {
  const exposed = new Set(exposureLedger.entries.map((e) => `${e.consumer_id_digest}|${e.window}`));
  const assigned = new Set(
    assignmentLedger.entries.map((a) => `${a.consumer_id_digest}|${a.window}`)
  );
  const missing = [...exposed]
    .filter((k) => !assigned.has(k))
    .map((k) => k.split("|")[0])
    .sort();
  if (missing.length > 0) {
    return {
      ok: false,
      rawCode: CCB_RAW_CODES.CLUSTER_COMMITMENT_MISSING,
      reason: "cluster_commitment_missing",
      offending: missing,
    };
  }
  const dangling = [...assigned]
    .filter((k) => !exposed.has(k))
    .map((k) => k.split("|")[0])
    .sort();
  if (dangling.length > 0) {
    return {
      ok: false,
      rawCode: CCB_RAW_CODES.CLUSTER_ASSIGNMENT_MISMATCH,
      reason: "cluster_assignment_mismatch",
      offending: dangling,
    };
  }
  return { ok: true, rawCode: 0, reason: null, offending: [] };
}

// The cardinality commitment (spec §3.4): evasion is not detected, it is LEDGERED.
export function computeClusterCardinality(assignmentLedger) {
  const members = new Map();
  for (const a of assignmentLedger.entries) {
    members.set(a.cluster_commitment, (members.get(a.cluster_commitment) || 0) + 1);
  }
  // Singleton slot is the load-bearing claim (spec §3.4): always present, even as 0.
  const histogram = { 1: 0 };
  for (const size of members.values()) {
    const k = String(size);
    histogram[k] = (histogram[k] || 0) + 1;
  }
  const window = assignmentLedger.entries[0]?.window ?? "";
  return {
    schema: CCB_CARDINALITY_SCHEMA,
    window,
    assignment_ledger_digest: assignmentLedgerDigest(assignmentLedger),
    histogram,
    cluster_count: members.size,
    consumer_count: assignmentLedger.entries.length,
  };
}

export const cardinalityDigest = (c) => `sha256:${sha256Canonical(c)}`;
