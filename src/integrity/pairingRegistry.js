import crypto from "node:crypto";

const DEFAULT_TTL_MS = 60_000;
const CHALLENGE_BYTES = 32;

export function createPairingRegistry({ challengeTtlMs = DEFAULT_TTL_MS } = {}) {
  const records = new Map();

  function ensureRecord(sessionId) {
    let rec = records.get(sessionId);
    if (!rec) {
      rec = { sessionId, pending: null, paired: null };
      records.set(sessionId, rec);
    }
    return rec;
  }

  function createChallenge(sessionId, now = Date.now()) {
    const rec = ensureRecord(sessionId);
    if (rec.paired) return { ok: false, reason: "node_already_paired" };

    const raw = crypto.randomBytes(CHALLENGE_BYTES);
    const challenge = raw.toString("base64");
    const challenge_hash = crypto.createHash("sha256").update(raw).digest("hex");
    rec.pending = {
      challenge,
      challenge_hash,
      challenge_created_at: now,
      challenge_expires_at: now + challengeTtlMs,
    };
    return {
      ok: true,
      challenge,
      challenge_hash,
      expires_at: rec.pending.challenge_expires_at,
    };
  }

  function getChallenge(sessionId) {
    const rec = records.get(sessionId);
    if (!rec || !rec.pending) return null;
    return {
      challenge: rec.pending.challenge,
      expires_at: rec.pending.challenge_expires_at,
    };
  }

  function completePairing(
    sessionId,
    { challenge, node_id_hash, node_public_key },
    now = Date.now()
  ) {
    const rec = records.get(sessionId);
    if (!rec) return { ok: false, reason: "challenge_not_found" };
    if (rec.paired) return { ok: false, reason: "node_already_paired" };
    if (!rec.pending) return { ok: false, reason: "challenge_not_found" };
    if (rec.pending.challenge_expires_at < now) return { ok: false, reason: "challenge_expired" };
    if (rec.pending.challenge !== challenge) return { ok: false, reason: "challenge_mismatch" };

    rec.paired = {
      node_id_hash,
      node_public_key,
      paired_at: now,
    };
    rec.pending = null;
    return { ok: true, paired_at: now };
  }

  function getPairedNode(sessionId) {
    const rec = records.get(sessionId);
    if (!rec || !rec.paired) return null;
    return { ...rec.paired };
  }

  function isPaired(sessionId) {
    return !!records.get(sessionId)?.paired;
  }

  function evict(sessionId) {
    records.delete(sessionId);
  }

  function evictMissing(activeSessionIds) {
    for (const id of records.keys()) {
      if (!activeSessionIds.has(id)) records.delete(id);
    }
  }

  return {
    createChallenge,
    getChallenge,
    completePairing,
    getPairedNode,
    isPaired,
    evict,
    evictMissing,
    size: () => records.size,
  };
}
