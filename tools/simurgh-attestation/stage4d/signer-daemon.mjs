#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";
import { createInterface } from "node:readline";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildReceipt, signReceiptPayload, validateReceiptPayload } from "./receipt.mjs";
import { signPack } from "./packBuilder.mjs";
import { publicKeyFingerprint } from "./stage4dCrypto.mjs";

function arg(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

function respond(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function createDaemon({ argv = process.argv.slice(2) } = {}) {
  const privateKeyPath = arg(argv, "--private-key");
  const runId = arg(argv, "--run-id");
  if (!privateKeyPath || !runId) {
    throw new Error("usage: signer-daemon --private-key <pem> --run-id <run-id>");
  }
  const privateKey = crypto.createPrivateKey(await readFile(privateKeyPath, "utf8"));
  const publicKeyPem = crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" });

  return {
    handle(request) {
      if (!request || typeof request !== "object") throw new Error("request_invalid");
      if (request.type === "public_key") {
        return {
          ok: true,
          public_key_pem: publicKeyPem,
          fingerprint: publicKeyFingerprint(publicKeyPem),
        };
      }
      if (request.type === "sign_receipt") {
        const valid = validateReceiptPayload(request.payload);
        if (!valid.ok) throw new Error(valid.reason);
        if (request.payload.run_id !== runId) throw new Error("run_id_mismatch");
        return {
          ok: true,
          receipt: buildReceipt(request.payload, signReceiptPayload(request.payload, privateKey)),
        };
      }
      if (request.type === "sign_pack") {
        const pack = request.pack;
        if (!pack || pack.pack_version !== "simurgh.evidence_pack.v1") {
          throw new Error("pack_schema_invalid");
        }
        if (pack.run_manifest?.run_id !== runId) throw new Error("run_id_mismatch");
        return { ok: true, signature: signPack(pack, privateKey) };
      }
      throw new Error("unsupported_signer_payload_type");
    },
  };
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const daemon = await createDaemon({ argv });
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let request;
    try {
      request = JSON.parse(line);
      respond({ id: request.id, ...daemon.handle(request) });
    } catch (error) {
      respond({
        id: request?.id ?? null,
        ok: false,
        error: error instanceof Error ? error.message : "signer_error",
      });
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("stage4d signer:", error.message);
    process.exit(2);
  });
}
