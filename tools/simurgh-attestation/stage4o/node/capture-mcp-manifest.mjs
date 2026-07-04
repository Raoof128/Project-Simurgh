// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O Lane B: DIGEST-ONLY capture of a real MCP server's tool surface (4O spec §10).
// LOCAL, one-time, NEVER run in CI. Speaks MCP stdio (initialize -> tools/list), hashes
// every tool name / schema through the domain-separated digest, and DISCARDS the raw text.
// The output is a digest-only manifest; raw tool descriptions never touch disk.
//
//   node capture-mcp-manifest.mjs --cmd "npx -y @modelcontextprotocol/server-filesystem /tmp"
//   node capture-mcp-manifest.mjs --cmd "..." --rugpull <tool_name_digest>   # emit a variant
//
// authority_class is assigned from a documented, conservative heuristic on the PUBLIC tool
// name (read-only names -> read_only; write/edit/move -> write; net/fetch -> egress;
// delete/remove -> destructive). The heuristic and the mapping are the only judgement; the
// digests are mechanical.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { spawn } from "node:child_process";
import { domainDigest } from "../core/digest.mjs";
import { computeToolsetRoot } from "../core/manifestCore.mjs";
import { DOMAINS, TOOL_MANIFEST_SCHEMA } from "../constants.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

const AUTHORITY_HEURISTIC = [
  [/(delete|remove|destroy|drop|unlink)/i, "destructive"],
  [/(fetch|http|network|download|upload|send|url)/i, "egress"],
  [/(write|edit|create|move|rename|append|put|set|patch)/i, "write"],
];
function authorityFor(name) {
  for (const [re, cls] of AUTHORITY_HEURISTIC) if (re.test(name)) return cls;
  return "read_only";
}

function toDigestEntry(tool) {
  return {
    tool_name_digest: domainDigest(DOMAINS.SERVER_ID, "mcp.tool_name", tool.name),
    tool_schema_digest: domainDigest(DOMAINS.SERVER_ID, "mcp.tool_schema", tool.inputSchema ?? {}),
    authority_class: authorityFor(tool.name),
    declared_sinks: [],
    risk_class: "low",
  };
}

export function toDigestManifest(serverId, tools) {
  const entries = tools
    .map(toDigestEntry)
    .sort((a, b) => (a.tool_name_digest < b.tool_name_digest ? -1 : 1));
  const m = {
    schema: TOOL_MANIFEST_SCHEMA,
    server_id_digest: domainDigest(DOMAINS.SERVER_ID, "mcp.server_id", serverId),
    toolset_digest: "sha256:" + "0".repeat(64),
    tools: entries,
  };
  m.toolset_digest = computeToolsetRoot(m);
  return m;
}

async function listToolsOverStdio(cmd) {
  const [bin, ...args] = cmd.split(" ");
  const child = spawn(bin, args, { stdio: ["pipe", "pipe", "inherit"] });
  const send = (obj) => child.stdin.write(JSON.stringify(obj) + "\n");
  send({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "simurgh-capture", version: "0" },
    },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  let buf = "";
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("capture_timeout"));
    }, 20000);
    child.stdout.on("data", (d) => {
      buf += d.toString();
      for (const line of buf.split("\n")) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === 2 && msg.result?.tools) {
          clearTimeout(timer);
          child.kill();
          resolve(msg.result.tools);
        }
      }
      buf = buf.slice(buf.lastIndexOf("\n") + 1);
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith("capture-mcp-manifest.mjs")) {
  const cmd = arg("--cmd");
  const rugpull = arg("--rugpull");
  if (!cmd) {
    console.error('usage: --cmd "<server launch command>" [--rugpull <tool_name_digest>]');
    process.exit(1);
  }
  const tools = await listToolsOverStdio(cmd);
  const manifest = toDigestManifest(cmd, tools);
  if (rugpull) {
    const t = manifest.tools.find((x) => x.tool_name_digest === rugpull);
    if (!t) {
      console.error(`rugpull target not found: ${rugpull}`);
      process.exit(1);
    }
    t.authority_class = "destructive"; // raise authority while preserving name digest
    manifest.toolset_digest = computeToolsetRoot(manifest);
  }
  process.stdout.write(
    JSON.stringify({ external_validity: true, capture_mode: "live", manifest }, null, 2) + "\n"
  );
}
