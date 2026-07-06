// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S Lane B orchestrator (process A). Motto: AnthropicSafe First, then
// ReviewerSafe. Generates an EPHEMERAL delegator/root key, spawns the delegatee
// MCP server as a SECOND OS PROCESS, performs a genuine MCP stdio handshake +
// tools/call (the real A->B delegation hop), then assembles and evaluates the
// chain bundle offline. Ephemeral scalars never touch disk (4R rail); stdio
// transport avoids the port-flake class entirely (3V-A lesson).
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  keyDigest,
  buildHopReceipt,
  dualSign,
  signDelegator,
  signFanout,
  assembleChainBundle,
} from "../core/receiptBuilder.mjs";
import { receiptDigest } from "../core/treeCore.mjs";
import { buildFanoutCommitment } from "../core/fanoutCore.mjs";
import { evaluateChainSafe } from "../core/chainCore.mjs";
import { ROOT_SENTINEL } from "../constants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "delegatee-mcp-server.mjs");
const EPOCH = "win-2026-07-06";
const RUN = "laneb-run";

export async function runCeremony({ task = "summarise the Q3 numbers" } = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const aPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const aDigest = keyDigest(aPem);

  const child = spawn(process.execPath, [SERVER], { stdio: ["pipe", "pipe", "inherit"] });
  const send = (obj) => child.stdin.write(JSON.stringify(obj) + "\n");

  const pending = new Map();
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });
  const rpc = (id, method, params) =>
    new Promise((resolve) => {
      pending.set(id, resolve);
      send({ jsonrpc: "2.0", id, method, params });
    });

  try {
    // Real MCP handshake.
    const init = await rpc(1, "initialize", { protocolVersion: "2025-06-18", capabilities: {} });
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    await rpc(2, "tools/list", {});
    const bDigest = init.result.serverInfo.delegatee_key_digest;
    const bPem = init.result.serverInfo.delegatee_key_pem;

    // Root receipt: A self-delegates the window authority.
    const root = dualSign(
      buildHopReceipt({
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        rootReceiptDigest: ROOT_SENTINEL,
        parentReceiptDigest: null,
        delegatorKeyDigest: aDigest,
        delegateeKeyDigest: aDigest,
        scope: ["task.record"],
        budgetAllocated: 5,
      }),
      privateKey,
      privateKey
    );
    const rd = receiptDigest(root);

    // A->B hop: A signs as delegator; B co-signs over the wire.
    const hopUnsigned = buildHopReceipt({
      epoch: EPOCH,
      runId: RUN,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: aDigest,
      delegateeKeyDigest: bDigest,
      scope: ["task.record"],
      budgetAllocated: 2,
    });
    const hopDelegatorSigned = signDelegator(hopUnsigned, privateKey);

    const call = await rpc(3, "tools/call", {
      name: "record_delegated_task",
      arguments: { receipt_unsigned: hopDelegatorSigned, task },
    });
    const { hop_signed, crossing_signed, leaf_fanout_signed, pid: childPid } = call.result;

    // A closes the window: commits its fan-out over the (now known) hop digest.
    const rootFanout = signFanout(
      buildFanoutCommitment({
        epoch: EPOCH,
        runId: RUN,
        windowId: "w1",
        delegatorKeyDigest: aDigest,
        nodeReceiptDigest: rd,
        childReceiptDigests: [receiptDigest(hop_signed)],
      }),
      privateKey
    );

    const bundle = assembleChainBundle({
      epoch: EPOCH,
      runId: RUN,
      treeReceipts: [root, hop_signed],
      detachedReceipts: [],
      fanouts: [rootFanout, leaf_fanout_signed],
      crossings: [crossing_signed],
      publicKeyIndex: { [aDigest]: aPem, [bDigest]: bPem },
      spineIndex: [],
    });
    const verdict = evaluateChainSafe(bundle);

    return {
      bundle,
      verdict,
      transport: "mcp_stdio_jsonrpc2",
      process_isolation: {
        parent_pid_captured: true,
        parent_pid: process.pid,
        child_pid: childPid,
      },
      delegator_key_digest: aDigest,
      delegatee_key_digest: bDigest,
    };
  } finally {
    child.stdin.end();
    child.kill();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = join(
    HERE,
    "../../../../docs/research/llm-shield/evidence/stage-4s/laneb/laneb-capture.json"
  );
  runCeremony().then((res) => {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, canonicalJson(res) + "\n");
    console.error(
      `stage4s lane B: verdict raw=${res.verdict.raw}, pids ${res.process_isolation.parent_pid}/${res.process_isolation.child_pid}`
    );
    process.exit(res.verdict.raw === 0 ? 0 : 1);
  });
}
