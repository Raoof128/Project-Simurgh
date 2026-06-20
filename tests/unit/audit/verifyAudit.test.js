// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { createChain, appendEntry } from "../../../src/audit/hmacChain.js";
import { verifyAuditExport } from "../../../src/audit/verifyAudit.js";

const KEY = "test-hmac-key";

function buildExport() {
  const chain = createChain();
  appendEntry(chain, KEY, "decision", { a: 1 });
  appendEntry(chain, KEY, "decision", { b: 2 });
  return { entries: chain.entries, truncated: chain.truncated };
}

test("verifyAuditExport validates an intact exported chain", () => {
  const result = verifyAuditExport(buildExport(), KEY);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.entry_count, 2);
  assert.equal(result.truncated, false);
  assert.match(result.verified_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("verifyAuditExport detects a tampered entry", () => {
  const exported = buildExport();
  exported.entries[0].payload = { a: 999 }; // tamper after signing
  const result = verifyAuditExport(exported, KEY);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 1);
});

test("verifyAuditExport detects a wrong HMAC key", () => {
  const result = verifyAuditExport(buildExport(), "wrong-key");
  assert.equal(result.valid, false);
});

test("verifyAuditExport handles a missing entries field as empty", () => {
  const result = verifyAuditExport({}, KEY);
  assert.equal(result.valid, true);
  assert.equal(result.entry_count, 0);
  assert.equal(result.truncated, false);
});

test("verifyAuditExport preserves the truncated flag", () => {
  const exported = buildExport();
  exported.truncated = true;
  const result = verifyAuditExport(exported, KEY);
  assert.equal(result.truncated, true);
});
