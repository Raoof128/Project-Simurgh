import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonPairingPayload,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function createLinuxPairing() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const public_key = b64url(publicKey.export({ format: "der", type: "spki" }));
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_linux",
    exam_id: "exam_linux",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: new Date("2026-05-17T08:00:00.000Z").toISOString(),
    node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
  };
  const signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(signed_payload)), {
      key: privateKey,
      dsaEncoding: "der",
    })
  );
  return { pairing: { node_id_hash, public_key, signature, signed_payload }, public_key };
}

test("Linux pairing is accepted", () => {
  const { pairing } = createLinuxPairing();
  const result = validateDaemonPairingPayload(pairing, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
  });
  assert.equal(result.ok, true, JSON.stringify(result));
});

test("unknown platform pairing still rejected (regression guard)", () => {
  const { pairing } = createLinuxPairing();
  pairing.signed_payload.platform = "plan9";
  const result = validateDaemonPairingPayload(pairing, {
    now: Date.parse("2026-05-17T08:00:02.000Z"),
    expectedSessionId: "sess_linux",
    expectedExamId: "exam_linux",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "unsupported_platform");
});
