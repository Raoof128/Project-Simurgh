// SPDX-License-Identifier: AGPL-3.0-or-later
// Generic fixed-window rate limiter, keyed by a caller-provided function.
// Returns Express middleware. Designed for single-process Stage 1 deployments;
// for multi-process production deployments, swap the in-memory Map for Redis.

export function createRateLimiter({ windowMs, max, keyFn, name = "rl" } = {}) {
  if (!windowMs || !max || typeof keyFn !== "function") {
    throw new Error("rateLimit: windowMs, max, keyFn required");
  }
  // key -> { windowStart, count }
  const buckets = new Map();
  // Periodic cleanup of expired buckets every 5 minutes.
  const cleanup = setInterval(
    () => {
      const cutoff = Date.now() - windowMs;
      for (const [k, v] of buckets.entries()) {
        if (v.windowStart < cutoff) buckets.delete(k);
      }
    },
    5 * 60 * 1000
  );
  cleanup.unref?.();

  function middleware(req, res, next) {
    let key;
    try {
      key = keyFn(req);
    } catch {
      key = null;
    }
    if (!key) return next(); // un-keyable requests bypass the limiter (auth or schema will reject elsewhere)

    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now - b.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return next();
    }
    if (b.count >= max) {
      const retryAfterMs = windowMs - (now - b.windowStart);
      res.setHeader("Retry-After", Math.ceil(retryAfterMs / 1000));
      return res
        .status(429)
        .json({ error: "rate_limited", scope: name, retry_after_ms: retryAfterMs });
    }
    b.count += 1;
    return next();
  }

  middleware._buckets = buckets;
  middleware._stop = () => clearInterval(cleanup);
  return middleware;
}

// Convenience key extractors
export const keyByIp = (req) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

export const keyByHelperSecret = (req) =>
  (req.headers["x-simurgh-helper-secret"] || "").toString().slice(0, 128) || null;

export const keyByInstructorToken = (req) => {
  const auth = req.headers.authorization;
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "") : null;
  return bearer || req.query?.token || null;
};

export const keyBySessionToken = (req) => {
  if (req.sessionTokenSessionId) return req.sessionTokenSessionId;
  const auth = req.headers.authorization;
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "") : null;
  return bearer ? `tok:${bearer.slice(0, 64)}` : "unauthenticated";
};
