import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createChain, verifyChain } from "../../../../src/audit/hmacChain.js";
import {
  GATEWAY_EVENTS,
  recordGatewaySessionCreated,
  recordGatewayRun,
  recordGatewayReceiptExported,
  recordGatewayLiveCall,
  recordGatewayLiveConfigRejected,
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
  test("live call (success + context summary) emits the full live chain", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayLiveCall(chain, key, {
      providerResponseKind: "text",
      providerResponseHash: "sha256:lp",
      contextSummaryBuilt: true,
      contextCount: 2,
    });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONFIG_ACCEPTED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_RATE_LIMIT_CHECKED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_CALLED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_RESPONSE_HASHED));
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONTEXT_SUMMARY_BUILT));
    assert.ok(!types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_ERROR));
    assert.equal(verifyChain(chain, key).valid, true);
  });
  test("live call timeout emits PROVIDER_TIMEOUT not generic ERROR", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayLiveCall(chain, key, {
      providerResponseKind: "error",
      providerResponseHash: "sha256:lp",
      errorCode: "gateway_live_timeout",
    });
    const types = chain.entries.map((e) => e.type);
    assert.ok(types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_TIMEOUT));
    assert.ok(!types.includes(GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_ERROR));
  });
  test("live call generic error emits PROVIDER_ERROR with reason code", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayLiveCall(chain, key, {
      providerResponseKind: "error",
      providerResponseHash: "sha256:lp",
      errorCode: "gateway_live_provider_error",
    });
    const errEntry = chain.entries.find(
      (e) => e.type === GATEWAY_EVENTS.LLM_GATEWAY_LIVE_PROVIDER_ERROR
    );
    assert.ok(errEntry, "PROVIDER_ERROR must be present");
    assert.deepEqual(errEntry.payload.reason_codes, ["gateway_live_provider_error"]);
  });
  test("live config rejected emits LIVE_CONFIG_REJECTED with reason", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordGatewayLiveConfigRejected(chain, key, "gateway_live_disabled");
    const entry = chain.entries.at(-1);
    assert.equal(entry.type, GATEWAY_EVENTS.LLM_GATEWAY_LIVE_CONFIG_REJECTED);
    assert.deepEqual(entry.payload.reason_codes, ["gateway_live_disabled"]);
    assert.equal(verifyChain(chain, key).valid, true);
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
