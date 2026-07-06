// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S Lane B delegatee (process B): a REAL MCP-style stdio JSON-RPC 2.0
// server (initialize -> tools/list -> tools/call), newline-delimited framing
// (matching stage4o/node/capture-mcp-manifest.mjs). Motto: AnthropicSafe First,
// then ReviewerSafe. On tools/call it generates an EPHEMERAL Ed25519 key (never
// written to disk — 4R rail), co-signs the delegator's hop receipt as the
// delegatee, performs a tool_execution crossing under the received scope/budget,
// and signs its own zero-fanout leaf commitment.
import crypto from "node:crypto";
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { keyDigest, signDelegatee, signCrossing, signFanout } from "../core/receiptBuilder.mjs";
import { receiptDigest } from "../core/treeCore.mjs";
import { buildFanoutCommitment } from "../core/fanoutCore.mjs";
import { SCHEMAS } from "../constants.mjs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const PEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const DIGEST = keyDigest(PEM);

const send = (obj) => process.stdout.write(JSON.stringify(obj) + "\n");

function handle(msg) {
  if (msg.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        protocolVersion: "2025-06-18",
        serverInfo: {
          name: "vdcc-delegatee",
          delegatee_key_pem: PEM,
          delegatee_key_digest: DIGEST,
        },
        capabilities: { tools: {} },
      },
    });
  } else if (msg.method === "notifications/initialized") {
    // no response
  } else if (msg.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        tools: [
          {
            name: "record_delegated_task",
            description: "Co-sign the delegation hop and record the delegated task under it.",
            inputSchema: { type: "object", properties: { task: { type: "string" } } },
          },
        ],
      },
    });
  } else if (msg.method === "tools/call" && msg.params?.name === "record_delegated_task") {
    const { receipt_unsigned: hop, task } = msg.params.arguments;
    const hopSigned = signDelegatee(hop, privateKey); // co-sign as delegatee
    const hopDigest = receiptDigest(hopSigned);
    const crossing = signCrossing(
      {
        schema: SCHEMAS.CROSSING_ARTIFACT,
        epoch: hop.epoch,
        run_id: hop.run_id,
        crossing_kind: "tool_execution",
        bound_receipt_digest: hopDigest,
        requested_scope: hop.scope,
        spend: 1,
        payload_digest: recordDigest({ task: String(task ?? "") }),
        signature_actor: "",
      },
      privateKey
    );
    const leafFanout = signFanout(
      buildFanoutCommitment({
        epoch: hop.epoch,
        runId: hop.run_id,
        windowId: hop.window_id,
        delegatorKeyDigest: DIGEST,
        nodeReceiptDigest: hopDigest,
        childReceiptDigests: [],
      }),
      privateKey
    );
    send({
      jsonrpc: "2.0",
      id: msg.id,
      result: {
        hop_signed: hopSigned,
        crossing_signed: crossing,
        leaf_fanout_signed: leafFanout,
        delegatee_key_pem: PEM,
        delegatee_key_digest: DIGEST,
        pid: process.pid,
      },
    });
  } else if (msg.id !== undefined) {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "method not found" } });
  }
}

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  let nl;
  while ((nl = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) {
      try {
        handle(JSON.parse(line));
      } catch {
        // ignore malformed lines
      }
    }
  }
});
