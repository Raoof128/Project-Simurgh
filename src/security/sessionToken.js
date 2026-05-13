import crypto from 'node:crypto';

// Session token format: base64url(JSON({ sid, exp })).base64url(HMAC-SHA256(payload, key))
// The token is opaque to the client; the server signs it once at /join and verifies
// it on every subsequent state-changing call.

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function fromB64url(s) {
  return Buffer.from(s, 'base64url');
}

export function issueSessionToken(sessionId, signingKey, ttlMs) {
  const payload = JSON.stringify({ sid: sessionId, exp: Date.now() + ttlMs });
  const payloadB64 = b64url(payload);
  const sig = crypto.createHmac('sha256', signingKey).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifySessionToken(token, signingKey) {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'token_missing' };
  }
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'token_malformed' };
  }

  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac('sha256', signingKey).update(payloadB64).digest();
  let providedSig;
  try {
    providedSig = fromB64url(sigB64);
  } catch {
    return { valid: false, reason: 'token_malformed' };
  }

  if (providedSig.length !== expectedSig.length) return { valid: false, reason: 'token_invalid' };
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) return { valid: false, reason: 'token_invalid' };

  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString('utf8'));
  } catch {
    return { valid: false, reason: 'token_malformed' };
  }

  if (!payload || typeof payload.sid !== 'string' || typeof payload.exp !== 'number') {
    return { valid: false, reason: 'token_malformed' };
  }

  if (payload.exp < Date.now()) return { valid: false, reason: 'token_expired' };

  return { valid: true, sessionId: payload.sid, expiresAt: payload.exp };
}

export function extractBearer(req) {
  const auth = req.headers?.authorization;
  if (typeof auth !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1].trim() : null;
}
