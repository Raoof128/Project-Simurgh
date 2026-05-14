import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createNonceGuard } from "../../../src/integrity/nonceGuard.js";

describe("nonceGuard", () => {
  test("accepts a fresh nonce for a session", () => {
    const guard = createNonceGuard();
    const result = guard.check("nonce-abc", "sess_1");
    assert.equal(result.ok, true);
    guard.stop();
  });

  test("rejects a replayed nonce for the same session", () => {
    const guard = createNonceGuard();
    guard.check("nonce-xyz", "sess_1");
    const result = guard.check("nonce-xyz", "sess_1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "nonce_replayed");
    guard.stop();
  });

  test("rejects a nonce submitted for a different session (session mismatch)", () => {
    const guard = createNonceGuard();
    guard.check("shared-nonce", "sess_a");
    const result = guard.check("shared-nonce", "sess_b");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "nonce_session_mismatch");
    guard.stop();
  });

  test("accepts the same nonce for different sessions independently", () => {
    const guard = createNonceGuard();
    assert.equal(guard.check("nonce-1", "sess_a").ok, true);
    assert.equal(guard.check("nonce-2", "sess_b").ok, true);
    guard.stop();
  });

  test("rejects empty nonce", () => {
    const guard = createNonceGuard();
    const result = guard.check("", "sess_1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_nonce");
    guard.stop();
  });

  test("size increments on new entries", () => {
    const guard = createNonceGuard();
    assert.equal(guard.size(), 0);
    guard.check("n1", "s1");
    guard.check("n2", "s2");
    assert.equal(guard.size(), 2);
    guard.stop();
  });
});
