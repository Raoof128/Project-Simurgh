// SPDX-License-Identifier: AGPL-3.0-or-later
import { signPack } from "./packBuilder.mjs";
import { merkleRoot } from "./merkle.mjs";
import { buildReceipt, signReceiptPayload } from "./receipt.mjs";
import { sha256Canonical } from "./stage4dCrypto.mjs";

const clone = (v) => JSON.parse(JSON.stringify(v));

export function dropOneReceipt(pack) {
  const p = clone(pack);
  p.receipts = p.receipts.slice(1);
  return p;
}

export function corruptDecision(pack) {
  const p = clone(pack);
  p.receipts[0].receipt_payload.decision = p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow";
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

export function signedLyingDecision({ pack, privateKey }) {
  const p = clone(pack);
  const payload = {
    ...p.receipts[0].receipt_payload,
    decision: p.receipts[0].receipt_payload.decision === "allow" ? "block" : "allow",
  };
  p.receipts[0] = buildReceipt(payload, signReceiptPayload(payload, privateKey));
  p.completeness_manifest.ordered_receipt_hashes = p.receipts.map((r) => r.receipt_hash);
  p.completeness_manifest.session_merkle_root = merkleRoot(p.completeness_manifest.ordered_receipt_hashes);
  const { pack_hash, ...withoutHash } = p;
  p.pack_hash = sha256Canonical(withoutHash);
  return { pack: p, signature: signPack(p, privateKey) };
}
