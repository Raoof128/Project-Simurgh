// SPDX-License-Identifier: AGPL-3.0-or-later
import { EBA_RAW_CODES } from "../stage4h/exitCodes.mjs";
import {
  EBA_BUDGET_POLICY_SCHEMA,
  FROZEN_SIGNAL_CLASSES,
  SIGNAL_CLASS_WEIGHTS,
} from "./constants.mjs";

const failClosed = (reason) => ({ ok: false, rawCode: 29, reason, offending: [] });

// Q8. Raw 30 means EXACTLY: some bound consumer's cumulative weighted_total > declared B.
// Every other irregularity (missing budget, weight drift, schema drift) is 29 -> run-level 3.
export function checkBudgets(ledger, policy) {
  if (!policy || policy.schema !== EBA_BUDGET_POLICY_SCHEMA) {
    return failClosed("policy_schema_mismatch");
  }
  const declared = policy.class_weights || {};
  const declaredKeys = Object.keys(declared).sort();
  if (
    declaredKeys.length !== FROZEN_SIGNAL_CLASSES.length ||
    FROZEN_SIGNAL_CLASSES.some((c) => declared[c] !== SIGNAL_CLASS_WEIGHTS[c])
  ) {
    return failClosed("weights_mismatch");
  }
  if (!policy.budgets || typeof policy.budgets !== "object") {
    return failClosed("missing_budgets");
  }
  const offending = [];
  for (const entry of ledger.entries) {
    const budget = policy.budgets[entry.consumer_id_digest];
    if (!Number.isInteger(budget) || budget < 0) {
      return failClosed("missing_budget_for_consumer");
    }
    if (entry.weighted_total > budget) offending.push(entry.consumer_id_digest);
  }
  if (offending.length > 0) {
    return {
      ok: false,
      rawCode: EBA_RAW_CODES.EXTRACTION_BUDGET_EXCEEDED,
      reason: "extraction_budget_exceeded",
      offending: offending.sort(),
    };
  }
  return { ok: true, rawCode: 0, reason: null, offending: [] };
}
