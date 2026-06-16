// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createIntegrityState } from "../../../src/integrity/integrityState.js";

function makeProof(nodeIdHash = "a".repeat(64)) {
  return {
    node_id_hash: nodeIdHash,
    capabilities: { x: true },
    signals: { y: 1 },
  };
}

describe("integrityState", () => {
  test("first record binds node_id_hash", () => {
    const state = createIntegrityState();
    const proof = makeProof("aa".padEnd(64, "0"));
    const result = state.record("sess_1", proof);
    assert.equal(result.ok, true);

    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, proof.node_id_hash);
    assert.equal(rec.proof_count, 1);
  });

  test("second record with same node_id_hash updates fields and increments count", () => {
    const state = createIntegrityState();
    const proof = makeProof("bb".padEnd(64, "0"));
    state.record("sess_1", proof);
    state.record("sess_1", proof);
    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, proof.node_id_hash);
    assert.equal(rec.proof_count, 2);
  });

  test("second record with different node_id_hash is rejected", () => {
    const state = createIntegrityState();
    state.record("sess_1", makeProof("aa".padEnd(64, "0")));
    const result = state.record("sess_1", makeProof("cc".padEnd(64, "0")));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "node_id_hash_changed");
    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, "aa".padEnd(64, "0"));
    assert.equal(rec.proof_count, 1);
  });

  test("get returns null for unknown session", () => {
    const state = createIntegrityState();
    assert.equal(state.get("nope"), null);
  });

  test("evict removes the record", () => {
    const state = createIntegrityState();
    state.record("sess_1", makeProof());
    state.evict("sess_1");
    assert.equal(state.get("sess_1"), null);
  });

  test("evictMissing keeps active sessions and drops the rest", () => {
    const state = createIntegrityState();
    state.record("sess_a", makeProof("a".repeat(64)));
    state.record("sess_b", makeProof("b".repeat(64)));
    state.record("sess_c", makeProof("c".repeat(64)));
    state.evictMissing(new Set(["sess_a", "sess_c"]));
    assert.ok(state.get("sess_a"));
    assert.equal(state.get("sess_b"), null);
    assert.ok(state.get("sess_c"));
  });

  test("size reports current entry count", () => {
    const state = createIntegrityState();
    assert.equal(state.size(), 0);
    state.record("s1", makeProof("a".repeat(64)));
    state.record("s2", makeProof("b".repeat(64)));
    assert.equal(state.size(), 2);
  });
});
