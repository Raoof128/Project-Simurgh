// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildReceipt, signReceiptPayload, validateReceiptPayload } from "./receipt.mjs";

export function createStage4dSigner({ privateKey, runId }) {
  const key = typeof privateKey === "string" || Buffer.isBuffer(privateKey) ? crypto.createPrivateKey(privateKey) : privateKey;
  return {
    signReceipt(payload) {
      const valid = validateReceiptPayload(payload);
      if (!valid.ok) throw new Error(valid.reason);
      if (payload.run_id !== runId) throw new Error("run_id_mismatch");
      const signature = signReceiptPayload(payload, key);
      return buildReceipt(payload, signature);
    },
  };
}

export async function loadSignerFromPem({ privateKeyPath, runId }) {
  const privateKey = await readFile(privateKeyPath, "utf8");
  return createStage4dSigner({ privateKey, runId });
}
