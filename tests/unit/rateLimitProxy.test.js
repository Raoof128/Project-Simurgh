// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { createRateLimiter, keyByIp } from "../../src/security/rateLimit.js";

async function withServer(trustProxy, check) {
  const app = express();
  app.set("trust proxy", trustProxy);
  const limiter = createRateLimiter({ windowMs: 60000, max: 1, keyFn: keyByIp });
  app.get("/", limiter, (_req, res) => res.sendStatus(200));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const request = async (forwarded) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`, {
      headers: { "X-Forwarded-For": forwarded },
    });
    await response.text();
    return response.status;
  };
  try {
    await check(request);
  } finally {
    limiter._stop();
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test("untrusted clients cannot reset rate limits by rotating X-Forwarded-For", async () => {
  await withServer(false, async (request) => {
    assert.equal(await request("198.51.100.10"), 200);
    assert.equal(await request("198.51.100.11"), 429);
  });
});

test("configured trusted proxies retain separate client buckets", async () => {
  await withServer("loopback", async (request) => {
    assert.equal(await request("198.51.100.10"), 200);
    assert.equal(await request("198.51.100.11"), 200);
    assert.equal(await request("198.51.100.10"), 429);
  });
});

test("untrusted leftmost hops cannot override Express's nearest untrusted address", async () => {
  await withServer("loopback", async (request) => {
    assert.equal(await request("198.51.100.10, 203.0.113.20"), 200);
    assert.equal(await request("198.51.100.11, 203.0.113.20"), 429);
  });
});
