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
