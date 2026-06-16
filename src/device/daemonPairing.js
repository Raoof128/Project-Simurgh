// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

import { DAEMON_CHALLENGE_BYTES, validateDaemonPairingPayload } from "./daemonProof.js";

const PURPOSES = new Set(["pair", "session_start", "proof", "session_end"]);

function hashChallenge(challenge) {
  const bytes = Buffer.from(challenge, "base64url");
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function createDaemonPairingRegistry({ challengeTtlMs = 30_000 } = {}) {
  const challenges = new Map();
  const paired = new Map();

  function challengeKey(sessionId, challenge) {
    return `${sessionId}:${challenge}`;
  }

  return {
    createChallenge(sessionId, purpose, now = Date.now()) {
      if (!PURPOSES.has(purpose)) return { ok: false, reason: "invalid_challenge_purpose" };
      const challenge = crypto.randomBytes(DAEMON_CHALLENGE_BYTES).toString("base64url");
      const expires_at = now + challengeTtlMs;
      challenges.set(challengeKey(sessionId, challenge), { sessionId, purpose, expires_at });
      return {
        ok: true,
        challenge,
        challenge_hash: hashChallenge(challenge),
        purpose,
        expires_at,
        expires_in_ms: challengeTtlMs,
      };
    },

    consumeChallenge(sessionId, challenge, purpose, now = Date.now()) {
      const key = challengeKey(sessionId, challenge);
      const entry = challenges.get(key);
      if (!entry) return { ok: false, reason: "challenge_not_found" };
      if (entry.purpose !== purpose) return { ok: false, reason: "challenge_purpose_mismatch" };
      challenges.delete(key);
      if (entry.expires_at < now) return { ok: false, reason: "challenge_expired" };
      return { ok: true, challenge_hash: hashChallenge(challenge) };
    },

    completePairing(pairing, { sessionId, examId, now = Date.now() }) {
      const validation = validateDaemonPairingPayload(pairing, {
        now,
        expectedSessionId: sessionId,
        expectedExamId: examId,
      });
      if (!validation.ok) return validation;
      const consumed = this.consumeChallenge(sessionId, validation.payload.challenge, "pair", now);
      if (!consumed.ok) return consumed;
      const record = {
        node_id_hash: validation.payload.node_id_hash,
        public_key: validation.payload.public_key,
        daemon_version: validation.payload.signed_payload.daemon_version,
        platform: validation.payload.signed_payload.platform,
        paired_at: now,
        challenge_hash: consumed.challenge_hash,
      };
      paired.set(sessionId, record);
      return { ok: true, ...record };
    },

    getPairedNode(sessionId) {
      return paired.get(sessionId) ?? null;
    },

    evict(sessionId) {
      paired.delete(sessionId);
      for (const key of challenges.keys()) {
        if (key.startsWith(`${sessionId}:`)) challenges.delete(key);
      }
    },

    evictMissing(activeIds) {
      for (const sessionId of paired.keys()) {
        if (!activeIds.has(sessionId)) paired.delete(sessionId);
      }
      for (const [key, value] of challenges.entries()) {
        if (!activeIds.has(value.sessionId)) challenges.delete(key);
      }
    },
  };
}
