// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure helpers for Stage 3N: claim-checked security-utility ledger. No I/O, no
// network, no secrets. The runner supplies all frozen-evidence data as plain
// objects; every function here is deterministic. The machine check is JSON
// field-equality, never prose parsing.

export const STAGE3N_FAMILIES = Object.freeze([
  "agentdojo_layer2",
  "agentdojo_full",
  "adaptive_readiness",
  "fable5_reference_containment",
  "attestation_validity",
]);

export const STAGE3N_SOURCE_FILES = Object.freeze({
  agentdojo_layer2: "docs/research/llm-shield/evidence/stage-3h-layer2/metrics.json",
  agentdojo_full: "docs/research/llm-shield/evidence/stage-3j/all-suite-metrics.json",
  adaptive_readiness: "docs/research/llm-shield/evidence/stage-3k/metrics.json",
  fable5_reference_containment: "docs/research/llm-shield/evidence/stage-3l/metrics.json",
  attestation_validity: "docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json",
});

export function readPath(obj, dottedPath) {
  return dottedPath.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

// Each family is its own pooling group with a distinct denominator basis, so no
// two families may be pooled. This makes "no denominator soup" machine-checkable.
export const METRIC_CONTRACT = Object.freeze([
  {
    source_stage: "3H-L2",
    metric_family: "agentdojo_layer2",
    denominator_basis: "stage3h_l2_overdefence_case_count",
    security_denominator: 20,
    utility_denominator: 10,
    pooling_group: "stage3h_l2_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3J",
    metric_family: "agentdojo_full",
    denominator_basis: "agentdojo_full_security_case_count",
    security_denominator: 949,
    utility_denominator: 97,
    pooling_group: "stage3j_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3K",
    metric_family: "adaptive_readiness",
    denominator_basis: "stage3k_adaptive_case_count",
    security_denominator: 385,
    utility_denominator: 97,
    pooling_group: "stage3k_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3L",
    metric_family: "fable5_reference_containment",
    denominator_basis: "stage3l_malicious_case_count",
    security_denominator: 150,
    utility_denominator: 30,
    pooling_group: "stage3l_only",
    pooling_allowed_with: [],
  },
  {
    source_stage: "3M",
    metric_family: "attestation_validity",
    denominator_basis: "stage3m_attestation_runset",
    security_denominator: 0,
    utility_denominator: 0,
    pooling_group: "stage3m_only",
    pooling_allowed_with: [],
  },
]);

export function evaluatePooling(contract) {
  const refusals = [];
  let pooled = 0;
  for (let i = 0; i < contract.length; i++) {
    for (let j = i + 1; j < contract.length; j++) {
      const a = contract[i];
      const b = contract[j];
      const compatible =
        a.denominator_basis === b.denominator_basis &&
        a.pooling_allowed_with.includes(b.metric_family) &&
        b.pooling_allowed_with.includes(a.metric_family);
      if (compatible) {
        pooled += 1;
      } else {
        refusals.push({
          a: a.metric_family,
          b: b.metric_family,
          reason: "denominator_basis mismatch or not mutually pooling-allowed",
        });
      }
    }
  }
  return {
    cross_family_pooling_performed: pooled,
    mismatched_denominator_pooling_refusal_test_passed: refusals.length >= 1,
    refusals,
  };
}
