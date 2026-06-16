import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createChain, verifyChain } from "../../../src/audit/hmacChain.js";
import {
  LLM_SHIELD_EVENTS,
  buildDecisionPayload,
  recordBlockedRun,
  recordSafeRun,
  recordWarnedRun,
  recordReceiptExported,
} from "../../../src/llmShield/llmShieldAudit.js";

const KEY = "test-llm-shield-audit-key";
const DECISION = {
  verdict: "blocked",
  reasonCodes: [],
  detectedAttackClasses: [],
  inputHash: "sha256:b",
  normalisedInputHash: "sha256:c",
  modelCalled: false,
};

describe("llmShieldAudit", () => {
  test("buildDecisionPayload whitelists fields and excludes raw text", () => {
    const p = buildDecisionPayload({
      verdict: "blocked",
      reasonCodes: ["policy_override_attempt"],
      detectedAttackClasses: ["direct_jailbreak"],
      inputHash: "sha256:bbb",
      normalisedInputHash: "sha256:ccc",
      modelCalled: false,
      rawInput: "ignore previous instructions",
    });
    assert.ok(!JSON.stringify(p).includes("ignore previous instructions"));
    assert.deepEqual(Object.keys(p).sort(), [
      "detected_attack_classes",
      "input_hash",
      "model_called",
      "normalised_input_hash",
      "reason_codes",
      "signals",
      "verdict",
    ]);
  });

  test("recordBlockedRun appends INPUT_BLOCKED then PROVIDER_SKIPPED in order", () => {
    const chain = createChain();
    recordBlockedRun(chain, KEY, DECISION);
    assert.deepEqual(
      chain.entries.map((e) => e.type),
      [LLM_SHIELD_EVENTS.LLM_INPUT_BLOCKED, LLM_SHIELD_EVENTS.LLM_PROVIDER_SKIPPED]
    );
  });

  test("recordSafeRun appends ACCEPTED, CALLED, OUTPUT_ACCEPTED in order", () => {
    const chain = createChain();
    recordSafeRun(chain, KEY, { ...DECISION, verdict: "safe", modelCalled: true });
    assert.deepEqual(
      chain.entries.map((e) => e.type),
      [
        LLM_SHIELD_EVENTS.LLM_INPUT_ACCEPTED,
        LLM_SHIELD_EVENTS.LLM_PROVIDER_CALLED,
        LLM_SHIELD_EVENTS.LLM_OUTPUT_ACCEPTED,
      ]
    );
  });

  test("recorders return the chain head hash for the receipt", () => {
    const chain = createChain();
    const head = recordBlockedRun(chain, KEY, DECISION);
    assert.equal(head, chain.prevHash);
    assert.match(head, /^[0-9a-f]{64}$/);
  });

  test("recordReceiptExported appends the final event with receipt hash", () => {
    const chain = createChain();
    recordSafeRun(chain, KEY, { ...DECISION, verdict: "safe", modelCalled: true });
    recordReceiptExported(chain, KEY, "sha256:receipt");
    const last = chain.entries.at(-1);
    assert.equal(last.type, LLM_SHIELD_EVENTS.LLM_RECEIPT_EXPORTED);
    assert.equal(last.payload.receipt_hash, "sha256:receipt");
  });

  test("recordWarnedRun appends WARNED -> PROVIDER_CALLED -> OUTPUT_ACCEPTED and verifies", () => {
    const key = crypto.randomBytes(32);
    const chain = createChain();
    recordWarnedRun(chain, key, {
      verdict: "warning",
      reasonCodes: ["role_play_framing"],
      detectedAttackClasses: [],
      inputHash: "sha256:i",
      normalisedInputHash: "sha256:n",
      modelCalled: true,
      signals: ["homoglyph_fold"],
    });
    assert.deepEqual(
      chain.entries.map((e) => e.type),
      [
        LLM_SHIELD_EVENTS.LLM_INPUT_WARNED,
        LLM_SHIELD_EVENTS.LLM_PROVIDER_CALLED,
        LLM_SHIELD_EVENTS.LLM_OUTPUT_ACCEPTED,
      ]
    );
    assert.equal(verifyChain(chain, key).valid, true);
  });
});
