// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S Lane B e2e (4S spec §13): a genuine two-process MCP-stdio delegation
// hop, receipted end-to-end and verified offline. Motto: AnthropicSafe First,
// then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage4s/laneb/run-laneb-ceremony.mjs";
import { evaluateChainSafe } from "../../../../tools/simurgh-attestation/stage4s/core/chainCore.mjs";

test("two-process MCP ceremony produces a GREEN, dual-signed, offline-verifiable chain", async () => {
  const res = await runCeremony({ task: "summarise the Q3 numbers" });

  // The chain verifies to GREEN offline.
  assert.equal(res.verdict.raw, 0);
  assert.equal(res.transport, "mcp_stdio_jsonrpc2");

  // Two DISTINCT OS processes were involved.
  assert.notEqual(res.process_isolation.parent_pid, res.process_isolation.child_pid);
  assert.ok(res.process_isolation.child_pid > 0);

  // The A->B hop is genuinely dual-signed by two DIFFERENT keys.
  const hop = res.bundle.tree_receipts.find((r) => r.parent_receipt_digest !== null);
  assert.notEqual(hop.delegator_key_digest, hop.delegatee_key_digest);
  assert.ok(hop.signature_delegator.length > 0);
  assert.ok(hop.signature_delegatee.length > 0);
  assert.notEqual(hop.signature_delegator, hop.signature_delegatee);

  // A tampered replay of the captured bundle (wrong epoch) is caught at 114.
  const tampered = structuredClone(res.bundle);
  tampered.epoch = "win-1999-01-01";
  assert.equal(evaluateChainSafe(tampered).raw, 114);
});
