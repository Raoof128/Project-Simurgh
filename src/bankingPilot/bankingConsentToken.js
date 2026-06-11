import crypto from "node:crypto";

export const BANKING_TOKEN_VERSION = "banking-pilot-token-v1";
export const BANKING_TOKEN_PURPOSE = "banking_pilot_session";
export const BANKING_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromB64url(value) {
  return Buffer.from(value, "base64url");
}

export function issueBankingSessionToken(
  { bankingSessionId, participantCodeHash, issuedAt = Date.now(), ttlMs = BANKING_TOKEN_TTL_MS },
  signingKey
) {
  const payload = {
    version: BANKING_TOKEN_VERSION,
    purpose: BANKING_TOKEN_PURPOSE,
    banking_session_id: bankingSessionId,
    anonymous_participant_code_hash: participantCodeHash,
    phase: "phase_a_synthetic",
    issued_at: issuedAt,
    expires_at: issuedAt + ttlMs,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", signingKey).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyBankingSessionToken(token, signingKey) {
  if (typeof token !== "string" || token.length === 0) {
    return { valid: false, reason: "token_missing" };
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: "token_malformed" };
  }

  const [payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac("sha256", signingKey).update(payloadB64).digest();
  let providedSig;
  try {
    providedSig = fromB64url(sigB64);
  } catch {
    return { valid: false, reason: "token_malformed" };
  }

  if (providedSig.length !== expectedSig.length) return { valid: false, reason: "token_invalid" };
  if (!crypto.timingSafeEqual(providedSig, expectedSig)) {
    return { valid: false, reason: "token_invalid" };
  }

  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return { valid: false, reason: "token_malformed" };
  }

  if (
    payload?.version !== BANKING_TOKEN_VERSION ||
    payload?.purpose !== BANKING_TOKEN_PURPOSE ||
    payload?.phase !== "phase_a_synthetic" ||
    typeof payload?.banking_session_id !== "string" ||
    typeof payload?.anonymous_participant_code_hash !== "string" ||
    typeof payload?.issued_at !== "number" ||
    typeof payload?.expires_at !== "number"
  ) {
    return { valid: false, reason: "token_malformed" };
  }

  if (payload.expires_at < Date.now()) return { valid: false, reason: "token_expired" };

  return {
    valid: true,
    bankingSessionId: payload.banking_session_id,
    participantCodeHash: payload.anonymous_participant_code_hash,
    phase: payload.phase,
    issuedAt: payload.issued_at,
    expiresAt: payload.expires_at,
  };
}
