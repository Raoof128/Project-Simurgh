// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

function hashBytes(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("invalid_merkle_leaf");
  return Buffer.from(hex, "hex");
}

export function merkleRoot(hexLeaves) {
  if (!Array.isArray(hexLeaves) || hexLeaves.length === 0) return "0".repeat(64);
  let level = hexLeaves.map((leaf) =>
    hashBytes(Buffer.concat([Buffer.from([0x00]), hexToBytes(leaf)]))
  );
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] || level[i];
      next.push(hashBytes(Buffer.concat([Buffer.from([0x01]), left, right])));
    }
    level = next;
  }
  return level[0].toString("hex");
}
