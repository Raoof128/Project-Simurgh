// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  hashNarrative,
  buildEnabledReceipt,
  buildDisabledReceipt,
  buildFirewallFailedReceipt,
} from "../../../src/bankingPilot/bankingAiPrivacyReceipt.js";

const narrative = { a: 1, b: "two" };

test("hashNarrative is deterministic and prefixed", () => {
  const h1 = hashNarrative(narrative);
  const h2 = hashNarrative(narrative);
  assert.equal(h1, h2);
  assert.match(h1, /^sha256:[a-f0-9]{64}$/);
});

test("enabled receipt asserts the full privacy contract", () => {
  const r = buildEnabledReceipt({
    narrative,
    officialResultUnchanged: true,
    claimGuardPassed: true,
  });
  assert.equal(r.ai_privacy_layer_enabled, true);
  assert.equal(r.provider, "deterministic_mock");
  assert.equal(r.sensitive_payload_sent_to_ai, false);
  assert.equal(r.network_egress_used, false);
  assert.equal(r.official_result_unchanged, true);
  assert.equal(r.claim_guard_passed, true);
  assert.equal(r.narrative_generated, true);
  assert.match(r.narrative_hash, /^sha256:[a-f0-9]{64}$/);
});

test("disabled receipt carries the off-path padlock fields", () => {
  const r = buildDisabledReceipt("ai_explain_disabled");
  assert.equal(r.ai_privacy_layer_enabled, false);
  assert.equal(r.narrative_generated, false);
  assert.equal(r.network_egress_used, false);
  assert.equal(r.sensitive_payload_sent_to_ai, false);
  assert.equal(r.blocked_reason, "ai_explain_disabled");
  assert.equal(r.narrative_hash, undefined);
});

test("firewall-failed receipt records the failed gate, no narrative", () => {
  const r = buildFirewallFailedReceipt({ gate: "claim_guard" });
  assert.equal(r.narrative_generated, false);
  assert.equal(r.output_claim_firewall_passed, false);
  assert.equal(r.claim_guard_passed, false);
  assert.equal(r.failed_gate, "claim_guard");
  assert.equal(r.narrative_hash, undefined);
});
