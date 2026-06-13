// SPDX-License-Identifier: AGPL-3.0-or-later
// Per-session integrity state with N1 strict node continuity.
//
// A session's bound_node_id_hash is set on the FIRST accepted proof and is
// immutable thereafter. A subsequent proof with a different node_id_hash is
// rejected with reason "node_id_hash_changed".
//
// State is in-memory and cleaned up via evictMissing(activeSessionIds) from
// the existing session-eviction timer in server.js.

export function createIntegrityState() {
  const records = new Map();

  function record(sessionId, proof) {
    const existing = records.get(sessionId);
    if (!existing) {
      records.set(sessionId, {
        sessionId,
        bound_node_id_hash: proof.node_id_hash,
        last_proof_received_at: Date.now(),
        last_node_id_hash: proof.node_id_hash,
        last_capabilities: { ...proof.capabilities },
        last_signals: { ...proof.signals },
        proof_count: 1,
      });
      return { ok: true };
    }
    if (existing.bound_node_id_hash !== proof.node_id_hash) {
      return { ok: false, reason: "node_id_hash_changed" };
    }
    existing.last_proof_received_at = Date.now();
    existing.last_node_id_hash = proof.node_id_hash;
    existing.last_capabilities = { ...proof.capabilities };
    existing.last_signals = { ...proof.signals };
    existing.proof_count += 1;
    return { ok: true };
  }

  return {
    record,
    get(sessionId) {
      return records.get(sessionId) ?? null;
    },
    evict(sessionId) {
      records.delete(sessionId);
    },
    evictMissing(activeSessionIds) {
      for (const id of records.keys()) {
        if (!activeSessionIds.has(id)) records.delete(id);
      }
    },
    size() {
      return records.size;
    },
  };
}
