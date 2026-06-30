// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INTEGRITY_LABELS,
  INTEGRITY_LATTICE,
  INTEGRITY_LATTICE_DIGEST,
  REQUIRED_SINK_INTEGRITY,
} from "../../../../tools/simurgh-attestation/stage4h/constants.mjs";
import {
  buildDerivation,
  combineIntegrity,
  integrityLte,
  normalizeIntegrityLabel,
  recomputeGraph,
  validateDerivation,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import { buildPremiseSet } from "../../../../tools/simurgh-attestation/stage4h/canonicalPremises.mjs";

test("Stage 4H.1 pins a fixed 2-point integrity lattice", () => {
  assert.deepEqual(INTEGRITY_LABELS, ["trusted", "untrusted"]);
  assert.equal(REQUIRED_SINK_INTEGRITY, "trusted");
  assert.equal(INTEGRITY_LATTICE.proof_system, "simurgh-ifc-lattice-v0");
  assert.equal(INTEGRITY_LATTICE.bottom, "untrusted");
  assert.equal(INTEGRITY_LATTICE.top, "trusted");
  assert.match(INTEGRITY_LATTICE_DIGEST, /^sha256:[a-f0-9]{64}$/);
});

test("Stage 4H.1 normalizes only exact trusted as trusted", () => {
  assert.equal(normalizeIntegrityLabel("trusted"), "trusted");
  assert.equal(normalizeIntegrityLabel("untrusted"), "untrusted");
  assert.equal(normalizeIntegrityLabel("untrusted_web"), "untrusted");
  assert.equal(normalizeIntegrityLabel("external"), "untrusted");
  assert.equal(normalizeIntegrityLabel(""), "untrusted");
  assert.equal(normalizeIntegrityLabel(null), "untrusted");
});

test("Stage 4H.1 integrity combine is greatest-lower-bound", () => {
  assert.equal(combineIntegrity(["trusted", "trusted"]), "trusted");
  assert.equal(combineIntegrity(["trusted", "untrusted"]), "untrusted");
  assert.equal(combineIntegrity([]), "trusted");
  assert.throws(() => combineIntegrity(["untrusted_web"]), /unknown integrity label/);
});

test("Stage 4H.1 integrity order is untrusted below trusted", () => {
  assert.equal(integrityLte("untrusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "trusted"), true);
  assert.equal(integrityLte("trusted", "untrusted"), false);
  assert.throws(() => integrityLte("untrusted_web", "trusted"), /unknown integrity label/);
});

function inlinePack(sourceLabel = "trusted") {
  return {
    run_manifest: { run_id: `stage4h1-inline-${sourceLabel}` },
    action_observation_log: [{ action_id: "a1", step_index: 0 }],
    replay_material: {
      a1: {
        taint_derivation_inputs: {
          authority_sink: true,
          sources: [{ source_id: "doc1", label: sourceLabel }],
        },
      },
    },
    receipts: [
      {
        receipt_payload: {
          action_id: "a1",
          step_index: 0,
          decision: "allow",
          decision_reason_code: "POLICY_ALLOWED",
        },
      },
    ],
    policy_bundle: { policy_version: "stage4h1-inline" },
    consequence_lattice: { lattice_version: "inline" },
    sink_registry: {
      sinks: [{ sink_id: "egress", authority: "high", consequence_class: "external" }],
    },
  };
}

function certFor(premises, built) {
  return {
    summary: {
      sources_checked: premises.sources.length,
      edges_checked: premises.explicit_edges.length,
      authority_sinks_checked: premises.authority_sinks.filter(
        (premise) => premise.stable_fields.action_id
      ).length,
      violations: built.violations,
    },
    derivation: built.derivation,
  };
}

test("Stage 4H.1 graph normalizes untrusted_web to untrusted without changing premises", () => {
  const premises = buildPremiseSet(inlinePack("untrusted_web"));
  assert.equal(premises.sources[0].stable_fields.label, "untrusted_web");
  const graph = recomputeGraph(premises);
  assert.equal(graph.nodeLabel.get("source:doc1"), "untrusted");
  assert.equal(graph.nodeLabel.get("action:a1"), "untrusted");
});

test("Stage 4H.1 builder emits an honest clean derivation", () => {
  const premises = buildPremiseSet(inlinePack("trusted"));
  assert.equal(premises.explicit_edges.length > 0, true);
  assert.equal(recomputeGraph(premises).incomingByNode.has("action:a1"), true);
  const built = buildDerivation(premises);
  const result = validateDerivation({ premises, certificate: certFor(premises, built) });
  assert.equal(result.ok, true);
  assert.equal(result.code, 0);
  assert.equal(built.violations, 0);
});

test("Stage 4H.1 builder emits an honest dirty derivation that verifier rejects with 24", () => {
  const premises = buildPremiseSet(inlinePack("untrusted_web"));
  const built = buildDerivation(premises);
  const result = validateDerivation({ premises, certificate: certFor(premises, built) });
  assert.equal(result.ok, false);
  assert.equal(result.code, 24);
  assert.equal(result.reason, "explicit_flow_integrity_violation");
  assert.equal(built.violations, 1);
});

for (const section of ["derived_node_labels", "lattice_steps", "sink_safety_claims"]) {
  test(`Stage 4H.1 anti-theatre rejects missing ${section} with 26`, () => {
    const premises = buildPremiseSet(inlinePack("trusted"));
    const certificate = certFor(premises, buildDerivation(premises));
    certificate.derivation = { ...certificate.derivation, [section]: [] };
    const result = validateDerivation({ premises, certificate });
    assert.equal(result.code, 26);
    assert.equal(result.reason, "proof_object_carries_no_independently_checkable_derivation");
  });
}

test("Stage 4H.1 rejects forged safe claim over dirty graph with 24", () => {
  const premises = buildPremiseSet(inlinePack("untrusted_web"));
  const certificate = certFor(premises, buildDerivation(premises));
  certificate.derivation.sink_safety_claims[0] = {
    ...certificate.derivation.sink_safety_claims[0],
    node_label: "untrusted",
    safe: true,
  };
  certificate.summary.violations = 0;
  const result = validateDerivation({ premises, certificate });
  assert.equal(result.code, 24);
  assert.equal(result.reason, "proof_accepts_bad_flow");
});

test("Stage 4H.1 rejects unknown premise refs with 26", () => {
  const premises = buildPremiseSet(inlinePack("trusted"));
  const certificate = certFor(premises, buildDerivation(premises));
  certificate.derivation.premise_refs.push(`premise:sha256:${"0".repeat(64)}`);
  const result = validateDerivation({ premises, certificate });
  assert.equal(result.code, 26);
  assert.equal(result.reason, "unknown_premise_ref");
});

test("Stage 4H.1 rejects extra and duplicate proof entries with 26", () => {
  const premises = buildPremiseSet(inlinePack("trusted"));
  const certificate = certFor(premises, buildDerivation(premises));
  certificate.derivation.derived_node_labels.push({
    node: "source:ghost",
    label: "trusted",
    premise_refs: [],
  });
  assert.equal(validateDerivation({ premises, certificate }).reason, "extra_node_label");

  const duplicate = certFor(premises, buildDerivation(premises));
  duplicate.derivation.premise_refs.push(duplicate.derivation.premise_refs[0]);
  assert.equal(
    validateDerivation({ premises, certificate: duplicate }).reason,
    "duplicate_premise_ref"
  );
});

test("Stage 4H.1 rejects exactness violations for lattice and sink proof entries", () => {
  const premises = buildPremiseSet(inlinePack("trusted"));

  const extraSourceStep = certFor(premises, buildDerivation(premises));
  extraSourceStep.derivation.lattice_steps.push({
    op: "combine",
    node: "source:doc1",
    inputs: [],
    result: "trusted",
  });
  assert.equal(
    validateDerivation({ premises, certificate: extraSourceStep }).reason,
    "extra_lattice_step"
  );

  const noIncomingPack = inlinePack("trusted");
  noIncomingPack.replay_material.a1.taint_derivation_inputs.sources = [];
  const noIncomingPremises = buildPremiseSet(noIncomingPack);
  const extraNoIncomingStep = certFor(noIncomingPremises, buildDerivation(noIncomingPremises));
  extraNoIncomingStep.derivation.lattice_steps.push({
    op: "combine",
    node: "action:a1",
    inputs: [],
    result: "trusted",
  });
  assert.equal(
    validateDerivation({ premises: noIncomingPremises, certificate: extraNoIncomingStep }).reason,
    "extra_lattice_step"
  );

  const duplicateStep = certFor(premises, buildDerivation(premises));
  duplicateStep.derivation.lattice_steps.push({ ...duplicateStep.derivation.lattice_steps[0] });
  assert.equal(
    validateDerivation({ premises, certificate: duplicateStep }).reason,
    "duplicate_lattice_step"
  );

  const extraSinkClaimSource = certFor(premises, buildDerivation(premises));
  extraSinkClaimSource.derivation.sink_safety_claims.push({
    node: "source:doc1",
    node_label: "trusted",
    safe: true,
  });
  assert.equal(
    validateDerivation({ premises, certificate: extraSinkClaimSource }).reason,
    "extra_sink_safety_claim"
  );

  const extraSinkClaimAction = certFor(premises, buildDerivation(premises));
  extraSinkClaimAction.derivation.sink_safety_claims.push({
    node: "action:not_sink",
    node_label: "trusted",
    safe: true,
  });
  assert.equal(
    validateDerivation({ premises, certificate: extraSinkClaimAction }).reason,
    "extra_sink_safety_claim"
  );

  const duplicateSinkClaim = certFor(premises, buildDerivation(premises));
  duplicateSinkClaim.derivation.sink_safety_claims.push({
    ...duplicateSinkClaim.derivation.sink_safety_claims[0],
  });
  assert.equal(
    validateDerivation({ premises, certificate: duplicateSinkClaim }).reason,
    "duplicate_sink_safety_claim"
  );
});

test("Stage 4H.1 premise_refs are exact and load-bearing", () => {
  const premises = buildPremiseSet(inlinePack("trusted"));

  const duplicateNodeRef = certFor(premises, buildDerivation(premises));
  duplicateNodeRef.derivation.derived_node_labels[0].premise_refs.push(
    duplicateNodeRef.derivation.derived_node_labels[0].premise_refs[0]
  );
  assert.equal(
    validateDerivation({ premises, certificate: duplicateNodeRef }).reason,
    "duplicate_premise_ref"
  );

  const missingNodeRef = certFor(premises, buildDerivation(premises));
  const actionLabel = missingNodeRef.derivation.derived_node_labels.find(
    (entry) => entry.node === "action:a1"
  );
  actionLabel.premise_refs = [];
  assert.equal(
    validateDerivation({ premises, certificate: missingNodeRef }).reason,
    "node_label_unjustified"
  );

  const missingTopLevelRef = certFor(premises, buildDerivation(premises));
  missingTopLevelRef.derivation.premise_refs.pop();
  assert.equal(
    validateDerivation({ premises, certificate: missingTopLevelRef }).reason,
    "proof_object_carries_no_independently_checkable_derivation"
  );

  const uncitedKnownRef = certFor(premises, buildDerivation(premises));
  uncitedKnownRef.derivation.premise_refs.push(premises.replay_nodes[0].premise_id);
  assert.equal(
    validateDerivation({ premises, certificate: uncitedKnownRef }).reason,
    "proof_object_carries_no_independently_checkable_derivation"
  );
});
