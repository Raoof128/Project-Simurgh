// Per-nonce replay protection for Stage 2 integrity proof submissions.
//
// Simplified rule: every nonce can only be used once across the lifetime
// of the in-memory store. We do not track per-session subdivisions —
// the cryptographic envelope binds the proof to its session_id and a
// valid signature is unforgeable, so the only attack the nonce guard
// needs to block is "submit the same proof twice."

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createNonceGuard({ ttlMs = DEFAULT_TTL_MS } = {}) {
  // nonce -> expiresAt
  const seen = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [nonce, expiresAt] of seen.entries()) {
      if (expiresAt <= now) seen.delete(nonce);
    }
  }, 60_000);
  cleanup.unref?.();

  function check(nonce /* sessionId accepted for API stability but ignored */) {
    if (typeof nonce !== "string" || nonce.length === 0) {
      return { ok: false, reason: "invalid_nonce" };
    }
    if (seen.has(nonce)) {
      return { ok: false, reason: "nonce_replayed" };
    }
    seen.set(nonce, Date.now() + ttlMs);
    return { ok: true };
  }

  return {
    check,
    size: () => seen.size,
    stop: () => clearInterval(cleanup),
  };
}
