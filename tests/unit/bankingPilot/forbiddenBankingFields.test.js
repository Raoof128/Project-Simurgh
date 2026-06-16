// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  FORBIDDEN_BANKING_FIELD_NAMES,
  containsForbiddenBankingFieldDeep,
} from "../../../src/bankingPilot/forbiddenBankingFields.js";

test("FORBIDDEN_BANKING_FIELD_NAMES is frozen and duplicate-free", () => {
  assert.ok(Object.isFrozen(FORBIDDEN_BANKING_FIELD_NAMES));
  assert.equal(new Set(FORBIDDEN_BANKING_FIELD_NAMES).size, FORBIDDEN_BANKING_FIELD_NAMES.length);
});

test("recursive guard rejects top-level and nested forbidden banking fields", () => {
  assert.equal(containsForbiddenBankingFieldDeep({ account_number: "111" }), "account_number");
  assert.equal(containsForbiddenBankingFieldDeep({ nested: { otp: "123456" } }), "otp");
  assert.equal(
    containsForbiddenBankingFieldDeep({ rows: [{ window_title: "Bank" }] }),
    "window_title"
  );
});

test("recursive guard rejects structural pollution keys", () => {
  assert.equal(containsForbiddenBankingFieldDeep({ constructor: { value: "x" } }), "constructor");
  assert.equal(containsForbiddenBankingFieldDeep({ nested: { prototype: "x" } }), "prototype");
  assert.equal(
    containsForbiddenBankingFieldDeep(JSON.parse('{"__proto__":{"polluted":true}}')),
    "__proto__"
  );
});

test("recursive guard enforces max depth", () => {
  let current = {};
  const root = current;
  for (let i = 0; i < 25; i += 1) {
    current.child = {};
    current = current.child;
  }
  assert.equal(containsForbiddenBankingFieldDeep(root), "__max_depth__");
});

test("recursive guard ignores metadata-only payloads", () => {
  assert.equal(
    containsForbiddenBankingFieldDeep({
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    }),
    null
  );
});
