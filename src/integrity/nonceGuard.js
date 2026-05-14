// Nonce replay protection for Stage 2 integrity proof submissions.
// Prevents a captured proof from being replayed to a different session or
// submitted multiple times within the TTL window.
//
// Uses a fixed-size Map with TTL eviction; suitable for Stage 2 scaffold.
// A production deployment would use Redis or a persistent store.

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createNonceGuard({ ttlMs = DEFAULT_TTL_MS } = {}) {
  // nonce -> { sessionId, expiresAt }
  const seen = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [nonce, v] of seen.entries()) {
      if (v.expiresAt <= now) seen.delete(nonce);
    }
  }, 60_000);
  cleanup.unref?.();

  /**
   * Check whether a nonce is fresh and not yet seen for this session.
   * Returns { ok: true } or { ok: false, reason }.
   */
  function check(nonce, sessionId) {
    if (typeof nonce !== "string" || nonce.length === 0) {
      return { ok: false, reason: "invalid_nonce" };
    }
    const entry = seen.get(nonce);
    if (entry) {
      if (entry.sessionId !== sessionId) {
        return { ok: false, reason: "nonce_session_mismatch" };
      }
      return { ok: false, reason: "nonce_replayed" };
    }
    seen.set(nonce, { sessionId, expiresAt: Date.now() + ttlMs });
    return { ok: true };
  }

  function size() {
    return seen.size;
  }

  function stop() {
    clearInterval(cleanup);
  }

  return { check, size, stop };
}
