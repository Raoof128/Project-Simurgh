import assert from "node:assert/strict";
import test from "node:test";

import {
  createSimurghClient,
  SIMURGH_DAEMON_STATES,
} from "../../public/sdk/simurgh-browser-sdk.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test("browser SDK reports missing when daemon discovery fails", async () => {
  const calls = [];
  const client = createSimurghClient({
    serverBaseUrl: "http://server.test",
    daemonBaseUrl: "http://127.0.0.1:3031",
    fetchImpl: async (url) => {
      calls.push(String(url));
      throw new Error("offline");
    },
  });

  const result = await client.discover();

  assert.equal(result.state, "missing");
  assert.equal(client.getState().state, "missing");
  assert.deepEqual(calls, ["http://127.0.0.1:3031/health"]);
  assert.ok(SIMURGH_DAEMON_STATES.includes("missing"));
});

test("browser SDK pairs daemon through server challenge and server verification", async () => {
  const calls = [];
  const client = createSimurghClient({
    serverBaseUrl: "http://server.test",
    daemonBaseUrl: "http://127.0.0.1:3031",
    sessionToken: "tok",
    sessionId: "sess_sdk",
    examId: "exam_sdk",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
      if (String(url).endsWith("/health")) return jsonResponse({ ok: true });
      if (String(url).endsWith("/status")) return jsonResponse({ paired: false });
      if (String(url).endsWith("/api/device/challenge"))
        return jsonResponse({ challenge: "pair-challenge" });
      if (String(url).endsWith("/pair")) {
        return jsonResponse({
          ok: true,
          node_id_hash: "sha256:abc",
          public_key: "pub",
          signed_payload: { type: "simurgh.daemon.pair" },
          signature: "sig",
        });
      }
      if (String(url).endsWith("/api/device/pair")) return jsonResponse({ ok: true });
      throw new Error("unexpected " + url);
    },
  });

  await client.discover();
  const pair = await client.pair();

  assert.equal(pair.state, "paired");
  assert.equal(client.getState().nodeIdHash, "sha256:abc");
  assert.equal(calls.at(-1).body.node_id_hash, "sha256:abc");
});

test("browser SDK fetches proof and sends telemetry with daemon proof", async () => {
  const client = createSimurghClient({
    serverBaseUrl: "http://server.test",
    daemonBaseUrl: "http://127.0.0.1:3031",
    sessionToken: "tok",
    sessionId: "sess_sdk",
    examId: "exam_sdk",
    fetchImpl: async (url, options = {}) => {
      if (String(url).endsWith("/api/device/challenge"))
        return jsonResponse({ challenge: "proof-challenge" });
      if (String(url).endsWith("/proof")) {
        return jsonResponse({
          ok: true,
          daemon_proof: { type: "simurgh.daemon.proof", sequence: 7 },
        });
      }
      if (String(url).endsWith("/api/telemetry")) {
        const body = JSON.parse(options.body);
        assert.equal(body.daemon_proof.sequence, 7);
        assert.equal(options.headers.authorization, "Bearer tok");
        return jsonResponse({ risk_level: "Safe", reasoning: "ok" });
      }
      throw new Error("unexpected " + url);
    },
  });
  client.setDaemonAvailable({ paired: true, node_id_hash: "sha256:abc" });

  const result = await client.sendTelemetry({
    sequence: 7,
    telemetry: { keystrokes: 1 },
    timestamp: 1234,
  });

  assert.equal(result.risk_level, "Safe");
  assert.equal(client.getState().state, "proof_ready");
});

test("browser SDK blocks hardened telemetry when daemon proof is unavailable", async () => {
  const client = createSimurghClient({
    serverBaseUrl: "http://server.test",
    daemonBaseUrl: "http://127.0.0.1:3031",
    sessionToken: "tok",
    sessionId: "sess_sdk",
    examId: "exam_sdk",
    requireDaemon: true,
    fetchImpl: async (url) => {
      if (String(url).endsWith("/api/device/challenge"))
        return jsonResponse({ challenge: "proof-challenge" });
      if (String(url).endsWith("/proof")) return jsonResponse({ ok: false }, 500);
      throw new Error("telemetry should not be sent without proof");
    },
  });
  client.setDaemonAvailable({ paired: true, node_id_hash: "sha256:abc" });

  await assert.rejects(
    () => client.sendTelemetry({ sequence: 1, telemetry: { keystrokes: 1 } }),
    /daemon_proof_required/
  );
  assert.equal(client.getState().state, "missing");
});

test("browser SDK marks daemon untrusted when server rejects a proof", async () => {
  const client = createSimurghClient({
    serverBaseUrl: "http://server.test",
    daemonBaseUrl: "http://127.0.0.1:3031",
    sessionToken: "tok",
    sessionId: "sess_sdk",
    examId: "exam_sdk",
    fetchImpl: async (url) => {
      if (String(url).endsWith("/api/device/challenge"))
        return jsonResponse({ challenge: "proof-challenge" });
      if (String(url).endsWith("/proof")) {
        return jsonResponse({
          ok: true,
          daemon_proof: { type: "simurgh.daemon.proof", sequence: 1 },
        });
      }
      if (String(url).endsWith("/api/telemetry"))
        return jsonResponse({ error: "daemon_proof_replayed" }, 409);
      throw new Error("unexpected " + url);
    },
  });
  client.setDaemonAvailable({ paired: true, node_id_hash: "sha256:abc" });

  await assert.rejects(
    () => client.sendTelemetry({ sequence: 1, telemetry: { keystrokes: 1 } }),
    /409/
  );
  assert.equal(client.getState().state, "untrusted");
});
