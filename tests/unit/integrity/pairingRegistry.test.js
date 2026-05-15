import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createPairingRegistry } from "../../../src/integrity/pairingRegistry.js";

const T0 = 1_000_000_000_000;

describe("pairingRegistry — createChallenge", () => {
  test("creates a 32-byte base64 challenge for a fresh session", () => {
    const r = createPairingRegistry({ challengeTtlMs: 60_000 });
    const result = r.createChallenge("sess_a", T0);
    assert.equal(result.ok, true);
    assert.equal(Buffer.from(result.challenge, "base64").length, 32);
    assert.equal(result.expires_at, T0 + 60_000);
  });

  test("createChallenge replaces an unconsumed pending challenge", () => {
    const r = createPairingRegistry();
    const first = r.createChallenge("sess_a", T0);
    const second = r.createChallenge("sess_a", T0 + 5_000);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.notEqual(first.challenge, second.challenge);
    assert.equal(r.getChallenge("sess_a").challenge, second.challenge);
  });

  test("rejects createChallenge if already paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    const second = r.createChallenge("sess_a", T0 + 2_000);
    assert.equal(second.ok, false);
    assert.equal(second.reason, "node_already_paired");
  });
});

describe("pairingRegistry — completePairing", () => {
  test("happy path moves pending → paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "hash1", node_public_key: "key1" },
      T0 + 1_000
    );
    assert.equal(result.ok, true);
    assert.equal(result.paired_at, T0 + 1_000);
    assert.deepEqual(r.getPairedNode("sess_a"), {
      node_id_hash: "hash1",
      node_public_key: "key1",
      paired_at: T0 + 1_000,
    });
    assert.equal(r.getChallenge("sess_a"), null);
  });

  test("rejects when no pending challenge", () => {
    const r = createPairingRegistry();
    const result = r.completePairing(
      "sess_a",
      { challenge: "x", node_id_hash: "h", node_public_key: "k" },
      T0
    );
    assert.equal(result.reason, "challenge_not_found");
  });

  test("rejects expired challenge", () => {
    const r = createPairingRegistry({ challengeTtlMs: 60_000 });
    const c = r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 60_001
    );
    assert.equal(result.reason, "challenge_expired");
  });

  test("rejects challenge mismatch", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: "wrong-challenge", node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    assert.equal(result.reason, "challenge_mismatch");
  });

  test("rejects second pairing as node_already_paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h2", node_public_key: "k2" },
      T0 + 2_000
    );
    assert.equal(result.reason, "node_already_paired");
  });
});

describe("pairingRegistry — accessors + lifecycle", () => {
  test("getPairedNode null before pairing", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    assert.equal(r.getPairedNode("sess_a"), null);
  });

  test("isPaired booleans", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    assert.equal(r.isPaired("sess_a"), false);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 100
    );
    assert.equal(r.isPaired("sess_a"), true);
  });

  test("evict removes session entry", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    r.evict("sess_a");
    assert.equal(r.getChallenge("sess_a"), null);
    assert.equal(r.size(), 0);
  });

  test("evictMissing keeps active sessions", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    r.createChallenge("sess_b", T0);
    r.createChallenge("sess_c", T0);
    r.evictMissing(new Set(["sess_a", "sess_c"]));
    assert.ok(r.getChallenge("sess_a"));
    assert.equal(r.getChallenge("sess_b"), null);
    assert.ok(r.getChallenge("sess_c"));
  });

  test("size reports total entries", () => {
    const r = createPairingRegistry();
    assert.equal(r.size(), 0);
    r.createChallenge("s1", T0);
    r.createChallenge("s2", T0);
    assert.equal(r.size(), 2);
  });

  test("getChallenge null when no entry", () => {
    const r = createPairingRegistry();
    assert.equal(r.getChallenge("unknown"), null);
  });
});
