// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S receipt builder + dual signatures + bundle assembly (4S spec §3).
// Motto: AnthropicSafe First, then ReviewerSafe. Hop receipts are DUAL-signed
// (delegator AND delegatee) — the mechanical heart of No Ghost Hop: a hidden hop
// needs BOTH neighbours to withhold their signatures off-ledger. Signatures are
// Ed25519 over canonicalJson of the payload WITHOUT the signature fields.
import crypto from "node:crypto";
import { canonicalJson, sha256Hex, recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  SCHEMAS,
  DOMAINS,
  ROOT_SENTINEL,
  VDCC_NON_CLAIMS,
  VDCC_KNOWN_LIMITATIONS,
  VDCC_RAILS,
} from "../constants.mjs";
import { receiptDigest } from "./treeCore.mjs";
import { bundleRoot } from "./bundleMerkle.mjs";

export const keyDigest = (publicKeyPem) => `sha256:${sha256Hex(publicKeyPem)}`;

const stripReceiptSigs = (r) => {
  const { signature_delegator, signature_delegatee, ...rest } = r;
  return rest;
};
const stripFanoutSig = (c) => {
  const { signature_delegator, ...rest } = c;
  return rest;
};
const stripCrossingSig = (a) => {
  const { signature_actor, ...rest } = a;
  return rest;
};

const signHex = (privKey, message) =>
  crypto.sign(null, Buffer.from(message), privKey).toString("hex");
const verifyHex = (pubKey, message, sigHex) => {
  try {
    if (typeof sigHex !== "string" || sigHex.length === 0) return false;
    return crypto.verify(null, Buffer.from(message), pubKey, Buffer.from(sigHex, "hex"));
  } catch {
    return false;
  }
};

// Build an UNSIGNED hop receipt (spec §3.1). Root passes parent=null and the
// builder writes root_receipt_digest = ROOT_SENTINEL.
export function buildHopReceipt({
  epoch,
  runId,
  windowId,
  rootReceiptDigest,
  parentReceiptDigest,
  delegatorKeyDigest,
  delegateeKeyDigest,
  scope,
  budgetAllocated,
  spineRefs = { custody_4p: null, consent_4o: null, friction_4q: null },
}) {
  return {
    schema: SCHEMAS.HOP_RECEIPT,
    epoch,
    run_id: runId,
    window_id: windowId,
    root_receipt_digest: parentReceiptDigest === null ? ROOT_SENTINEL : rootReceiptDigest,
    parent_receipt_digest: parentReceiptDigest,
    delegator_key_digest: delegatorKeyDigest,
    delegatee_key_digest: delegateeKeyDigest,
    scope: [...scope].sort(),
    budget_allocated: budgetAllocated,
    spine_refs: spineRefs,
    signature_delegator: "",
    signature_delegatee: "",
  };
}

// The two halves of a dual signature. Both sign the IDENTICAL payload (the receipt
// without either signature field), so the delegator and delegatee can sign in
// separate processes (Lane B) and still produce byte-identical inputs.
export function signDelegator(receipt, delegatorPrivKey) {
  return {
    ...receipt,
    signature_delegator: signHex(delegatorPrivKey, canonicalJson(stripReceiptSigs(receipt))),
  };
}
export function signDelegatee(receipt, delegateePrivKey) {
  return {
    ...receipt,
    signature_delegatee: signHex(delegateePrivKey, canonicalJson(stripReceiptSigs(receipt))),
  };
}
export function dualSign(receipt, delegatorPrivKey, delegateePrivKey) {
  return signDelegatee(signDelegator(receipt, delegatorPrivKey), delegateePrivKey);
}

// {ok} | {ok:false, missing:true|false} — spec §11: missing FIELD is malformed
// (100 upstream), present-but-empty/invalid is 101.
export function verifyDualSignature(receipt, delegatorPubKey, delegateePubKey) {
  const hasDelegator = Object.prototype.hasOwnProperty.call(receipt, "signature_delegator");
  const hasDelegatee = Object.prototype.hasOwnProperty.call(receipt, "signature_delegatee");
  if (!hasDelegator || !hasDelegatee) return { ok: false, missing: true };
  const msg = canonicalJson(stripReceiptSigs(receipt));
  const ok =
    verifyHex(delegatorPubKey, msg, receipt.signature_delegator) &&
    verifyHex(delegateePubKey, msg, receipt.signature_delegatee);
  return { ok, missing: false };
}

export function signFanout(commitment, delegatorPrivKey) {
  const msg = canonicalJson(stripFanoutSig(commitment));
  return { ...commitment, signature_delegator: signHex(delegatorPrivKey, msg) };
}
export function verifyFanoutSignature(commitment, delegatorPubKey) {
  if (!Object.prototype.hasOwnProperty.call(commitment, "signature_delegator"))
    return { ok: false, missing: true };
  return {
    ok: verifyHex(
      delegatorPubKey,
      canonicalJson(stripFanoutSig(commitment)),
      commitment.signature_delegator
    ),
    missing: false,
  };
}

export function signCrossing(artifact, actorPrivKey) {
  const msg = canonicalJson(stripCrossingSig(artifact));
  return { ...artifact, signature_actor: signHex(actorPrivKey, msg) };
}
export function verifyCrossingSignature(artifact, actorPubKey) {
  if (!Object.prototype.hasOwnProperty.call(artifact, "signature_actor"))
    return { ok: false, missing: true };
  return {
    ok: verifyHex(actorPubKey, canonicalJson(stripCrossingSig(artifact)), artifact.signature_actor),
    missing: false,
  };
}

// Digest leaves for the bundle Merkle root (ordered: tree ++ detached ++ fanout ++ crossing).
export const fanoutDigest = (c) => recordDigest({ domain: DOMAINS.FANOUT, fanout: c });
export const crossingDigest = (a) => recordDigest({ domain: DOMAINS.CROSSING, crossing: a });

// Assemble the four-array chain bundle (spec §3.4). public_key_index MUST cover
// every key digest referenced by any receipt / crossing, else the builder throws
// (a malformed index is raw 100 at verify time).
export function assembleChainBundle({
  epoch,
  runId,
  treeReceipts,
  detachedReceipts = [],
  fanouts,
  crossings,
  publicKeyIndex,
  spineIndex = [],
}) {
  const referenced = new Set();
  for (const r of [...treeReceipts, ...detachedReceipts]) {
    referenced.add(r.delegator_key_digest);
    referenced.add(r.delegatee_key_digest);
  }
  for (const kd of referenced) {
    if (!(kd in publicKeyIndex)) throw new Error(`public_key_index missing key ${kd}`);
  }
  const leaves = [
    ...treeReceipts.map(receiptDigest),
    ...detachedReceipts.map(receiptDigest),
    ...fanouts.map(fanoutDigest),
    ...crossings.map(crossingDigest),
  ];
  return {
    schema: SCHEMAS.CHAIN_BUNDLE,
    epoch,
    run_id: runId,
    tree_receipts: treeReceipts,
    detached_receipts: detachedReceipts,
    fanout_commitments: fanouts,
    crossing_artifacts: crossings,
    public_key_index: publicKeyIndex,
    spine_index: spineIndex,
    bundle_merkle_root: bundleRoot(leaves),
    non_claims: [...VDCC_NON_CLAIMS],
    known_limitations: [...VDCC_KNOWN_LIMITATIONS],
    rails: [...VDCC_RAILS],
    signature: "",
  };
}
