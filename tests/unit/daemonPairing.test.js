import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { createDaemonPairingRegistry } from "../../src/device/daemonPairing.js";
import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function createSignedPair(challenge, overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const public_key = b64url(publicKey.export({ format: "der", type: "spki" }));
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_daemon",
    exam_id: "exam_daemon",
    challenge,
    timestamp: new Date("2026-05-15T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "0.4.5",
    platform: "macos",
    ...overrides,
  };
  const signature = crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(signed_payload)), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { node_id_hash, public_key, signed_payload, signature: b64url(signature) };
}

test("registry creates single-use challenges with TTL", () => {
  const registry = createDaemonPairingRegistry({ challengeTtlMs: 30_000 });
  const created = registry.createChallenge("sess_daemon", "pair", 1000);
  assert.equal(created.ok, true);
  assert.equal(created.expires_at, 31_000);
  assert.equal(registry.consumeChallenge("sess_daemon", created.challenge, "pair", 2000).ok, true);
  assert.equal(
    registry.consumeChallenge("sess_daemon", created.challenge, "pair", 3000).reason,
    "challenge_not_found"
  );
});

test("registry rejects wrong purpose and stale challenges", () => {
  const registry = createDaemonPairingRegistry({ challengeTtlMs: 30_000 });
  const created = registry.createChallenge("sess_daemon", "proof", 1000);
  assert.equal(
    registry.consumeChallenge("sess_daemon", created.challenge, "pair", 2000).reason,
    "challenge_purpose_mismatch"
  );
  assert.equal(
    registry.consumeChallenge("sess_daemon", created.challenge, "proof", 32_000).reason,
    "challenge_expired"
  );
});

test("completePairing verifies signed payload and stores paired node", () => {
  const registry = createDaemonPairingRegistry({ challengeTtlMs: 30_000 });
  const now = Date.parse("2026-05-15T08:00:02.000Z");
  const challenge = registry.createChallenge("sess_daemon", "pair", now - 1000).challenge;
  const pair = createSignedPair(challenge);
  const result = registry.completePairing(pair, {
    sessionId: "sess_daemon",
    examId: "exam_daemon",
    now,
  });
  assert.equal(result.ok, true);
  assert.equal(registry.getPairedNode("sess_daemon").node_id_hash, pair.node_id_hash);
});

test("completePairing rejects replayed challenge", () => {
  const registry = createDaemonPairingRegistry({ challengeTtlMs: 30_000 });
  const now = Date.parse("2026-05-15T08:00:02.000Z");
  const challenge = registry.createChallenge("sess_daemon", "pair", now - 1000).challenge;
  const pair = createSignedPair(challenge);
  assert.equal(
    registry.completePairing(pair, {
      sessionId: "sess_daemon",
      examId: "exam_daemon",
      now,
    }).ok,
    true
  );
  assert.equal(
    registry.completePairing(pair, {
      sessionId: "sess_daemon",
      examId: "exam_daemon",
      now: now + 1000,
    }).reason,
    "challenge_not_found"
  );
});
