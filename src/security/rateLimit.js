// SPDX-License-Identifier: AGPL-3.0-or-later
// Generic fixed-window rate limiter, keyed by a caller-provided function.
// Returns Express middleware. Designed for single-process Stage 1 deployments;
// for multi-process production deployments, swap the in-memory Map for Redis.
import crypto from "node:crypto";

// Upper bound on live buckets per limiter. Keys come from unauthenticated requests, so the
// periodic sweep alone would let a flood grow the map for up to five minutes between passes.
const DEFAULT_MAX_BUCKETS = 50_000;
const EVICT_SCAN_LIMIT = 2_048;

export function createRateLimiter({
  windowMs,
  max,
  keyFn,
  name = "rl",
  maxBuckets = DEFAULT_MAX_BUCKETS,
} = {}) {
  if (!windowMs || !max || typeof keyFn !== "function") {
    throw new Error("rateLimit: windowMs, max, keyFn required");
  }
  // key -> { windowStart, count }
  const buckets = new Map();
  // Periodic cleanup of expired buckets every 5 minutes.
  const sweep = () => {
    const cutoff = Date.now() - windowMs;
    for (const [k, v] of buckets.entries()) {
      if (v.windowStart < cutoff) buckets.delete(k);
    }
  };
  const cleanup = setInterval(sweep, 5 * 60 * 1000);
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
      if (!b && buckets.size >= maxBuckets) {
        // Full: drop expired buckets, then the oldest live ones still under their limit (Map
        // iteration is insertion order). A throttled bucket is never evicted, or flooding fresh
        // keys would reset it; if every live bucket is throttled, the new key is refused.
        // The scan is bounded: a full sweep of 50,000 buckets on every new key cost about 2 ms per
        // request at the cap (audit D-13). Buckets are in insertion order, so the oldest are seen
        // first; if nothing within the bound can go, the new key is refused.
        let examined = 0;
        for (const [k, v] of buckets) {
          if (buckets.size < maxBuckets || examined >= EVICT_SCAN_LIMIT) break;
          examined += 1;
          if (now - v.windowStart >= windowMs || v.count < max) buckets.delete(k);
        }
        if (buckets.size >= maxBuckets) {
          res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
          return res
            .status(429)
            .json({ error: "rate_limited", scope: name, retry_after_ms: windowMs });
        }
      }
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
// Express resolves req.ip using the app's explicit trust-proxy policy. Reading
// X-Forwarded-For directly lets any client create fresh buckets with a new header.
export const keyByIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

export const keyByHelperSecret = (req) =>
  (req.headers["x-simurgh-helper-secret"] || "").toString().slice(0, 128) || null;

// The limiter runs before auth, so the bearer is attacker-chosen and unbounded in length.
// Key on a fixed-length digest so a bucket costs the same however large the header is.
export const keyByInstructorToken = (req) => {
  const auth = req.headers.authorization;
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "") : null;
  if (!bearer) return null;
  return `tok:${crypto.createHash("sha256").update(bearer).digest("hex").slice(0, 32)}`;
};

export const keyBySessionToken = (req) => {
  if (req.sessionTokenSessionId) return req.sessionTokenSessionId;
  const auth = req.headers.authorization;
  const bearer = auth && /^Bearer\s+/i.test(auth) ? auth.replace(/^Bearer\s+/i, "") : null;
  // A 64-character prefix of the bearer was the victim's non-secret session id plus a dot, so ten
  // junk-signature bearers throttled the real student (audit D-12). The full bearer is digested.
  return bearer
    ? `tok:${crypto.createHash("sha256").update(bearer).digest("hex").slice(0, 32)}`
    : "unauthenticated";
};
