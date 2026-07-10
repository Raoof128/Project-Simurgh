// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — core evaluator (plan Task 15). Frozen first-failure order 268→279, audit-only 280,
// policy 281, wrapper/env-unavailable 282. Attestation TRUTH (raw up to 280) is separate from consumer
// POLICY (281). Receives impure replay/runner results via opts and NEVER trusts a bundle-declared
// recorded_raw. A required replay/runner that cannot be produced surfaces as 282, never as tampering.
import { checkSchema } from "./schema.mjs";
import { checkSignature } from "./signature.mjs";
import { checkChain } from "./chain.mjs";
import { checkPlan } from "./plan.mjs";
import { checkCorpus } from "./corpus.mjs";
import { checkMatrix, checkStatusUnion } from "./matrix.mjs";
import { checkApplicability } from "./applicability.mjs";
import { checkAdapter } from "./adapter.mjs";
import { checkVerdict } from "./verdict.mjs";
import { checkBootstrap } from "./bootstrap.mjs";
import { checkCompleteness, evaluatePolicy } from "./completeness.mjs";
import { checkCensus } from "./census.mjs";

export function evaluatePanel(bundle, opts = {}) {
  const {
    tier = "public",
    pinnedFingerprint,
    replayResults = {},
    runnerResults = {},
    auditPrivate,
    strict = true,
  } = opts;

  const steps = [
    () => checkSchema(bundle),
    () => checkSignature(bundle, pinnedFingerprint),
    () => checkChain(bundle),
    () => checkPlan(bundle),
    () => checkCorpus(bundle),
    () => checkMatrix(bundle),
    () => checkStatusUnion(bundle),
    () => checkApplicability(bundle, replayResults),
    () => checkAdapter(bundle, replayResults),
    () => checkVerdict(bundle),
    () => checkBootstrap(bundle, runnerResults),
    () => checkCompleteness(bundle),
  ];

  const base = {
    tier,
    bootstrap_mode: bundle?.provenance_mode ?? null,
    representation_complete: bundle?.completeness?.representation_complete ?? null,
    evaluation_complete: bundle?.completeness?.evaluation_complete ?? null,
    audit_census_verified: false,
    full_panel_completeness_verified: false,
  };

  for (const step of steps) {
    const code = step();
    if (code) return { raw: code, attestation_valid: false, policy_accepted: false, ...base };
  }

  if (tier === "audit") {
    const code = checkCensus(bundle, auditPrivate);
    if (code) return { raw: code, attestation_valid: false, policy_accepted: false, ...base };
    base.audit_census_verified = true;
    base.full_panel_completeness_verified = base.evaluation_complete === true;
  }

  // Attestation is TRUE here (raw 0). Strict policy may still reject a truthful incomplete panel (281).
  const policyCode = strict ? evaluatePolicy(bundle) : null;
  return {
    raw: policyCode ?? 0,
    attestation_valid: true,
    policy_accepted: policyCode == null,
    ...base,
  };
}

export function evaluatePanelSafe(bundle, opts = {}) {
  try {
    return evaluatePanel(bundle, opts);
  } catch {
    return {
      raw: 282,
      attestation_valid: false,
      policy_accepted: false,
      tier: opts.tier ?? "public",
      bootstrap_mode: null,
      representation_complete: null,
      evaluation_complete: null,
      audit_census_verified: false,
      full_panel_completeness_verified: false,
    };
  }
}
