import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildSafeReceipt,
  buildBlockedReceipt,
  buildWarningReceipt,
  hashReceipt,
  RECEIPT_TYPE,
  RECEIPT_SCHEMA_VERSION,
} from "../../../src/llmShield/safetyReceipt.js";

const COMMON = {
  sessionIdHash: "sha256:aaa",
  runId: "run_001",
  inputHash: "sha256:bbb",
  normalisedInputHash: "sha256:ccc",
  auditEntryHash: "sha256:ddd",
  timestamp: "2026-06-16T00:00:00.000Z",
};

describe("safetyReceipt", () => {
  test("safe receipt has verdict safe and model_called true", () => {
    const r = buildSafeReceipt(COMMON);
    assert.equal(r.type, RECEIPT_TYPE);
    assert.equal(r.schema_version, RECEIPT_SCHEMA_VERSION);
    assert.equal(r.verdict, "safe");
    assert.equal(r.model_called, true);
    assert.deepEqual(r.reason_codes, []);
    assert.deepEqual(r.source_labels, ["user_input"]);
    assert.equal(r.privacy_mode, "metadata_only");
    assert.equal(r.network_egress_used, false);
    assert.equal(r.audit_entry_hash, "sha256:ddd");
  });

  test("blocked receipt carries reason codes and model_called false", () => {
    const r = buildBlockedReceipt({
      ...COMMON,
      reasonCodes: ["policy_override_attempt"],
      detectedAttackClasses: ["direct_jailbreak"],
    });
    assert.equal(r.verdict, "blocked");
    assert.equal(r.model_called, false);
    assert.deepEqual(r.reason_codes, ["policy_override_attempt"]);
    assert.deepEqual(r.detected_attack_classes, ["direct_jailbreak"]);
  });

  test("receipt never contains raw text fields", () => {
    const r = buildSafeReceipt(COMMON);
    const keys = Object.keys(r);
    assert.ok(!keys.includes("input"));
    assert.ok(!keys.includes("output"));
  });

  test("hashReceipt returns a sha256-prefixed digest", () => {
    assert.match(hashReceipt(buildSafeReceipt(COMMON)), /^sha256:[0-9a-f]{64}$/);
  });
});

describe("Stage 3C warning receipt", () => {
  test("schema version is 3C", () => {
    assert.equal(RECEIPT_SCHEMA_VERSION, "3C");
  });

  test("warning receipt: model called, risk_tier warning, signals carried, no raw text", () => {
    const r = buildWarningReceipt({
      ...COMMON,
      reasonCodes: ["role_play_framing"],
      detectedAttackClasses: [],
      signals: ["homoglyph_fold"],
    });
    assert.equal(r.verdict, "warning");
    assert.equal(r.model_called, true);
    assert.equal(r.risk_tier, "warning");
    assert.deepEqual(r.signals, ["homoglyph_fold"]);
    assert.equal(r.privacy_mode, "metadata_only");
  });
});
