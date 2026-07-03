// SPDX-License-Identifier: AGPL-3.0-or-later
import { CCB_RAW_CODES } from "../stage4h/exitCodes.mjs";
import { FROZEN_SIGNAL_CLASSES, SIGNAL_CLASS_WEIGHTS } from "../stage4k/constants.mjs";
import { CCB_POLICY_SCHEMA } from "./constants.mjs";

const failClosed = (reason) => ({ ok: false, rawCode: 29, reason, offending: [] });

// Assumes checkCompleteness already passed: every exposure subject has exactly one assignment.
export function aggregateClusterExposure(exposureLedger, assignmentLedger) {
  const byConsumer = new Map(
    assignmentLedger.entries.map((a) => [
      `${a.consumer_id_digest}|${a.window}`,
      a.cluster_commitment,
    ])
  );
  const acc = new Map(); // commitment -> { consumer_count, cluster_weighted_total }
  for (const e of exposureLedger.entries) {
    const commitment = byConsumer.get(`${e.consumer_id_digest}|${e.window}`);
    const cur = acc.get(commitment) || { consumer_count: 0, cluster_weighted_total: 0 };
    cur.consumer_count += 1;
    cur.cluster_weighted_total += e.weighted_total;
    acc.set(commitment, cur);
  }
  return [...acc.entries()]
    .map(([cluster_commitment, v]) => ({ cluster_commitment, ...v }))
    .sort((a, b) => (a.cluster_commitment < b.cluster_commitment ? -1 : 1));
}

// Q9. Raw 41 means EXACTLY: some cluster's cumulative total > its declared B_cluster.
// Every other irregularity (schema drift, weight drift, missing budget) is 29 -> run-level 3.
export function checkClusterBudgets(clusterTotals, policy) {
  if (!policy || policy.schema !== CCB_POLICY_SCHEMA) return failClosed("policy_schema_mismatch");
  const declared = policy.class_weights || {};
  const declaredKeys = Object.keys(declared).sort();
  if (
    declaredKeys.length !== FROZEN_SIGNAL_CLASSES.length ||
    FROZEN_SIGNAL_CLASSES.some((c) => declared[c] !== SIGNAL_CLASS_WEIGHTS[c])
  ) {
    return failClosed("weights_mismatch");
  }
  if (!policy.budgets || typeof policy.budgets !== "object") return failClosed("missing_budgets");
  const offending = [];
  for (const t of clusterTotals) {
    const budget = policy.budgets[t.cluster_commitment];
    if (!Number.isInteger(budget) || budget < 0) return failClosed("missing_budget_for_cluster");
    if (t.cluster_weighted_total > budget) offending.push(t.cluster_commitment);
  }
  if (offending.length > 0) {
    return {
      ok: false,
      rawCode: CCB_RAW_CODES.CLUSTER_BUDGET_EXCEEDED,
      reason: "cluster_budget_exceeded",
      offending: offending.sort(),
    };
  }
  return { ok: true, rawCode: 0, reason: null, offending: [] };
}
