// Per-session sequence + timestamp guard. Used to reject duplicate or
// out-of-order telemetry submissions and stale/future-dated payloads.

export function createReplayGuard({ skewMs = 30_000, futureMs = 5_000 } = {}) {
  // sessionId -> { lastSeq, lastTs }
  const state = new Map();

  function check(sessionId, sequence, timestamp, now = Date.now()) {
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      return { ok: false, reason: "invalid_session_id" };
    }
    if (!Number.isInteger(sequence) || sequence < 0) {
      return { ok: false, reason: "invalid_sequence" };
    }
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      return { ok: false, reason: "invalid_timestamp" };
    }
    if (timestamp > now + futureMs) {
      return { ok: false, reason: "timestamp_in_future" };
    }
    if (timestamp < now - skewMs) {
      return { ok: false, reason: "timestamp_stale" };
    }

    const prev = state.get(sessionId);
    if (prev) {
      if (sequence <= prev.lastSeq) {
        return { ok: false, reason: "sequence_replay_or_rollback" };
      }
    }
    state.set(sessionId, { lastSeq: sequence, lastTs: timestamp });
    return { ok: true };
  }

  function reset(sessionId) {
    state.delete(sessionId);
  }

  function size() {
    return state.size;
  }

  function evictOlderThan(cutoffMs) {
    for (const [sid, v] of state.entries()) {
      if (v.lastTs < cutoffMs) state.delete(sid);
    }
  }

  return { check, reset, size, evictOlderThan };
}
