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

// The three Stage 3M artifacts the attestation row depends on; hash-bound via
// the ledger so the attestation row is not merely a boolean.
export const STAGE3M_ATTESTATION_FILES = Object.freeze([
  "docs/research/llm-shield/evidence/stage-3m/attestation.bundle.json",
  "docs/research/llm-shield/evidence/stage-3m/attestation.signature.json",
  "docs/research/llm-shield/evidence/stage-3m/attestation.public-key.json",
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

// Map each family to the dotted paths of its committed fields. fable5 stores flat
// integers; the agentdojo families nest under defended/containment blocks.
const FIELD_MAP = Object.freeze({
  agentdojo_layer2: {
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
  agentdojo_full: {
    asr_num: "agentdojo_native_metrics.defended.targeted_asr.numerator",
    asr_den: "agentdojo_native_metrics.defended.targeted_asr.denominator",
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
  adaptive_readiness: {
    asr_num: "agentdojo_native_metrics.defended.targeted_asr.numerator",
    asr_den: "agentdojo_native_metrics.defended.targeted_asr.denominator",
    over_defence_num: "simurgh_containment_metrics.over_defence_rate.numerator",
    over_defence_den: "simurgh_containment_metrics.over_defence_rate.denominator",
  },
});

function contractFor(family) {
  return METRIC_CONTRACT.find((c) => c.metric_family === family);
}

export function normaliseSources(sources) {
  const rows = STAGE3N_FAMILIES.map((family) => {
    const src = sources[family];
    const contract = contractFor(family);
    if (family === "attestation_validity") {
      return {
        family,
        source_stage: contract.source_stage,
        role: "attestation",
        source_files: [...STAGE3M_ATTESTATION_FILES],
        security: null,
        utility: null,
        attestation_valid: src.verifier_pass === true,
      };
    }
    if (family === "fable5_reference_containment") {
      return {
        family,
        source_stage: contract.source_stage,
        role: "held_line",
        source_files: [STAGE3N_SOURCE_FILES[family]],
        security: {
          targeted_asr_numerator: readPath(src, "malicious_targeted_asr"),
          targeted_asr_denominator: readPath(src, "malicious_total"),
        },
        utility: {
          over_defence_numerator:
            readPath(src, "benign_total") - readPath(src, "benign_hard_negative_passed"),
          over_defence_denominator: readPath(src, "benign_total"),
        },
        attestation_valid: null,
      };
    }
    const m = FIELD_MAP[family];
    return {
      family,
      source_stage: contract.source_stage,
      role: "held_line",
      source_files: [STAGE3N_SOURCE_FILES[family]],
      security: m.asr_num
        ? {
            targeted_asr_numerator: readPath(src, m.asr_num),
            targeted_asr_denominator: readPath(src, m.asr_den),
          }
        : null,
      utility: {
        over_defence_numerator: readPath(src, m.over_defence_num),
        over_defence_denominator: readPath(src, m.over_defence_den),
      },
      attestation_valid: null,
    };
  });
  return Object.freeze(rows);
}

export function buildPerFamilyPanels(normalised) {
  return Object.freeze(
    normalised.map((row) => ({
      family: row.family,
      panel: {
        source_stage: row.source_stage,
        role: row.role,
        security: row.security,
        utility: row.utility,
        attestation_valid: row.attestation_valid,
      },
    }))
  );
}

// Review fix 3: per-row hash binding. Every file listed by every row must appear
// in evidenceHashes with a non-empty sha256.
export function computeLedgerHashBinding(rows, evidenceHashes) {
  for (const row of rows) {
    for (const file of row.source_files) {
      if (!evidenceHashes[file]) return false;
    }
  }
  return true;
}
