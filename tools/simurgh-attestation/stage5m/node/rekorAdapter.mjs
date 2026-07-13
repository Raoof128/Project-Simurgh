// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — real Rekor transparency-log crypto (Node-native, no network, no openssl subprocess). Ports the
// gate-verified algorithm: RFC6962 inclusion (0x00 leaf / 0x01 node) → checkpoint note ECDSA vs the PINNED
// log key → SET ECDSA → submitter ECDSA vs the PINNED expected key. EXPECTED evidence defects become typed
// {ok:false, reason} facts (never a throw → never 395); assertions are for programmer invariants only.
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

const sha256 = (buf) => createHash("sha256").update(buf).digest();

function ecdsaVerify(pubPem, derSig, message) {
  try {
    const key = createPublicKey(pubPem);
    return cryptoVerify("sha256", Buffer.from(message), key, Buffer.from(derSig));
  } catch {
    return false;
  }
}

// RFC6962 inclusion root from a leaf at shard_leaf_index in a tree of tree_size.
export function rfc6962Root(leafHash, shardLeafIndex, treeSize, proofHashes) {
  let idx = shardLeafIndex;
  let sz = treeSize;
  let h = leafHash;
  let pi = 0;
  while (sz > 1) {
    if (idx % 2 === 1) {
      h = sha256(Buffer.concat([Buffer.from([0x01]), proofHashes[pi++], h]));
    } else if (idx + 1 < sz) {
      h = sha256(Buffer.concat([Buffer.from([0x01]), h, proofHashes[pi++]]));
    }
    idx = Math.floor(idx / 2);
    sz = Math.ceil(sz / 2);
  }
  if (pi !== proofHashes.length) throw new Error("proof hash count mismatch"); // programmer invariant
  return h;
}

// Verify inclusion → { ok, reason }. Typed reasons match the 387 bounded enum.
export function verifyInclusion(seat) {
  const ip = seat.inclusionProof;
  if (!Number.isInteger(ip.logIndex) || !Number.isInteger(ip.treeSize))
    return { ok: false, reason: "tree_size_invalid" };
  if (ip.logIndex < 0 || ip.logIndex >= ip.treeSize)
    return { ok: false, reason: "log_index_out_of_range" };
  let proof;
  try {
    proof = ip.hashes.map((x) => Buffer.from(x, "hex"));
  } catch {
    return { ok: false, reason: "inclusion_hash_malformed" };
  }
  const leaf = sha256(Buffer.concat([Buffer.from([0x00]), Buffer.from(seat.body, "base64")]));
  let root;
  try {
    root = rfc6962Root(leaf, ip.logIndex, ip.treeSize, proof);
  } catch {
    return { ok: false, reason: "inclusion_path_length_invalid" };
  }
  if (root.toString("hex") !== ip.rootHash) return { ok: false, reason: "inclusion_root_mismatch" };
  return { ok: true, reason: null };
}

// Verify the checkpoint (signed tree head) under the PINNED Rekor key → { ok, reason } (388 enum).
export function verifyCheckpoint(seat, rekorPubPem) {
  const ip = seat.inclusionProof;
  const ck = ip.checkpoint;
  const sepIdx = ck.indexOf("\n\n");
  if (sepIdx < 0) return { ok: false, reason: "checkpoint_note_malformed" };
  const noteBody = ck.slice(0, sepIdx);
  const lines = noteBody.split("\n");
  if (lines.length < 3) return { ok: false, reason: "checkpoint_note_malformed" };
  const ckSize = Number(lines[1]);
  const ckRoot = Buffer.from(lines[2], "base64").toString("hex");
  if (ckSize !== ip.treeSize) return { ok: false, reason: "checkpoint_tree_size_mismatch" };
  if (ckRoot !== ip.rootHash) return { ok: false, reason: "checkpoint_root_mismatch" };
  const sigLine = ck
    .slice(sepIdx + 2)
    .split("\n")
    .find((l) => l.startsWith("— "));
  if (!sigLine) return { ok: false, reason: "checkpoint_note_malformed" };
  const raw = Buffer.from(sigLine.split(" ", 3)[2], "base64");
  const der = raw.subarray(4); // strip 4-byte key hint
  if (!ecdsaVerify(rekorPubPem, der, noteBody + "\n"))
    return { ok: false, reason: "checkpoint_signature_invalid" };
  return { ok: true, reason: null };
}

// Verify the signedEntryTimestamp over the canonical entry under the PINNED Rekor key.
export function verifySet(seat, rekorPubPem, canonicalJson) {
  const canon = canonicalJson({
    body: seat.body,
    integratedTime: seat.integratedTime,
    logID: seat.logID,
    logIndex: seat.logIndex,
  });
  const der = Buffer.from(seat.signedEntryTimestamp, "base64");
  return ecdsaVerify(rekorPubPem, der, canon);
}

const fpr = (pem) =>
  "sha256:" + sha256(createPublicKey(pem).export({ type: "spki", format: "der" })).toString("hex");

// Submitter authenticity vs the PINNED expected key → { ok, reason, fpr } (390 enum).
export function verifySubmitter(anchorBytes, seat, expectedSubmitterPem) {
  const body = JSON.parse(Buffer.from(seat.body, "base64").toString("utf8"));
  let entryPem;
  try {
    entryPem = Buffer.from(body.spec.signature.publicKey.content, "base64").toString("utf8");
  } catch {
    return { ok: false, reason: "submitter_public_key_malformed", fpr: null };
  }
  const sig = Buffer.from(body.spec.signature.content, "base64");
  if (!ecdsaVerify(entryPem, sig, anchorBytes))
    return { ok: false, reason: "submitter_signature_invalid", fpr: fpr(entryPem) };
  return { ok: true, reason: null, fpr: fpr(entryPem), expected_fpr: fpr(expectedSubmitterPem) };
}
