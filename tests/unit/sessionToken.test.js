// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  issueSessionToken,
  verifySessionToken,
  extractBearer,
} from "../../src/security/sessionToken.js";

const KEY = "test-signing-key-32-bytes-or-longer-for-hmac-sha256";

describe("sessionToken", () => {
  test("issues a token that round-trips successfully", () => {
    const token = issueSessionToken("sess_abc", KEY, 60_000);
    const r = verifySessionToken(token, KEY);
    assert.equal(r.valid, true);
    assert.equal(r.sessionId, "sess_abc");
    assert.ok(r.expiresAt > Date.now());
  });

  test("rejects token signed with a different key", () => {
    const token = issueSessionToken("sess_abc", KEY, 60_000);
    const r = verifySessionToken(token, "different-key");
    assert.equal(r.valid, false);
    assert.equal(r.reason, "token_invalid");
  });

  test("rejects malformed tokens", () => {
    assert.equal(verifySessionToken("not-a-token", KEY).reason, "token_malformed");
    assert.equal(verifySessionToken("", KEY).reason, "token_missing");
    assert.equal(verifySessionToken(null, KEY).reason, "token_missing");
    assert.equal(verifySessionToken("a.b.c", KEY).reason, "token_malformed");
  });

  test("rejects expired tokens", () => {
    const token = issueSessionToken("sess_abc", KEY, -1000); // already expired
    const r = verifySessionToken(token, KEY);
    assert.equal(r.valid, false);
    assert.equal(r.reason, "token_expired");
  });

  test("rejects tampered payload", () => {
    const token = issueSessionToken("sess_abc", KEY, 60_000);
    const [payload, sig] = token.split(".");
    // flip one char in payload
    const tampered = `${payload.slice(0, -1)}X.${sig}`;
    const r = verifySessionToken(tampered, KEY);
    assert.equal(r.valid, false);
  });

  test("extractBearer pulls token from Authorization header", () => {
    assert.equal(extractBearer({ headers: { authorization: "Bearer abc.def" } }), "abc.def");
    assert.equal(extractBearer({ headers: { authorization: "bearer xyz" } }), "xyz");
    assert.equal(extractBearer({ headers: {} }), null);
    assert.equal(extractBearer({}), null);
  });
});
