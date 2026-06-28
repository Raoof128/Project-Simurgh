// SPDX-License-Identifier: AGPL-3.0-or-later
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export class Stage4dSignerProcess {
  constructor({ privateKeyPath, runId }) {
    this.nextId = 1;
    this.pending = new Map();
    this.child = spawn(process.execPath, [
      fileURLToPath(new URL("./signer-daemon.mjs", import.meta.url)),
      "--private-key",
      privateKeyPath,
      "--run-id",
      runId,
    ]);
    this.child.once("exit", (code, signal) => {
      const error = new Error(`signer_process_exited:${code ?? signal}`);
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
    this.child.once("error", (error) => {
      for (const { reject } of this.pending.values()) reject(error);
      this.pending.clear();
    });
    createInterface({ input: this.child.stdout, crlfDelay: Infinity }).on("line", (line) => {
      const response = JSON.parse(line);
      const entry = this.pending.get(response.id);
      if (!entry) return;
      this.pending.delete(response.id);
      if (response.ok) entry.resolve(response);
      else entry.reject(new Error(response.error || "signer_error"));
    });
  }

  request(message) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin.write(`${JSON.stringify({ id, ...message })}\n`, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  async publicKey() {
    return this.request({ type: "public_key" });
  }

  async signReceipt(payload) {
    const response = await this.request({ type: "sign_receipt", payload });
    return response.receipt;
  }

  async signPack(pack) {
    const response = await this.request({ type: "sign_pack", pack });
    return response.signature;
  }

  close() {
    this.child.stdin.end();
  }
}

export async function withSignerProcess(options, callback) {
  const signer = new Stage4dSignerProcess(options);
  try {
    return await callback(signer);
  } finally {
    signer.close();
  }
}
