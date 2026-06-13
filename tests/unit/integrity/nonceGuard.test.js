// SPDX-License-Identifier: AGPL-3.0-or-later
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

  test("rejects a nonce reused on a different session (also nonce_replayed)", () => {
    const guard = createNonceGuard();
    guard.check("shared-nonce", "sess_a");
    const result = guard.check("shared-nonce", "sess_b");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "nonce_replayed");
    guard.stop();
  });

  test("accepts different nonces independently", () => {
    const guard = createNonceGuard();
    assert.equal(guard.check("n1", "s1").ok, true);
    assert.equal(guard.check("n2", "s2").ok, true);
    guard.stop();
  });

  test("rejects empty nonce", () => {
    const guard = createNonceGuard();
    const result = guard.check("", "sess_1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_nonce");
    guard.stop();
  });
});
