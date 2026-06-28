// SPDX-License-Identifier: AGPL-3.0-or-later
import { signPack } from "./packBuilder.mjs";
import { ZERO_HASH } from "./constants.mjs";
import { merkleRoot } from "./merkle.mjs";
import { buildReceipt, signReceiptPayload } from "./receipt.mjs";
import { sha256Canonical } from "./stage4dCrypto.mjs";

const clone = (v) => JSON.parse(JSON.stringify(v));

function resignPack(p, privateKey) {
  const { pack_hash, ...withoutHash } = p;
  p.pack_hash = sha256Canonical(withoutHash);
  return { pack: p, signature: signPack(p, privateKey) };
}

function refreshReceiptManifests(p) {
  p.completeness_manifest.ordered_receipt_hashes = p.receipts.map((r) => r.receipt_hash);
  p.completeness_manifest.session_merkle_root = merkleRoot(
    p.completeness_manifest.ordered_receipt_hashes
  );
}

function rebuildReceiptChain(p, privateKey, startIndex) {
  let prev = startIndex === 0 ? ZERO_HASH : p.receipts[startIndex - 1].receipt_hash;
  for (let i = startIndex; i < p.receipts.length; i += 1) {
    const payload = { ...p.receipts[i].receipt_payload, prev_receipt_hash: prev };
    p.receipts[i] = buildReceipt(payload, signReceiptPayload(payload, privateKey));
    prev = p.receipts[i].receipt_hash;
  }
  refreshReceiptManifests(p);
}

export function dropOneReceipt(pack) {
  const p = clone(pack);
  p.receipts = p.receipts.slice(1);
  return p;
}

export function corruptDecision(pack) {
  const p = clone(pack);
  p.receipts[0].receipt_payload.decision =
    p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow";
  return p;
}

export function swapEmbeddedKey(pack) {
  const p = clone(pack);
  p.signer_public_key.fingerprint = "f".repeat(64);
  p.signer_public_key_fingerprint = "f".repeat(64);
  return p;
}

export function injectRawSecret(pack) {
  const p = clone(pack);
  p.raw_secret = "secret-value";
  return p;
}

export function signedDropOneReceipt({ pack, privateKey }) {
  const p = dropOneReceipt(pack);
  refreshReceiptManifests(p);
  return resignPack(p, privateKey);
}

export function signedEmbeddedKeyMismatch({ pack, privateKey }) {
  const p = swapEmbeddedKey(pack);
  return resignPack(p, privateKey);
}

export function signedRawSecret({ pack, privateKey }) {
  const p = injectRawSecret(pack);
  return resignPack(p, privateKey);
}

export function signedLyingDecision({ pack, privateKey }) {
  const p = clone(pack);
  p.receipts[0].receipt_payload = {
    ...p.receipts[0].receipt_payload,
    decision: p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow",
  };
  rebuildReceiptChain(p, privateKey, 0);
  return resignPack(p, privateKey);
}

export function signedReceiptSignatureFlip({ pack, privateKey }) {
  const p = clone(pack);
  p.receipts[0].signature = p.receipts[0].signature.startsWith("A")
    ? `B${p.receipts[0].signature.slice(1)}`
    : `A${p.receipts[0].signature.slice(1)}`;
  return resignPack(p, privateKey);
}
