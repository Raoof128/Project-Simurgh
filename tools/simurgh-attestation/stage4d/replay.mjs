// SPDX-License-Identifier: AGPL-3.0-or-later
const UNTRUSTED_LABELS = new Set([
  "untrusted",
  "untrusted_web",
  "untrusted_tool",
  "provider_output",
]);

export function deriveIntegritySummary(taintInputs) {
  const labels = new Set((taintInputs.sources || []).map((source) => String(source.label || "")));
  return [...labels].some((label) => UNTRUSTED_LABELS.has(label))
    ? "contains_untrusted"
    : "trusted_only";
}

export function deriveUntrustedReachedAuthority(taintInputs) {
  return (
    Boolean(taintInputs.authority_sink) &&
    deriveIntegritySummary(taintInputs) === "contains_untrusted"
  );
}

export function derivePolicyFeatures(source, sinkRegistry) {
  const sink = sinkRegistry.sinks.find((entry) => entry.sink_id === source.sink_id);
  if (!sink) throw new Error(`unknown_sink:${source.sink_id}`);
  return {
    sink_id: source.sink_id,
    consequence_class: sink.default_consequence_class,
    requires_authority: Boolean(source.requires_authority),
    external_effect: Boolean(source.external_effect),
    user_explicitly_authorised: Boolean(source.user_explicitly_authorised),
  };
}

export function decide(policyBundle, decisionInput, material, sinkRegistry) {
  const mode = decisionInput.policy_mode;
  const features = derivePolicyFeatures(material.policy_features_source, sinkRegistry);
  const integrity = deriveIntegritySummary(material.taint_derivation_inputs);
  const authority = deriveUntrustedReachedAuthority(material.taint_derivation_inputs);

  if (mode === "strict" && authority) {
    return { decision: "block", reason_code: "STRICT_UNTRUSTED_TO_AUTHORITY_BLOCKED" };
  }
  if (
    features.sink_id === "authority_escalation" &&
    policyBundle.modes[mode].block_authority_escalation
  ) {
    return { decision: "block", reason_code: "AUTHORITY_ESCALATION_BLOCKED" };
  }
  if (integrity === "contains_untrusted") {
    if (features.sink_id === "secret_export") {
      return { decision: "block", reason_code: "UNTRUSTED_SECRET_EXPORT_BLOCKED" };
    }
    if (
      features.sink_id === "egress" &&
      policyBundle.modes[mode].block_untrusted_to_external_egress
    ) {
      return { decision: "block", reason_code: "UNTRUSTED_EGRESS_BLOCKED" };
    }
    if (features.sink_id === "destructive_mutation") {
      return { decision: "block", reason_code: "UNTRUSTED_DESTRUCTIVE_MUTATION_BLOCKED" };
    }
  }
  return { decision: "allow", reason_code: "POLICY_ALLOWED" };
}
