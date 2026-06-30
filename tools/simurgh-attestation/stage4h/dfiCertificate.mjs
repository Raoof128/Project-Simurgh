// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CHECKER_VERSION,
  CERTIFICATE_TYPE,
  CLAIM,
  DEFAULT_SCOPE,
  INTEGRITY_LABELS,
  PROOF_SYSTEM,
  REQUIRED_SINK_INTEGRITY,
} from "./constants.mjs";
import { buildPremiseSet, digest, premiseDigest } from "./canonicalPremises.mjs";
import { RAW_VERIFIER_CODES } from "./exitCodes.mjs";
import { validateDfiCertificate } from "./schema.mjs";

export function certificateDigest(certificate) {
  return digest(certificate);
}

export function normalizeIntegrityLabel(label) {
  return label === "trusted" ? "trusted" : "untrusted";
}

export function combineIntegrity(labels) {
  for (const label of labels) {
    if (!INTEGRITY_LABELS.includes(label)) {
      throw new Error(`unknown integrity label: ${label}`);
    }
    if (label === "untrusted") return "untrusted";
  }
  return "trusted";
}

export function integrityLte(a, b) {
  if (!INTEGRITY_LABELS.includes(a) || !INTEGRITY_LABELS.includes(b)) {
    throw new Error("unknown integrity label");
  }
  return a === b || (a === "untrusted" && b === "trusted");
}

function addSet(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function actionSinkPremises(premises) {
  return premises.authority_sinks.filter((premise) => premise.stable_fields.action_id);
}

function premiseIdSet(premises) {
  const ids = new Set();
  for (const key of ["sources", "replay_nodes", "explicit_edges", "authority_sinks"]) {
    for (const premise of premises[key] || []) ids.add(premise.premise_id);
  }
  return ids;
}

export function recomputeGraph(premises) {
  const nodeLabel = new Map();
  const refsByNode = new Map();
  const incomingByNode = new Map();

  for (const source of premises.sources) {
    const node = `source:${source.stable_fields.source_id}`;
    const label = normalizeIntegrityLabel(source.stable_fields.label);
    nodeLabel.set(
      node,
      nodeLabel.has(node) ? combineIntegrity([nodeLabel.get(node), label]) : label
    );
    addSet(refsByNode, node, source.premise_id);
  }

  for (const edge of premises.explicit_edges) {
    const to = edge.stable_fields.to;
    const label = normalizeIntegrityLabel(edge.stable_fields.label);
    if (!incomingByNode.has(to)) incomingByNode.set(to, []);
    incomingByNode.get(to).push(label);
    addSet(refsByNode, to, edge.premise_id);
  }

  for (const [node, labels] of incomingByNode) {
    const sorted = [...labels].sort();
    incomingByNode.set(node, sorted);
    nodeLabel.set(node, combineIntegrity(sorted));
  }

  const authoritySinkNodes = new Set();
  for (const sink of actionSinkPremises(premises)) {
    const node = `action:${sink.stable_fields.action_id}`;
    authoritySinkNodes.add(node);
    addSet(refsByNode, node, sink.premise_id);
    if (!nodeLabel.has(node)) nodeLabel.set(node, "trusted");
  }

  return { nodeLabel, refsByNode, incomingByNode, authoritySinkNodes };
}

export function buildDerivation(premises) {
  const { nodeLabel, refsByNode, incomingByNode, authoritySinkNodes } = recomputeGraph(premises);
  const nodes = [...nodeLabel.keys()].sort();
  const derived_node_labels = nodes.map((node) => ({
    node,
    label: nodeLabel.get(node),
    premise_refs: [...(refsByNode.get(node) || [])].sort(),
  }));
  const lattice_steps = [...incomingByNode.keys()].sort().map((node) => ({
    op: "combine",
    node,
    inputs: [...incomingByNode.get(node)].sort(),
    result: nodeLabel.get(node),
  }));
  const sink_safety_claims = [...authoritySinkNodes].sort().map((node) => {
    const node_label = nodeLabel.get(node);
    return { node, node_label, safe: node_label === REQUIRED_SINK_INTEGRITY };
  });
  const premise_refs = [
    ...new Set(derived_node_labels.flatMap((entry) => entry.premise_refs)),
  ].sort();
  const violations = sink_safety_claims.filter((claim) => !claim.safe).length;
  return {
    derivation: { derived_node_labels, lattice_steps, sink_safety_claims, premise_refs },
    violations,
  };
}

function tamper(reason, extra = {}) {
  return { ok: false, code: RAW_VERIFIER_CODES.PROOF_TAMPER_DETECTED, reason, ...extra };
}

function unsafe(reason, extra = {}) {
  return {
    ok: false,
    code: RAW_VERIFIER_CODES.EXPLICIT_FLOW_INTEGRITY_VIOLATION,
    reason,
    ...extra,
  };
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

function setEquals(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function uniqueRefs(refs) {
  return new Set(refs).size === refs.length;
}

function derivationScopeIncomplete(section, node) {
  return tamper("derivation_scope_incomplete", {
    missing: section,
    node,
  });
}

function theatre(section, node) {
  return tamper("proof_object_carries_no_independently_checkable_derivation", {
    missing: section,
    node,
  });
}

function missingCoverage(section, node, entries) {
  return entries.length === 0 ? theatre(section, node) : derivationScopeIncomplete(section, node);
}

export function validateDerivation({ premises, certificate }) {
  const derivation = certificate.derivation;
  const knownPremiseIds = premiseIdSet(premises);
  const citedRefs = [
    ...derivation.premise_refs,
    ...derivation.derived_node_labels.flatMap((entry) => entry.premise_refs),
  ];
  for (const ref of citedRefs) {
    if (!knownPremiseIds.has(ref)) return tamper("unknown_premise_ref", { ref });
  }
  if (new Set(derivation.premise_refs).size !== derivation.premise_refs.length) {
    return tamper("duplicate_premise_ref");
  }

  const { nodeLabel, refsByNode, incomingByNode, authoritySinkNodes } = recomputeGraph(premises);

  const labelByNode = new Map();
  for (const label of derivation.derived_node_labels) {
    if (labelByNode.has(label.node)) return tamper("duplicate_node_label", { node: label.node });
    labelByNode.set(label.node, label);
  }
  for (const node of nodeLabel.keys()) {
    if (!labelByNode.has(node)) {
      return missingCoverage("derived_node_labels", node, derivation.derived_node_labels);
    }
  }
  for (const node of labelByNode.keys()) {
    if (!nodeLabel.has(node)) return tamper("extra_node_label", { node });
  }
  for (const [node, label] of labelByNode) {
    if (label.label !== nodeLabel.get(node)) return tamper("node_label_unjustified", { node });
    if (!uniqueRefs(label.premise_refs)) return tamper("duplicate_premise_ref", { node });
    const expectedRefs = refsByNode.get(node) || new Set();
    if (!setEquals(new Set(label.premise_refs), expectedRefs)) {
      return tamper("node_label_unjustified", { node });
    }
  }

  const expectedTopLevelRefs = new Set(
    derivation.derived_node_labels.flatMap((entry) => entry.premise_refs)
  );
  if (!setEquals(new Set(derivation.premise_refs), expectedTopLevelRefs)) {
    return theatre("premise_refs", "derivation");
  }

  const stepByNode = new Map();
  for (const step of derivation.lattice_steps) {
    if (stepByNode.has(step.node)) return tamper("duplicate_lattice_step", { node: step.node });
    stepByNode.set(step.node, step);
  }
  for (const node of incomingByNode.keys()) {
    if (!stepByNode.has(node)) {
      return missingCoverage("lattice_steps", node, derivation.lattice_steps);
    }
  }
  for (const [node, step] of stepByNode) {
    if (!incomingByNode.has(node)) return tamper("extra_lattice_step", { node });
    const expectedInputs = incomingByNode.get(node);
    if (!sameArray(step.inputs, expectedInputs)) return tamper("lattice_step_invalid", { node });
    if (combineIntegrity(step.inputs) !== step.result)
      return tamper("lattice_step_invalid", { node });
    if (step.result !== nodeLabel.get(node)) return tamper("lattice_step_invalid", { node });
  }

  const claimByNode = new Map();
  for (const claim of derivation.sink_safety_claims) {
    if (claimByNode.has(claim.node))
      return tamper("duplicate_sink_safety_claim", { node: claim.node });
    claimByNode.set(claim.node, claim);
  }
  for (const node of authoritySinkNodes) {
    if (!claimByNode.has(node)) {
      return missingCoverage("sink_safety_claims", node, derivation.sink_safety_claims);
    }
  }
  for (const [node, claim] of claimByNode) {
    if (!authoritySinkNodes.has(node)) return tamper("extra_sink_safety_claim", { node });
    const label = nodeLabel.get(node);
    if (!label) return tamper("sink_not_in_graph", { node });
    if (claim.node_label !== label) return tamper("node_label_unjustified", { node });
    const recomputedSafe = label === REQUIRED_SINK_INTEGRITY;
    if (claim.safe !== recomputedSafe) return unsafe("proof_accepts_bad_flow", { node });
  }

  const violations = [...claimByNode.values()].filter((claim) => !claim.safe).length;
  if (certificate.summary.violations !== violations) {
    return tamper("violation_count_mismatch", { expected: violations });
  }
  if (violations > 0) return unsafe("explicit_flow_integrity_violation", { violations });
  return { ok: true, code: RAW_VERIFIER_CODES.OK, violations: 0 };
}

export function buildDfiCertificate({ pack }) {
  const premises = buildPremiseSet(pack);
  const { derivation, violations } = buildDerivation(premises);
  const certificate = {
    type: CERTIFICATE_TYPE,
    proof_system: PROOF_SYSTEM,
    claim: CLAIM,
    scope: { ...DEFAULT_SCOPE },
    run_id_hash: digest(pack.run_manifest?.run_id || "unknown-run"),
    base_pack_digest: premises.base_pack_digest,
    replay_root: premises.replay_root,
    premise_digest: premiseDigest(premises),
    policy_digest: premises.policy_digest,
    lattice_digest: premises.lattice_digest,
    checker_version: CHECKER_VERSION,
    derivation,
    summary: {
      sources_checked: premises.sources.length,
      edges_checked: premises.explicit_edges.length,
      authority_sinks_checked: premises.authority_sinks.filter(
        (premise) => premise.stable_fields.action_id
      ).length,
      violations,
    },
  };
  const valid = validateDfiCertificate(certificate);
  if (!valid.ok) throw new Error(`invalid stage4h certificate: ${valid.reason}:${valid.field}`);
  return certificate;
}
