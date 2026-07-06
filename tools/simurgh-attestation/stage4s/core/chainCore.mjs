// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S chain decision engine (4S spec §8, §11). Motto: AnthropicSafe First,
// then ReviewerSafe. evaluateChain runs the FROZEN first-failure order:
//   100 -> 101 -> 102 -> 103 -> 113 -> 104 -> 105 -> 106 -> 107 -> 108
//       -> 110 -> 109 -> 112 -> 111 -> 114 -> 115 -> 116 -> 117 -> 118
// The BINDING-DEFERRAL RULE (spec §11) keeps 112/111 reachable: scope (108) and
// flux (110/109) evaluate ONLY crossings whose bound_receipt_digest resolves to a
// verified tree node; receiptless / unknown / detached-bound crossings are
// deferred untouched to the binding phase.
import crypto from "node:crypto";
import { SCHEMAS, ROOT_SENTINEL } from "../constants.mjs";
import { receiptDigest, indexBundle, verifyTreeInvariants } from "./treeCore.mjs";
import { verifyFanoutCommitments } from "./fanoutCore.mjs";
import { verifyFlux } from "./fluxCore.mjs";
import {
  verifyDualSignature,
  verifyFanoutSignature,
  verifyCrossingSignature,
} from "./receiptBuilder.mjs";
import { bundleRoot } from "./bundleMerkle.mjs";
import { fanoutDigest, crossingDigest } from "./receiptBuilder.mjs";
import { normalizeScope, scopeLeq, pathScope } from "./scopeLattice.mjs";

const B = (raw, reason, detail) => ({ raw, reason, ...(detail ? { detail } : {}) });
const GREEN = { raw: 0, reason: "green" };

function isReceiptShape(r) {
  return r && typeof r === "object" && r.schema === SCHEMAS.HOP_RECEIPT;
}
function hasBothSigFields(r) {
  return (
    Object.prototype.hasOwnProperty.call(r, "signature_delegator") &&
    Object.prototype.hasOwnProperty.call(r, "signature_delegatee")
  );
}

// Resolve a PEM in the index to a KeyObject, or null if absent/unusable.
function makeResolver(index) {
  const cache = new Map();
  return (digest) => {
    if (cache.has(digest)) return cache.get(digest);
    const pem = index[digest];
    let key = null;
    if (typeof pem === "string") {
      try {
        key = crypto.createPublicKey(pem);
      } catch {
        key = null;
      }
    }
    cache.set(digest, key);
    return key;
  };
}

function pathReceipts(treeIndex, nodeDigest) {
  const chain = [];
  let cur = nodeDigest;
  const seen = new Set();
  while (cur && treeIndex.byDigest.has(cur) && !seen.has(cur)) {
    seen.add(cur);
    const r = treeIndex.byDigest.get(cur);
    chain.push(r);
    cur = r.parent_receipt_digest;
  }
  return chain.reverse(); // root .. node
}

export function evaluateChain(bundle, opts = {}) {
  // ---- 100: bundle + artifact schema, signature fields, key index ----
  if (!bundle || typeof bundle !== "object" || bundle.schema !== SCHEMAS.CHAIN_BUNDLE) {
    return B(100, "chain_bundle_schema_invalid");
  }
  const tree = bundle.tree_receipts;
  const detached = bundle.detached_receipts;
  const fanouts = bundle.fanout_commitments;
  const crossings = bundle.crossing_artifacts;
  if (![tree, detached, fanouts, crossings].every(Array.isArray)) {
    return B(100, "chain_bundle_schema_invalid");
  }
  const pkIndex = opts.publicKeyIndex || bundle.public_key_index;
  if (!pkIndex || typeof pkIndex !== "object") {
    return B(100, "public_key_index_missing_or_malformed");
  }
  for (const r of [...tree, ...detached]) {
    if (!isReceiptShape(r)) return B(100, "receipt_schema_invalid");
    if (!hasBothSigFields(r)) return B(100, "required_signature_field_missing");
  }
  for (const c of fanouts) {
    if (!c || c.schema !== SCHEMAS.FANOUT_COMMITMENT)
      return B(100, "fanout_commitment_schema_invalid");
    const d = c.declared_child_receipt_digests;
    if (!Array.isArray(d) || new Set(d).size !== d.length) {
      return B(100, "duplicate_declared_child_digests");
    }
    if (!Object.prototype.hasOwnProperty.call(c, "signature_delegator")) {
      return B(100, "required_signature_field_missing");
    }
  }
  for (const a of crossings) {
    if (!a || a.schema !== SCHEMAS.CROSSING_ARTIFACT)
      return B(100, "crossing_artifact_schema_invalid");
    if (!Object.prototype.hasOwnProperty.call(a, "signature_actor")) {
      return B(100, "required_signature_field_missing");
    }
  }

  const resolve = makeResolver(pkIndex);

  // Digest maps.
  const treeByDigest = new Map(tree.map((r) => [receiptDigest(r), r]));
  const detachedByDigest = new Map(detached.map((r) => [receiptDigest(r), r]));

  // ---- 101: every dual signature, fanout signature, resolvable crossing sig ----
  for (const r of [...tree, ...detached]) {
    const dPub = resolve(r.delegator_key_digest);
    const ePub = resolve(r.delegatee_key_digest);
    if (!dPub || !ePub) return B(101, "referenced_public_key_unverifiable");
    const v = verifyDualSignature(r, dPub, ePub);
    if (!v.ok) return B(101, "signature_invalid");
  }
  for (const c of fanouts) {
    const dPub = resolve(c.delegator_key_digest);
    if (!dPub) return B(101, "referenced_public_key_unverifiable");
    if (!verifyFanoutSignature(c, dPub).ok) return B(101, "signature_invalid");
  }
  // Crossing signatures: only for crossings whose bound resolves (tree or detached).
  // The actor key is INFERRED from the bound receipt's delegatee (spec §3.3).
  for (const a of crossings) {
    const bound = a.bound_receipt_digest;
    const boundReceipt = treeByDigest.get(bound) || detachedByDigest.get(bound);
    if (!boundReceipt) continue; // empty/unknown -> deferred to 112
    const actorPub = resolve(boundReceipt.delegatee_key_digest);
    if (!actorPub) return B(101, "referenced_public_key_unverifiable");
    if (!verifyCrossingSignature(a, actorPub).ok) return B(101, "signature_invalid");
  }

  // ---- 102/103/113/104/105: tree invariants over tree_receipts only ----
  const treeIndex = indexBundle(tree);
  const treeVerdict = verifyTreeInvariants(treeIndex);
  if (treeVerdict.raw !== 0) return treeVerdict;

  // ---- 106/107: fan-out commitments ----
  const fanoutVerdict = verifyFanoutCommitments(treeIndex, fanouts);
  if (fanoutVerdict.raw !== 0) return fanoutVerdict;

  // ---- binding partition (deferral rule) ----
  const resolved = [];
  const receiptless = [];
  const orphan = [];
  for (const a of crossings) {
    const bound = a.bound_receipt_digest;
    if (treeIndex.byDigest.has(bound)) resolved.push(a);
    else if (typeof bound === "string" && bound.length > 0 && detachedByDigest.has(bound))
      orphan.push(a);
    else receiptless.push(a);
  }

  // ---- 108: scope attenuation (edges + resolved crossings) ----
  for (const [d, r] of treeIndex.byDigest) {
    if (r.parent_receipt_digest === null) continue;
    const parent = treeIndex.byDigest.get(r.parent_receipt_digest);
    if (!scopeLeq(r.scope, parent.scope)) return B(108, "scope_attenuation_violation", { node: d });
  }
  for (const a of resolved) {
    const ps = pathScope(pathReceipts(treeIndex, a.bound_receipt_digest).map((r) => r.scope));
    if (!scopeLeq(normalizeScope(a.requested_scope), ps)) {
      return B(108, "scope_attenuation_violation", { crossing: a.bound_receipt_digest });
    }
  }

  // ---- 110/109: flux over resolved crossings ----
  const fluxVerdict = verifyFlux(treeIndex, resolved);
  if (fluxVerdict.raw !== 0) return fluxVerdict;

  // ---- 112 then 111: binding phase ----
  if (receiptless.length > 0) return B(112, "receiptless_authority_crossing");
  if (orphan.length > 0) {
    return B(111, "ghost_hop_detected", { orphan_binding: orphan[0].bound_receipt_digest });
  }

  // ---- 114: epoch replay ----
  for (const r of [...tree, ...detached]) {
    if (r.epoch !== bundle.epoch) return B(114, "epoch_replay", { node: receiptDigest(r) });
  }
  for (const a of crossings) if (a.epoch !== bundle.epoch) return B(114, "epoch_replay");

  // ---- 115: root replay (run_id + root identity) ----
  const rootDigest = treeIndex.rootDigest;
  for (const [d, r] of treeIndex.byDigest) {
    if (r.run_id !== bundle.run_id) return B(115, "root_replay", { node: d });
    const expected = r.parent_receipt_digest === null ? ROOT_SENTINEL : rootDigest;
    if (r.root_receipt_digest !== expected) return B(115, "root_replay", { node: d });
  }

  // ---- 116: spine ref integrity ----
  const spineSet = new Set(bundle.spine_index);
  for (const r of tree) {
    for (const v of Object.values(r.spine_refs || {})) {
      if (v !== null && !spineSet.has(v)) return B(116, "spine_ref_mismatch", { ref: v });
    }
  }

  // ---- 117: bundle merkle recompute over all four sealed arrays ----
  const leaves = [
    ...tree.map(receiptDigest),
    ...detached.map(receiptDigest),
    ...fanouts.map(fanoutDigest),
    ...crossings.map(crossingDigest),
  ];
  if (bundle.bundle_merkle_root !== bundleRoot(leaves)) {
    return B(117, "merkle_bundle_mismatch");
  }

  return GREEN;
}

// Typed fail-closed wrapper (spec §11): any thrown error -> 118.
export function evaluateChainSafe(bundle, opts = {}) {
  try {
    return evaluateChain(bundle, opts);
  } catch {
    return B(118, "internal_fail_closed");
  }
}
