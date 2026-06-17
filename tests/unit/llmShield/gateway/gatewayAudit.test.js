import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createChain, verifyChain } from "../../../../src/audit/hmacChain.js";
import {
  GATEWAY_EVENTS,
  recordGatewaySessionCreated,
  recordGatewayRun,
  recordGatewayReceiptExported,
} from "../../../../src/llmShield/gateway/gatewayAudit.js";

const base = {
  inputVerdict: "safe",
  contextVerdict: "not_supplied",
  providerCalled: true,
  providerResponseKind: "text",
  toolGateVerdict: "not_requested",
  outputFirewallVerdict: "accepted",
  riskVerdict: "safe",
  reasonCodes: [],
  inputHash: "sha256:i",
  normalisedInputHash: "sha256:n",
  contextHashes: [],
  toolNameHash: null,
  providerResponseHash: "sha256:p",
  outputHash: "sha256:o",
};

describe("gatewayAudit", () => {
  test("mock accepted run order", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayRun(chain, key, base);
    assert.deepEqual(
      chain.entries.map((e) => e.type),
      [
        GATEWAY_EVENTS.LLM_GATEWAY_REQUEST_ACCEPTED,
        GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CALLED,
        GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_OUTPUT_HASHED,
        GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED,
        GATEWAY_EVENTS.LLM_GATEWAY_RISK_ACCUMULATED,
      ]
    );
    assert.equal(verifyChain(chain, key).valid, true);
  });
  test("tool-blocked run still records OUTPUT_HASHED before tool events", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayRun(chain, key, {
      ...base,
      providerResponseKind: "tool_request",
      toolGateVerdict: "blocked",
      toolNameHash: "sha256:t",
      riskVerdict: "warning",
      reasonCodes: ["tool_shell_blocked"],
    });
    const types = chain.entries.map((e) => e.type);
    const hi = types.indexOf(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_OUTPUT_HASHED);
    const ti = types.indexOf(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_TOOL_REQUEST_DETECTED);
    assert.ok(hi !== -1, "OUTPUT_HASHED must be present");
    assert.ok(hi < ti, "OUTPUT_HASHED must precede TOOL_REQUEST_DETECTED");
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_TOOL_BLOCKED));
  });
  test("output-blocked run emits OUTPUT_BLOCKED not ACCEPTED", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayRun(chain, key, {
      ...base,
      outputFirewallVerdict: "blocked",
      riskVerdict: "warning",
      reasonCodes: ["output_system_prompt_leakage"],
    });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_BLOCKED));
    assert.ok(!types.includes(GATEWAY_EVENTS.LLM_GATEWAY_OUTPUT_ACCEPTED));
  });
  test("provider-skipped run (live fail-closed) emits CONFIG_REJECTED + SKIPPED", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayRun(chain, key, {
      ...base,
      providerCalled: false,
      providerConfigRejected: true,
      reasonCodes: ["gateway_live_provider_not_implemented"],
    });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_CONFIG_REJECTED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_PROVIDER_SKIPPED));
  });
  test("session created + receipt exported events", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewaySessionCreated(chain, key);
    recordGatewayReceiptExported(chain, key, "sha256:r");
    assert.equal(chain.entries[0].type, GATEWAY_EVENTS.LLM_GATEWAY_SESSION_CREATED);
    assert.equal(chain.entries.at(-1).type, GATEWAY_EVENTS.LLM_GATEWAY_RECEIPT_EXPORTED);
    assert.equal(chain.entries.at(-1).payload.receipt_hash, "sha256:r");
  });
});
