import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, keyByIp, keyByHelperSecret, keyByInstructorToken } from '../../src/security/rateLimit.js';

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

describe('rateLimit', () => {
  test('allows up to max requests in the window', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, keyFn: () => 'k1' });
    let calls = 0;
    const next = () => { calls += 1; };
    limiter({ headers: {} }, mockRes(), next);
    limiter({ headers: {} }, mockRes(), next);
    limiter({ headers: {} }, mockRes(), next);
    assert.equal(calls, 3);
  });

  test('rejects with 429 after max', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyFn: () => 'k2' });
    limiter({ headers: {} }, mockRes(), () => {});
    limiter({ headers: {} }, mockRes(), () => {});
    const res = mockRes();
    let called = false;
    limiter({ headers: {} }, res, () => { called = true; });
    assert.equal(called, false);
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.error, 'rate_limited');
    assert.ok(res.body.retry_after_ms > 0);
  });

  test('isolates buckets per key', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, keyFn: (req) => req.headers.k });
    let calls = 0;
    limiter({ headers: { k: 'A' } }, mockRes(), () => calls++);
    limiter({ headers: { k: 'B' } }, mockRes(), () => calls++);
    assert.equal(calls, 2);
  });

  test('bypasses when key is null (no auth context)', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, keyFn: () => null });
    let calls = 0;
    limiter({ headers: {} }, mockRes(), () => calls++);
    limiter({ headers: {} }, mockRes(), () => calls++);
    assert.equal(calls, 2);
  });

  test('keyByIp extracts from x-forwarded-for', () => {
    assert.equal(keyByIp({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: {} }), '1.2.3.4');
    assert.equal(keyByIp({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1');
  });

  test('keyByHelperSecret extracts header', () => {
    assert.equal(keyByHelperSecret({ headers: { 'x-simurgh-helper-secret': 'abc' } }), 'abc');
    assert.equal(keyByHelperSecret({ headers: {} }), null);
  });

  test('keyByInstructorToken extracts bearer or query', () => {
    assert.equal(keyByInstructorToken({ headers: { authorization: 'Bearer T1' }, query: {} }), 'T1');
    assert.equal(keyByInstructorToken({ headers: {}, query: { token: 'T2' } }), 'T2');
    assert.equal(keyByInstructorToken({ headers: {}, query: {} }), null);
  });
});
