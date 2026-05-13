import crypto from "node:crypto";

export const CHAIN_CAP = 5000;

export function createChain() {
  return { prevHash: "GENESIS", entries: [], truncated: false };
}

export function appendEntry(chain, hmacKey, type, payload) {
  if (chain.truncated) return;
  if (chain.entries.length >= CHAIN_CAP) {
    chain.truncated = true;
    return;
  }
  const entry = {
    seq: chain.entries.length,
    ts: Date.now(),
    type,
    payload,
    prev: chain.prevHash,
  };
  const sig = crypto.createHmac("sha256", hmacKey).update(JSON.stringify(entry)).digest("hex");
  entry.sig = sig;
  chain.entries.push(entry);
  chain.prevHash = sig;
}

export function verifyChain(chain, hmacKey) {
  const errors = [];
  let prevHash = "GENESIS";

  for (const entry of chain.entries) {
    const { sig, ...rest } = entry;
    const expected = crypto
      .createHmac("sha256", hmacKey)
      .update(JSON.stringify(rest))
      .digest("hex");
    if (expected !== sig) {
      errors.push(`Entry seq=${entry.seq} signature mismatch`);
    }
    if (rest.prev !== prevHash) {
      errors.push(`Entry seq=${entry.seq} prev hash mismatch`);
    }
    prevHash = sig;
  }

  return { valid: errors.length === 0, errors };
}
