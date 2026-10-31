// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  keyByIp,
  keyByHelperSecret,
  keyByInstructorToken,
} from "../../src/security/rateLimit.js";

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
}

describe("rateLimit", () => {
  test("allows up to max requests in the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, keyFn: () => "k1" });
    let calls = 0;
    const next = () => {
      calls += 1;
    };
    limiter({ headers: {} }, mockRes(), next);
    limiter({ headers: {} }, mockRes(), next);
    limiter({ headers: {} }, mockRes(), next);
    assert.equal(calls, 3);
  });

  test("rejects with 429 after max", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyFn: () => "k2" });
    limiter({ headers: {} }, mockRes(), () => {});
    limiter({ headers: {} }, mockRes(), () => {});
    const res = mockRes();
    let called = false;
    limiter({ headers: {} }, res, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.error, "rate_limited");
    assert.ok(res.body.retry_after_ms > 0);
  });

  test("isolates buckets per key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, keyFn: (req) => req.headers.k });
    let calls = 0;
    limiter({ headers: { k: "A" } }, mockRes(), () => calls++);
    limiter({ headers: { k: "B" } }, mockRes(), () => calls++);
    assert.equal(calls, 2);
  });

  test("bypasses when key is null (no auth context)", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, keyFn: () => null });
    let calls = 0;
    limiter({ headers: {} }, mockRes(), () => calls++);
    limiter({ headers: {} }, mockRes(), () => calls++);
    assert.equal(calls, 2);
  });

  test("keyByIp uses Express trusted-proxy resolution instead of raw forwarding headers", () => {
    assert.equal(
      keyByIp({
        ip: "203.0.113.10",
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        socket: {},
      }),
      "203.0.113.10"
    );
    assert.equal(keyByIp({ headers: {}, socket: { remoteAddress: "127.0.0.1" } }), "127.0.0.1");
    assert.equal(keyByIp({ headers: { "x-forwarded-for": "1.2.3.4" }, socket: {} }), "unknown");
  });

  test("keyByHelperSecret extracts header", () => {
    assert.equal(keyByHelperSecret({ headers: { "x-simurgh-helper-secret": "abc" } }), "abc");
    assert.equal(keyByHelperSecret({ headers: {} }), null);
  });

  test("keyByInstructorToken extracts bearer only", () => {
    const key = keyByInstructorToken({ headers: { authorization: "Bearer T1" }, query: {} });
    assert.match(key, /^tok:[0-9a-f]{32}$/);
    assert.equal(keyByInstructorToken({ headers: { authorization: "bearer  T1" } }), key);
    assert.equal(keyByInstructorToken({ headers: {}, query: { token: "T2" } }), null);
    assert.equal(keyByInstructorToken({ headers: {}, query: {} }), null);
  });

  test("keyByInstructorToken keys on a fixed-length digest, not the bearer text", () => {
    // The limiter runs before auth, so the bearer is attacker-chosen and can be any length.
    const huge = "A".repeat(15 * 1024);
    const keyHuge = keyByInstructorToken({ headers: { authorization: `Bearer ${huge}` } });
    const keyOther = keyByInstructorToken({
      headers: { authorization: `Bearer ${huge.slice(0, -1)}B` },
    });
    assert.equal(keyHuge.length, "tok:".length + 32);
    assert.equal(keyOther.length, keyHuge.length);
    assert.notEqual(keyHuge, keyOther, "bearers differing in the last byte get different keys");
    assert.ok(!keyHuge.includes("AAAA"), "the key must not embed the bearer");
  });

  test("bucket map is bounded by maxBuckets", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 5,
      keyFn: (req) => req.k,
      maxBuckets: 3,
    });
    for (let i = 0; i < 10; i += 1) limiter({ k: `k${i}` }, mockRes(), () => {});
    assert.ok(limiter._buckets.size <= 3, `size was ${limiter._buckets.size}`);
    // The newest keys are the ones kept.
    assert.ok(limiter._buckets.has("k9"));
    limiter._stop();
  });

  test("a full map never evicts a throttled bucket, so flooding cannot reset a limit", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      keyFn: (req) => req.k,
      maxBuckets: 2,
    });
    const hit = (k) => {
      const res = mockRes();
      let passed = false;
      limiter({ k }, res, () => {
        passed = true;
      });
      return passed ? 200 : res.statusCode;
    };
    assert.equal(hit("attacker"), 200);
    assert.equal(hit("attacker"), 200);
    assert.equal(hit("attacker"), 429);
    // Fresh keys fill the map; the throttled bucket must survive them.
    for (let i = 0; i < 5; i += 1) hit(`fresh${i}`);
    assert.equal(hit("attacker"), 429, "flooding fresh keys reset a throttled bucket");
    limiter._stop();
  });

  test("a map full of throttled buckets refuses new keys instead of evicting", () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyFn: (req) => req.k,
      maxBuckets: 2,
    });
    limiter({ k: "a" }, mockRes(), () => {});
    limiter({ k: "b" }, mockRes(), () => {});
    const res = mockRes();
    let passed = false;
    limiter({ k: "c" }, res, () => {
      passed = true;
    });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 429);
    assert.ok(limiter._buckets.has("a") && limiter._buckets.has("b"));
    limiter._stop();
  });
});
