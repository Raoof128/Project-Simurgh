// SPDX-License-Identifier: AGPL-3.0-or-later
import { sha256Canonical } from "../stage4d/stage4dCrypto.mjs";

export function digest(value) {
  return `sha256:${sha256Canonical(value)}`;
}

export function premiseId({ kind, stable_fields }) {
  return `premise:${digest({ kind, stable_fields })}`;
}

export function basePackView(pack) {
  return {
    run_manifest: pack.run_manifest,
    action_observation_log: pack.action_observation_log,
    replay_material: pack.replay_material,
    receipts: pack.receipts,
    policy_bundle: pack.policy_bundle,
    consequence_lattice: pack.consequence_lattice,
    sink_registry: pack.sink_registry,
  };
}

function sortedById(items) {
  return [...items].sort((a, b) => a.premise_id.localeCompare(b.premise_id));
}

function actionEntries(pack) {
  return Object.entries(pack.replay_material || {}).sort(([a], [b]) => a.localeCompare(b));
}

function sourcePremises(pack) {
  const out = [];
  for (const [action_id, material] of actionEntries(pack)) {
    for (const source of material.taint_derivation_inputs?.sources || []) {
      const stable_fields = {
        action_id,
        source_id: source.source_id,
        label: source.label,
      };
      out.push({
        kind: "source_label",
        premise_id: premiseId({ kind: "source_label", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById(out);
}

function replayNodePremises(pack) {
  return sortedById(
    (pack.receipts || []).map((receipt) => {
      const payload = receipt.receipt_payload;
      const stable_fields = {
        action_id: payload.action_id,
        step_index: payload.step_index,
        decision: payload.decision,
        decision_reason_code: payload.decision_reason_code,
      };
      return {
        kind: "replay_node",
        premise_id: premiseId({ kind: "replay_node", stable_fields }),
        stable_fields,
      };
    })
  );
}

function edgePremises(pack) {
  const out = [];
  for (const [action_id, material] of actionEntries(pack)) {
    const taint = material.taint_derivation_inputs || {};
    for (const source of taint.sources || []) {
      const stable_fields = {
        action_id,
        from: `source:${source.source_id}`,
        to: `action:${action_id}`,
        label: source.label,
      };
      out.push({
        kind: "explicit_edge",
        premise_id: premiseId({ kind: "explicit_edge", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById(out);
}

function sinkPremises(pack) {
  const registry = Array.isArray(pack.sink_registry?.sinks)
    ? pack.sink_registry.sinks
    : Object.values(pack.sink_registry?.sinks || {});
  const registrySinks = registry.map((sink) => {
    const stable_fields = {
      sink_id: sink.sink_id,
      authority: sink.authority,
      consequence_class: sink.consequence_class,
    };
    return {
      kind: "authority_sink",
      premise_id: premiseId({ kind: "authority_sink", stable_fields }),
      stable_fields,
    };
  });
  const actionSinks = [];
  for (const [action_id, material] of actionEntries(pack)) {
    if (material.taint_derivation_inputs?.authority_sink === true) {
      const stable_fields = { action_id, authority_sink: true };
      actionSinks.push({
        kind: "authority_sink",
        premise_id: premiseId({ kind: "authority_sink", stable_fields }),
        stable_fields,
      });
    }
  }
  return sortedById([...registrySinks, ...actionSinks]);
}

export function buildPremiseSet(pack) {
  const view = basePackView(pack);
  return {
    type: "simurgh.vca.dfi_premises.v1",
    base_pack_digest: digest(view),
    replay_root: digest({
      action_observation_log: pack.action_observation_log,
      replay_material: pack.replay_material,
      receipts: pack.receipts,
    }),
    policy_digest: digest(pack.policy_bundle),
    lattice_digest: digest(pack.consequence_lattice),
    sources: sourcePremises(pack),
    replay_nodes: replayNodePremises(pack),
    explicit_edges: edgePremises(pack),
    authority_sinks: sinkPremises(pack),
  };
}

export function premiseDigest(premises) {
  return digest(premises);
}
