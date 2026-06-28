// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { LIMITS, PACK_DOMAIN, ZERO_HASH } from "./constants.mjs";
import { merkleRoot } from "./merkle.mjs";
import { auditPrivacy } from "./privacy.mjs";
import {
  decide,
  deriveIntegritySummary,
  derivePolicyFeatures,
  deriveUntrustedReachedAuthority,
} from "./replay.mjs";
import { receiptHash, verifyReceipt } from "./receipt.mjs";
import { domainBytes, publicKeyFingerprint, sha256Canonical } from "./stage4dCrypto.mjs";

function baseLayers() {
  return {
    pack_signature: null,
    tamper: null,
    observation_binding: null,
    completeness: null,
    decision_replay: null,
    privacy: null,
  };
}

function success(pack, layers) {
  return {
    ok: true,
    exit_code: 0,
    layers,
    first_failure: null,
    session_merkle_root: pack.completeness_manifest.session_merkle_root,
    pack_hash: pack.pack_hash,
  };
}

function fail(layer, reason, actionId, layers) {
  layers[layer] = false;
  return {
    ok: false,
    exit_code: 1,
    layers,
    first_failure: actionId ? { layer, action_id: actionId, reason } : { layer, reason },
  };
}

function packWithoutHash(pack) {
  const { pack_hash, ...withoutHash } = pack;
  return withoutHash;
}

function checkSize(pack) {
  const json = JSON.stringify(pack);
  if (json.length > LIMITS.maxPackBytes) return false;
  if (Array.isArray(pack.receipts) && pack.receipts.length > LIMITS.maxReceiptsPerPack)
    return false;
  for (const receipt of pack.receipts || []) {
    if (JSON.stringify(receipt).length > LIMITS.maxReceiptBytes) return false;
  }
  for (const material of Object.values(pack.replay_material || {})) {
    if (JSON.stringify(material).length > LIMITS.maxReplayMaterialBytesPerAction) return false;
  }
  return true;
}

function verifyPackSignature(pack, signature, publicKeyPem, layers) {
  if (!pack || typeof pack !== "object" || pack.pack_version !== "simurgh.evidence_pack.v1") {
    return fail("pack_signature", "schema_invalid", null, layers);
  }
  if (!checkSize(pack)) return fail("pack_signature", "size_limit_exceeded", null, layers);
  const withoutHash = packWithoutHash(pack);
  if (sha256Canonical(withoutHash) !== pack.pack_hash) {
    return fail("pack_signature", "pack_hash_mismatch", null, layers);
  }
  const fingerprint = publicKeyFingerprint(publicKeyPem);
  if (
    pack.signer_public_key_fingerprint !== fingerprint ||
    pack.signer_public_key?.fingerprint !== fingerprint
  ) {
    return fail("pack_signature", "embedded_key_mismatch", null, layers);
  }
  const ok = crypto.verify(
    null,
    domainBytes(PACK_DOMAIN, withoutHash),
    crypto.createPublicKey(publicKeyPem),
    Buffer.from(String(signature || "").replace(/^base64:/, ""), "base64")
  );
  if (!ok) return fail("pack_signature", "pack_signature_invalid", null, layers);
  layers.pack_signature = true;
  return null;
}

function verifyReceipts(pack, publicKeyPem, layers) {
  let prev = ZERO_HASH;
  for (let i = 0; i < pack.receipts.length; i += 1) {
    const receipt = pack.receipts[i];
    const payload = receipt.receipt_payload;
    const check = verifyReceipt(receipt, publicKeyPem);
    if (!check.ok) return fail("tamper", check.reason, payload?.action_id, layers);
    if (payload.step_index !== i)
      return fail("tamper", "non_contiguous_step_index", payload.action_id, layers);
    if (payload.prev_receipt_hash !== prev)
      return fail("tamper", "chain_break", payload.action_id, layers);
    prev = receipt.receipt_hash;
  }
  const receiptHashes = pack.receipts.map((r) => r.receipt_hash);
  if (merkleRoot(receiptHashes) !== pack.completeness_manifest.session_merkle_root) {
    return fail("tamper", "merkle_root_mismatch", null, layers);
  }
  layers.tamper = true;
  return null;
}

function verifyCompleteness(pack, layers) {
  const events = pack.action_observation_log;
  const receipts = pack.receipts;
  const manifest = pack.completeness_manifest;
  const eventHashes = events.map((event) => sha256Canonical(event));
  if (
    merkleRoot(eventHashes) !== pack.observation_log_root ||
    merkleRoot(eventHashes) !== manifest.observation_log_root
  ) {
    return fail("observation_binding", "observation_log_root_mismatch", null, layers);
  }
  layers.observation_binding = true;
  if (manifest.observed_action_log_hash !== sha256Canonical(events)) {
    return fail("completeness", "observation_log_hash_mismatch", null, layers);
  }
  if (events.length !== receipts.length) {
    return fail("completeness", "missing_receipt_for_observed_action", null, layers);
  }
  const eventIds = events.map((event) => event.action_id);
  const receiptIds = receipts.map((receipt) => receipt.receipt_payload.action_id);
  if (
    new Set(eventIds).size !== eventIds.length ||
    new Set(receiptIds).size !== receiptIds.length
  ) {
    return fail("completeness", "duplicate_action_id", null, layers);
  }
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const receipt = receipts[i];
    if (event.step_index !== i || receipt.receipt_payload.step_index !== i) {
      return fail("completeness", "non_contiguous_step_index", event.action_id, layers);
    }
    if (event.action_id !== receipt.receipt_payload.action_id) {
      return fail("completeness", "missing_receipt_for_observed_action", event.action_id, layers);
    }
    if (receipt.receipt_payload.observation_event_hash !== eventHashes[i]) {
      return fail("completeness", "observation_log_hash_mismatch", event.action_id, layers);
    }
  }
  if (manifest.ordered_action_ids.join("\0") !== eventIds.join("\0")) {
    return fail("completeness", "missing_receipt_for_observed_action", null, layers);
  }
  if (
    manifest.ordered_receipt_hashes.join("\0") !== receipts.map((r) => r.receipt_hash).join("\0")
  ) {
    return fail("completeness", "merkle_root_mismatch", null, layers);
  }
  layers.completeness = true;
  return null;
}

function verifyReplay(pack, layers) {
  for (const receipt of pack.receipts) {
    const payload = receipt.receipt_payload;
    const actionId = payload.action_id;
    const material = pack.replay_material[actionId];
    if (!material)
      return fail("decision_replay", "missing_receipt_for_observed_action", actionId, layers);
    if (payload.decision_input.policy_hash !== sha256Canonical(pack.policy_bundle)) {
      return fail("decision_replay", "policy_hash_mismatch", actionId, layers);
    }
    if (payload.decision_input.sink_registry_hash !== sha256Canonical(pack.sink_registry)) {
      return fail("decision_replay", "sink_registry_hash_mismatch", actionId, layers);
    }
    if (
      payload.decision_input.consequence_lattice_hash !== sha256Canonical(pack.consequence_lattice)
    ) {
      return fail("decision_replay", "consequence_lattice_hash_mismatch", actionId, layers);
    }
    if (
      payload.decision_input.resolved_args_digest !==
      sha256Canonical(material.resolved_args_redacted)
    ) {
      return fail("decision_replay", "resolved_args_digest_mismatch", actionId, layers);
    }
    const derivedFeatures = derivePolicyFeatures(
      material.policy_features_source,
      pack.sink_registry
    );
    if (payload.decision_input.policy_features_digest !== sha256Canonical(derivedFeatures)) {
      return fail("decision_replay", "policy_features_digest_mismatch", actionId, layers);
    }
    if (
      payload.decision_input.taint_labels_digest !==
      sha256Canonical(material.taint_derivation_inputs)
    ) {
      return fail("decision_replay", "taint_digest_mismatch", actionId, layers);
    }
    if (payload.decision_input.context_digest !== sha256Canonical(material.decision_context)) {
      return fail("decision_replay", "context_digest_mismatch", actionId, layers);
    }
    if (
      payload.decision_input.untrusted_reached_authority !==
      deriveUntrustedReachedAuthority(material.taint_derivation_inputs)
    ) {
      return fail("decision_replay", "taint_authority_mismatch", actionId, layers);
    }
    if (
      payload.input_integrity_summary !== deriveIntegritySummary(material.taint_derivation_inputs)
    ) {
      return fail("decision_replay", "integrity_summary_mismatch", actionId, layers);
    }
    const replayed = decide(
      pack.policy_bundle,
      payload.decision_input,
      material,
      pack.sink_registry
    );
    if (replayed.decision !== payload.decision) {
      return fail("decision_replay", "replayed_decision_mismatch", actionId, layers);
    }
    if (replayed.reason_code !== payload.decision_reason_code) {
      return fail("decision_replay", "replayed_reason_code_mismatch", actionId, layers);
    }
  }
  layers.decision_replay = true;
  return null;
}

function verifyPrivacy(pack, layers) {
  const privacy = auditPrivacy(pack);
  if (!privacy.ok) return fail("privacy", privacy.reason, null, layers);
  layers.privacy = true;
  return null;
}

export function verifyEvidencePack({ pack, signature, publicKeyPem }) {
  const layers = baseLayers();
  try {
    return (
      verifyPackSignature(pack, signature, publicKeyPem, layers) ||
      verifyReceipts(pack, publicKeyPem, layers) ||
      verifyCompleteness(pack, layers) ||
      verifyReplay(pack, layers) ||
      verifyPrivacy(pack, layers) ||
      success(pack, layers)
    );
  } catch {
    return fail("pack_signature", "schema_invalid", null, layers);
  }
}
