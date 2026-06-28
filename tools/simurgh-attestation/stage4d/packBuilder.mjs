// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { PACK_DOMAIN, ZERO_HASH } from "./constants.mjs";
import { merkleRoot } from "./merkle.mjs";
import { derivePolicyFeatures } from "./replay.mjs";
import { createStage4dSigner } from "./signer.mjs";
import { domainBytes, publicKeyFingerprint, sha256Canonical } from "./stage4dCrypto.mjs";

export const NON_CLAIMS = Object.freeze({
  not_model_safety: true,
  not_jailbreak_immunity: true,
  not_policy_correctness: true,
  not_complete_for_unmediated_actions: true,
  not_kernel_enforced: true,
  not_live_model_identity_proof: true,
  not_production_certification: true,
  not_ground_truth_outside_mediated_surface: true,
});

function digest(value) {
  return sha256Canonical(value);
}

function observationHashes(observationLog) {
  return observationLog.map((event) => digest(event));
}

function signerPublicKeyObject(publicKey) {
  const key =
    typeof publicKey === "string" || Buffer.isBuffer(publicKey)
      ? crypto.createPublicKey(publicKey)
      : publicKey;
  const pem = key.export({ type: "spki", format: "pem" });
  return {
    key_type: "Ed25519",
    format: "spki-pem",
    public_key_pem: pem,
    fingerprint: publicKeyFingerprint(pem),
  };
}

function buildPackObject({ runRecord, publicKey, receipts, obsHashes }) {
  const pub = signerPublicKeyObject(publicKey);
  const orderedReceiptHashes = receipts.map((r) => r.receipt_hash);
  const completeness = {
    manifest_version: "simurgh.completeness.v1",
    run_id: runRecord.run_manifest.run_id,
    observation_source: "gateway_mediator_v1",
    observed_action_log_hash: digest(runRecord.action_observation_log),
    observation_log_root: merkleRoot(obsHashes),
    observed_action_count: runRecord.action_observation_log.length,
    receipt_count: receipts.length,
    ordered_action_ids: runRecord.action_observation_log.map((e) => e.action_id),
    ordered_observation_event_hashes: obsHashes,
    ordered_receipt_hashes: orderedReceiptHashes,
    per_sink_tally: tallySinks(runRecord.action_observation_log, runRecord.decisions),
    session_merkle_root: merkleRoot(orderedReceiptHashes),
  };
  const withoutHash = {
    pack_version: "simurgh.evidence_pack.v1",
    run_manifest: runRecord.run_manifest,
    policy_bundle: runRecord.policy_bundle,
    sink_registry: runRecord.sink_registry,
    consequence_lattice: runRecord.consequence_lattice,
    action_observation_log: runRecord.action_observation_log,
    observation_log_root: completeness.observation_log_root,
    replay_material: runRecord.replay_material,
    receipts,
    completeness_manifest: completeness,
    non_claims: NON_CLAIMS,
    signer_public_key: pub,
    signer_key_id: "simurgh-stage4d-test-key-v1",
    signer_public_key_fingerprint: pub.fingerprint,
  };
  return { ...withoutHash, pack_hash: digest(withoutHash) };
}

function receiptPayload({
  runRecord,
  decision,
  material,
  observed,
  obsHash,
  policyHash,
  sinkHash,
  latticeHash,
  prevHash,
  stepIndex,
}) {
  const derivedPolicyFeatures = derivePolicyFeatures(
    material.policy_features_source,
    runRecord.sink_registry
  );
  return {
    receipt_version: "simurgh.receipt.v1",
    run_id: runRecord.run_manifest.run_id,
    parent_session: runRecord.run_manifest.parent_session,
    action_id: decision.action_id,
    step_index: stepIndex,
    observation_event_hash: obsHash,
    action_type: observed.action_type,
    sink_id: observed.sink_id,
    consequence_class: observed.consequence_class,
    boundary_id: observed.boundary_id,
    input_integrity_summary: decision.input_integrity_summary,
    decision: decision.decision,
    decision_reason_code: decision.decision_reason_code,
    decision_input: {
      policy_version: runRecord.policy_bundle.policy_version,
      policy_hash: policyHash,
      sink_registry_version: runRecord.sink_registry.registry_version,
      sink_registry_hash: sinkHash,
      consequence_lattice_hash: latticeHash,
      resolved_args_digest: digest(material.resolved_args_redacted),
      policy_features_digest: digest(derivedPolicyFeatures),
      taint_labels_digest: digest(material.taint_derivation_inputs),
      context_digest: digest(material.decision_context),
      untrusted_reached_authority: decision.decision_input.untrusted_reached_authority,
      policy_mode: decision.decision_input.policy_mode,
    },
    model_identity_committed: runRecord.run_manifest.model_identity_committed,
    model_identity_origin: runRecord.run_manifest.model_identity_origin,
    prev_receipt_hash: prevHash,
  };
}

export function tallySinks(events, decisions) {
  const out = {};
  for (const event of events) out[event.sink_id] = { observed: 0, allow: 0, block: 0 };
  for (const event of events) out[event.sink_id].observed += 1;
  for (const decision of decisions) {
    const event = events.find((e) => e.action_id === decision.action_id);
    out[event.sink_id][decision.decision] += 1;
  }
  return out;
}

export function buildEvidencePack({ runRecord, privateKey, publicKey }) {
  const signer = createStage4dSigner({ privateKey, runId: runRecord.run_manifest.run_id });
  const obsHashes = observationHashes(runRecord.action_observation_log);
  const policyHash = digest(runRecord.policy_bundle);
  const sinkHash = digest(runRecord.sink_registry);
  const latticeHash = digest(runRecord.consequence_lattice);
  const receipts = [];

  for (let i = 0; i < runRecord.decisions.length; i += 1) {
    const decision = runRecord.decisions[i];
    const material = runRecord.replay_material[decision.action_id];
    const observed = runRecord.action_observation_log[i];
    const payload = receiptPayload({
      runRecord,
      decision,
      material,
      observed,
      obsHash: obsHashes[i],
      policyHash,
      sinkHash,
      latticeHash,
      prevHash: i === 0 ? ZERO_HASH : receipts[i - 1].receipt_hash,
      stepIndex: i,
    });
    receipts.push(signer.signReceipt(payload));
  }

  return buildPackObject({ runRecord, publicKey, receipts, obsHashes });
}

export async function buildEvidencePackWithSigner({ runRecord, publicKey, signReceipt }) {
  const obsHashes = observationHashes(runRecord.action_observation_log);
  const policyHash = digest(runRecord.policy_bundle);
  const sinkHash = digest(runRecord.sink_registry);
  const latticeHash = digest(runRecord.consequence_lattice);
  const receipts = [];

  for (let i = 0; i < runRecord.decisions.length; i += 1) {
    const decision = runRecord.decisions[i];
    const material = runRecord.replay_material[decision.action_id];
    const observed = runRecord.action_observation_log[i];
    const payload = receiptPayload({
      runRecord,
      decision,
      material,
      observed,
      obsHash: obsHashes[i],
      policyHash,
      sinkHash,
      latticeHash,
      prevHash: i === 0 ? ZERO_HASH : receipts[i - 1].receipt_hash,
      stepIndex: i,
    });
    receipts.push(await signReceipt(payload));
  }

  return buildPackObject({ runRecord, publicKey, receipts, obsHashes });
}

export function signPack(pack, privateKey) {
  const { pack_hash, ...withoutHash } = pack;
  const sig = crypto.sign(null, domainBytes(PACK_DOMAIN, withoutHash), privateKey);
  return sig.toString("base64");
}
