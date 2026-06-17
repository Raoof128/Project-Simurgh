import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  STAGE3D_SCHEMA_VERSION,
  buildStage3dReceipt,
  hashStage3dReceipt,
} from "../../../src/llmShield/stage3dReceipt.js";

const ARGS = {
  sessionIdHash: "sha256:s",
  runId: "run_001",
  taskType: "general_qa",
  inputHash: "sha256:i",
  normalisedInputHash: "sha256:n",
  inputVerdict: "safe",
  contextVerdict: "demoted",
  contextCount: 1,
  contextHashes: ["sha256:c1"],
  providerCalled: true,
  scenario: "tool_escalation",
  toolGateVerdict: "blocked",
  toolNameHash: "sha256:t",
  outputFirewallVerdict: "accepted",
  outputHash: "sha256:o",
  riskScore: 7,
  riskVerdict: "blocked",
  reasonCodes: ["context_demoted_to_data", "tool_shell_blocked"],
  auditEntryHash: "sha256:a",
  timestamp: "2026-06-17T00:00:00.000Z",
};

describe("stage3dReceipt", () => {
  test("builds a metadata-only 3D receipt with the v1 type and 3D schema", () => {
    const r = buildStage3dReceipt(ARGS);
    assert.equal(r.type, "simurgh.llm_safety_receipt.v1");
    assert.equal(r.schema_version, "3D");
    assert.equal(STAGE3D_SCHEMA_VERSION, "3D");
    assert.equal(r.provider_mode, "mock");
    assert.equal(r.privacy_mode, "metadata_only");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.tool_gate_verdict, "blocked");
    assert.equal(r.tool_called, false);
    assert.equal(r.risk_verdict, "blocked");
    assert.deepEqual(r.context_hashes, ["sha256:c1"]);
  });

  test("carries no raw-text keys", () => {
    const r = buildStage3dReceipt(ARGS);
    const json = JSON.stringify(r);
    assert.ok(!/"input"\s*:/.test(json));
    assert.ok(!/"output"\s*:/.test(json));
    assert.ok(!/"content"\s*:/.test(json));
  });

  test("hashStage3dReceipt is deterministic and sha256-prefixed", () => {
    const r = buildStage3dReceipt(ARGS);
    assert.equal(hashStage3dReceipt(r), hashStage3dReceipt(r));
    assert.match(hashStage3dReceipt(r), /^sha256:[0-9a-f]{64}$/);
  });
});
